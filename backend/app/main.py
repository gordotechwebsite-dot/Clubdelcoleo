from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import asyncio
import json
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Colombia timezone (UTC-5, no DST)
COLOMBIA_TZ = ZoneInfo("America/Bogota")

def now_colombia() -> datetime:
    """Get current datetime in Colombia timezone."""
    return datetime.now(COLOMBIA_TZ)

from app.database import get_db, init_db, create_backup, list_backups, restore_backup, auto_restore_if_empty
from app.auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_admin_user, get_user_from_token_str
)
from app import telegram_bot
from app.models import (
    RegisterRequest, LoginRequest, TokenResponse,
    EventCreate, EventUpdate,
    PlayerCreate, PlayerUpdate,
    EventPlayerAdd, BetCreate, DepositRequest,
    InviteCodeCreate, UserStatusUpdate,
    WithdrawalRequest, WithdrawalReview,
    DepositReview, ProfileUpdate, PasswordChange,
    DeclareWinner, SelfExclusion
)

app = FastAPI(title="Club del Coleo API", version="1.0.0")

# ==================== SSE NOTIFICATION SYSTEM ====================
# In-memory store of connected SSE clients: { user_id: [asyncio.Queue, ...] }
_sse_clients: dict[int, list[asyncio.Queue]] = {}


async def broadcast_to_user(user_id: int, event_type: str, data: dict):
    """Send a real-time event to all connected clients of a specific user."""
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=False)
    queues = _sse_clients.get(user_id, [])
    for q in queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass  # drop if client is too slow


async def broadcast_to_admins(event_type: str, data: dict):
    """Send a real-time event to all connected admin clients."""
    with get_db() as conn:
        admins = conn.execute("SELECT id FROM users WHERE is_admin = 1").fetchall()
    for admin in admins:
        await broadcast_to_user(admin["id"], event_type, data)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
async def startup():
    init_db()
    # Auto-restore from backup if DB is empty
    auto_restore_if_empty()
    # Re-run init_db after restore to ensure schema is up to date
    init_db()
    # Create a startup backup
    create_backup("startup")
    # Set up Telegram bot webhook if configured
    if telegram_bot.is_configured():
        backend_url = os.environ.get("BACKEND_PUBLIC_URL", "")
        if backend_url:
            webhook_url = f"{backend_url.rstrip('/')}/api/telegram/webhook"
            await telegram_bot.setup_webhook(webhook_url)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# ==================== AUTH ====================

@app.post("/api/auth/validate-invite")
async def validate_invite(data: dict):
    code = data.get("code", "")
    with get_db() as conn:
        invite = conn.execute(
            "SELECT * FROM invite_codes WHERE code = ? AND is_used = 0",
            (code,)
        ).fetchone()
        if not invite:
            raise HTTPException(status_code=400, detail="Codigo de invitacion invalido o ya usado")
        return {"valid": True, "message": "Codigo valido"}


@app.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    with get_db() as conn:
        invite = conn.execute(
            "SELECT * FROM invite_codes WHERE code = ? AND is_used = 0",
            (req.invite_code,)
        ).fetchone()
        if not invite:
            raise HTTPException(status_code=400, detail="Codigo de invitacion invalido o ya usado")

        existing = conn.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (req.username, req.email)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Usuario o email ya existe")

        password_hash = hash_password(req.password)
        cursor = conn.execute(
            """INSERT INTO users (username, email, password_hash, full_name, phone)
               VALUES (?, ?, ?, ?, ?)""",
            (req.username, req.email, password_hash, req.full_name, req.phone)
        )
        user_id = cursor.lastrowid

        conn.execute(
            "UPDATE invite_codes SET is_used = 1, used_by = ?, used_at = ? WHERE id = ?",
            (user_id, now_colombia().isoformat(), invite["id"])
        )

        token = create_token(user_id, False)
        return TokenResponse(
            access_token=token,
            user_id=user_id,
            username=req.username,
            is_admin=False
        )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (req.username,)
        ).fetchone()
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Credenciales invalidas")
        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="Cuenta desactivada")

        token = create_token(user["id"], bool(user["is_admin"]))
        return TokenResponse(
            access_token=token,
            user_id=user["id"],
            username=user["username"],
            is_admin=bool(user["is_admin"])
        )


@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "phone": user["phone"],
        "is_admin": bool(user["is_admin"]),
        "balance": user["balance"],
        "created_at": user["created_at"],
    }


# ==================== EVENTS ====================

@app.get("/api/events")
async def list_events(status_filter: str = None, country: str = None):
    with get_db() as conn:
        conditions = []
        params = []
        if status_filter:
            conditions.append("status = ?")
            params.append(status_filter)
        if country:
            conditions.append("country = ?")
            params.append(country)
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        events = conn.execute(
            f"SELECT * FROM events {where} ORDER BY date DESC, time DESC",
            params
        ).fetchall()
        return [dict(e) for e in events]


@app.get("/api/events/{event_id}")
async def get_event(event_id: int):
    with get_db() as conn:
        event = conn.execute(
            "SELECT * FROM events WHERE id = ?", (event_id,)
        ).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        players = conn.execute(
            """SELECT p.*, ep.position, ep.odds
               FROM players p
               JOIN event_players ep ON p.id = ep.player_id
               WHERE ep.event_id = ?
               ORDER BY ep.position""",
            (event_id,)
        ).fetchall()

        result = dict(event)
        result["players"] = [dict(p) for p in players]
        return result


@app.post("/api/events")
async def create_event(event: EventCreate, user=Depends(get_admin_user)):
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO events (name, description, location, country, date, time, image_url, stream_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (event.name, event.description, event.location, event.country, event.date, event.time, event.image_url, event.stream_url)
        )
        return {"id": cursor.lastrowid, "message": "Evento creado exitosamente"}


@app.put("/api/events/{event_id}")
async def update_event(event_id: int, event: EventUpdate, user=Depends(get_admin_user)):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        updates = {k: v for k, v in event.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            values = list(updates.values()) + [event_id]
            conn.execute(f"UPDATE events SET {set_clause} WHERE id = ?", values)

        return {"message": "Evento actualizado exitosamente"}


@app.delete("/api/events/{event_id}")
async def delete_event(event_id: int, user=Depends(get_admin_user)):
    with get_db() as conn:
        conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
        return {"message": "Evento eliminado exitosamente"}


# ==================== PLAYERS ====================

@app.get("/api/players")
async def list_players():
    with get_db() as conn:
        players = conn.execute("SELECT * FROM players ORDER BY name").fetchall()
        return [dict(p) for p in players]


@app.get("/api/players/{player_id}")
async def get_player(player_id: int):
    with get_db() as conn:
        player = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not player:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")
        return dict(player)


@app.post("/api/players")
async def create_player(player: PlayerCreate, user=Depends(get_admin_user)):
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO players (name, nickname, team, photo_url)
               VALUES (?, ?, ?, ?)""",
            (player.name, player.nickname, player.team, player.photo_url)
        )
        return {"id": cursor.lastrowid, "message": "Jugador creado exitosamente"}


@app.put("/api/players/{player_id}")
async def update_player(player_id: int, player: PlayerUpdate, user=Depends(get_admin_user)):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")

        updates = {k: v for k, v in player.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            values = list(updates.values()) + [player_id]
            conn.execute(f"UPDATE players SET {set_clause} WHERE id = ?", values)

        return {"message": "Jugador actualizado exitosamente"}


@app.delete("/api/players/{player_id}")
async def delete_player(player_id: int, user=Depends(get_admin_user)):
    with get_db() as conn:
        conn.execute("DELETE FROM players WHERE id = ?", (player_id,))
        return {"message": "Jugador eliminado exitosamente"}


# ==================== EVENT-PLAYERS ====================

@app.post("/api/events/{event_id}/players")
async def add_player_to_event(event_id: int, data: EventPlayerAdd, user=Depends(get_admin_user)):
    with get_db() as conn:
        event = conn.execute("SELECT id FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        player = conn.execute("SELECT id FROM players WHERE id = ?", (data.player_id,)).fetchone()
        if not player:
            raise HTTPException(status_code=404, detail="Jugador no encontrado")

        try:
            conn.execute(
                """INSERT INTO event_players (event_id, player_id, position, odds)
                   VALUES (?, ?, ?, ?)""",
                (event_id, data.player_id, data.position, data.odds)
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Jugador ya esta en este evento")

        return {"message": "Jugador agregado al evento exitosamente"}


@app.put("/api/events/{event_id}/players/{player_id}")
async def update_player_in_event(event_id: int, player_id: int, data: dict, user=Depends(get_admin_user)):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM event_players WHERE event_id = ? AND player_id = ?",
            (event_id, player_id)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Jugador no encontrado en este evento")
        if "odds" in data:
            conn.execute(
                "UPDATE event_players SET odds = ? WHERE event_id = ? AND player_id = ?",
                (data["odds"], event_id, player_id)
            )
        return {"message": "Cuota actualizada exitosamente"}


@app.delete("/api/events/{event_id}/players/{player_id}")
async def remove_player_from_event(event_id: int, player_id: int, user=Depends(get_admin_user)):
    with get_db() as conn:
        conn.execute(
            "DELETE FROM event_players WHERE event_id = ? AND player_id = ?",
            (event_id, player_id)
        )
        return {"message": "Jugador removido del evento exitosamente"}


# ==================== BETS ====================

@app.post("/api/bets")
async def place_bet(bet: BetCreate, user=Depends(get_current_user)):
    if bet.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if bet.amount < 1000:
        raise HTTPException(status_code=400, detail="Apuesta minima: $1,000 COP")

    # Check self-exclusion
    if user.get("self_excluded_until"):
        try:
            excluded = datetime.fromisoformat(user["self_excluded_until"])
            if now_colombia() < excluded:
                raise HTTPException(status_code=403, detail="Tu cuenta esta en periodo de auto-exclusion. No puedes apostar en este momento.")
        except (ValueError, TypeError):
            pass

    with get_db() as conn:
        event = conn.execute(
            "SELECT * FROM events WHERE id = ? AND status = 'upcoming'",
            (bet.event_id,)
        ).fetchone()
        if not event:
            raise HTTPException(status_code=400, detail="Evento no disponible para apuestas")

        # Check event max bet amount
        max_bet = event.get("max_bet_amount") or 500000
        if bet.amount > max_bet:
            raise HTTPException(status_code=400, detail=f"Apuesta maxima para este evento: ${int(max_bet):,} COP")

        ep = conn.execute(
            "SELECT odds FROM event_players WHERE event_id = ? AND player_id = ?",
            (bet.event_id, bet.player_id)
        ).fetchone()
        if not ep:
            raise HTTPException(status_code=400, detail="Jugador no participa en este evento")

        current_user = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (user["id"],)
        ).fetchone()
        if current_user["balance"] < bet.amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        odds = ep["odds"]
        potential_win = bet.amount * odds
        ticket_code = f"CDC-{uuid.uuid4().hex[:8].upper()}"

        conn.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?",
            (bet.amount, user["id"])
        )

        cursor = conn.execute(
            """INSERT INTO bets (user_id, event_id, player_id, amount, odds, potential_win, ticket_code)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user["id"], bet.event_id, bet.player_id, bet.amount, odds, potential_win, ticket_code)
        )

        conn.execute(
            """INSERT INTO transactions (user_id, type, amount, method, description)
               VALUES (?, 'bet', ?, 'saldo', ?)""",
            (user["id"], -bet.amount, f"Apuesta en {event['name']}")
        )

        bet_id = cursor.lastrowid
        player = conn.execute("SELECT name FROM players WHERE id = ?", (bet.player_id,)).fetchone()
        new_balance = conn.execute("SELECT balance FROM users WHERE id = ?", (user["id"],)).fetchone()

    # SSE: notify admins about new bet
    await broadcast_to_admins("new_bet", {
        "title": "Nueva apuesta",
        "message": f"{user['username']} aposto ${int(bet.amount):,} COP en {event['name']} por {player['name']}",
        "amount": bet.amount,
        "username": user["username"],
    })

    return {
        "bet_id": bet_id,
        "ticket_code": ticket_code,
        "event_name": event["name"],
        "event_date": event["date"],
        "event_time": event["time"],
        "event_location": event["location"],
        "player_name": player["name"],
        "amount": bet.amount,
        "odds": odds,
        "potential_win": potential_win,
        "status": "pending",
        "new_balance": new_balance["balance"],
        "created_at": now_colombia().isoformat(),
    }


@app.get("/api/bets")
async def get_my_bets(user=Depends(get_current_user)):
    with get_db() as conn:
        bets = conn.execute(
            """SELECT b.*, e.name as event_name, e.date as event_date, e.time as event_time,
                      e.location as event_location, p.name as player_name
               FROM bets b
               JOIN events e ON b.event_id = e.id
               JOIN players p ON b.player_id = p.id
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC""",
            (user["id"],)
        ).fetchall()
        return [dict(b) for b in bets]


@app.get("/api/bets/{bet_id}")
async def get_bet_detail(bet_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        bet = conn.execute(
            """SELECT b.*, e.name as event_name, e.date as event_date, e.time as event_time,
                      e.location as event_location, p.name as player_name
               FROM bets b
               JOIN events e ON b.event_id = e.id
               JOIN players p ON b.player_id = p.id
               WHERE b.id = ? AND b.user_id = ?""",
            (bet_id, user["id"])
        ).fetchone()
        if not bet:
            raise HTTPException(status_code=404, detail="Apuesta no encontrada")
        return dict(bet)


# ==================== WALLET ====================

@app.get("/api/wallet")
async def get_wallet(user=Depends(get_current_user)):
    with get_db() as conn:
        current = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (user["id"],)
        ).fetchone()
        transactions = conn.execute(
            """SELECT * FROM transactions WHERE user_id = ?
               ORDER BY created_at DESC LIMIT 50""",
            (user["id"],)
        ).fetchall()
        return {
            "balance": current["balance"],
            "transactions": [dict(t) for t in transactions],
        }


# Ensure comprobantes directory exists
COMPROBANTES_DIR = "/data/comprobantes"
os.makedirs(COMPROBANTES_DIR, exist_ok=True)
app.mount("/comprobantes", StaticFiles(directory=COMPROBANTES_DIR), name="comprobantes")


@app.post("/api/wallet/deposit")
async def deposit(
    amount: float = Form(...),
    method: str = Form(...),
    comprobante: UploadFile = File(...),
    user=Depends(get_current_user),
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Monto debe ser mayor a 0")
    if amount < 5000:
        raise HTTPException(status_code=400, detail="Deposito minimo: $5,000 COP")
    if method not in ["nequi", "daviplata", "bancolombia"]:
        raise HTTPException(status_code=400, detail="Metodo de pago no valido")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if comprobante.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Usa JPG, PNG, WebP, GIF o PDF.")

    # Save the comprobante file
    ext = comprobante.filename.rsplit(".", 1)[-1] if "." in (comprobante.filename or "") else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(COMPROBANTES_DIR, filename)
    content = await comprobante.read()
    with open(filepath, "wb") as f:
        f.write(content)

    reference = f"/comprobantes/{filename}"

    with get_db() as conn:
        # Check daily deposit limit
        daily_limit = user.get("daily_deposit_limit", 2000000) or 2000000
        today_deposits = conn.execute(
            """SELECT COALESCE(SUM(amount), 0) as total FROM deposit_requests
               WHERE user_id = ? AND status = 'approved'
               AND date(created_at) = date(?)""",
            (user["id"], now_colombia().strftime("%Y-%m-%d"))
        ).fetchone()["total"]
        if today_deposits + amount > daily_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Limite diario de deposito excedido. Limite: ${int(daily_limit):,} COP. Ya depositado hoy: ${int(today_deposits):,} COP"
            )

        # Create pending deposit request
        cursor = conn.execute(
            """INSERT INTO deposit_requests (user_id, amount, method, reference)
               VALUES (?, ?, ?, ?)""",
            (user["id"], amount, method, reference)
        )

        # Create notification for admin
        conn.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               SELECT id, 'Nueva solicitud de deposito',
               ?, 'deposit'
               FROM users WHERE is_admin = 1""",
            (f"Solicitud de ${int(amount):,} COP via {method} de {user['username']}",)
        )

        req_id = cursor.lastrowid

    # SSE: notify admins about new deposit request
    await broadcast_to_admins("new_deposit", {
        "title": "Nueva solicitud de deposito",
        "message": f"Solicitud de ${int(amount):,} COP via {method} de {user['username']}",
        "amount": amount,
        "method": method,
        "username": user["username"],
    })

    # Telegram: send comprobante to admin chat with approve/reject buttons
    await telegram_bot.notify_new_deposit(
        deposit_id=req_id,
        username=user["username"],
        amount=amount,
        method=method,
        comprobante_path=filepath,
    )

    return {
        "message": "Solicitud de recarga enviada. Pendiente de aprobacion por el administrador.",
        "request_id": req_id,
        "amount": amount,
        "method": method,
        "status": "pending",
    }


@app.get("/api/wallet/deposits")
async def get_my_deposits(user=Depends(get_current_user)):
    with get_db() as conn:
        deposits = conn.execute(
            """SELECT * FROM deposit_requests WHERE user_id = ?
               ORDER BY created_at DESC LIMIT 20""",
            (user["id"],)
        ).fetchall()
        return [dict(d) for d in deposits]


# ==================== WITHDRAWALS ====================

@app.post("/api/wallet/withdraw")
async def request_withdrawal(req: WithdrawalRequest, user=Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Monto debe ser mayor a 0")
    if req.amount < 10000:
        raise HTTPException(status_code=400, detail="Retiro minimo: $10,000 COP")
    if req.method not in ["nequi", "daviplata", "bancolombia"]:
        raise HTTPException(status_code=400, detail="Metodo de pago no valido")
    if not req.account_number.strip():
        raise HTTPException(status_code=400, detail="Numero de cuenta requerido")

    with get_db() as conn:
        current = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (user["id"],)
        ).fetchone()
        if current["balance"] < req.amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        # Check pending withdrawals
        pending = conn.execute(
            """SELECT COALESCE(SUM(amount), 0) as total FROM withdrawal_requests
               WHERE user_id = ? AND status = 'pending'""",
            (user["id"],)
        ).fetchone()["total"]
        available = current["balance"] - pending
        if available < req.amount:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo disponible insuficiente. Tienes ${int(pending):,} COP en retiros pendientes."
            )

        cursor = conn.execute(
            """INSERT INTO withdrawal_requests (user_id, amount, method, account_number)
               VALUES (?, ?, ?, ?)""",
            (user["id"], req.amount, req.method, req.account_number.strip())
        )

        # Notify admin
        conn.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               SELECT id, 'Nueva solicitud de retiro',
               ?, 'withdrawal'
               FROM users WHERE is_admin = 1""",
            (f"Solicitud de retiro ${int(req.amount):,} COP via {req.method} de {user['username']}",)
        )

        return {
            "message": "Solicitud de retiro enviada. Pendiente de aprobacion.",
            "request_id": cursor.lastrowid,
            "amount": req.amount,
            "status": "pending",
        }


@app.get("/api/wallet/withdrawals")
async def get_my_withdrawals(user=Depends(get_current_user)):
    with get_db() as conn:
        withdrawals = conn.execute(
            """SELECT * FROM withdrawal_requests WHERE user_id = ?
               ORDER BY created_at DESC LIMIT 20""",
            (user["id"],)
        ).fetchall()
        return [dict(w) for w in withdrawals]


# ==================== ADMIN ====================

@app.post("/api/admin/invite-codes")
async def generate_invite_codes(req: InviteCodeCreate, user=Depends(get_admin_user)):
    codes = []
    with get_db() as conn:
        for _ in range(req.count):
            code = f"CDC-{uuid.uuid4().hex[:6].upper()}"
            conn.execute(
                "INSERT INTO invite_codes (code, created_by) VALUES (?, ?)",
                (code, user["id"])
            )
            codes.append(code)
    return {"codes": codes, "count": len(codes)}


@app.get("/api/admin/invite-codes")
async def list_invite_codes(user=Depends(get_admin_user)):
    with get_db() as conn:
        codes = conn.execute(
            """SELECT ic.*, u.username as used_by_username
               FROM invite_codes ic
               LEFT JOIN users u ON ic.used_by = u.id
               ORDER BY ic.created_at DESC"""
        ).fetchall()
        return [dict(c) for c in codes]


@app.get("/api/admin/users")
async def list_users(user=Depends(get_admin_user)):
    with get_db() as conn:
        users = conn.execute(
            "SELECT id, username, email, full_name, phone, is_admin, is_active, balance, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        return [dict(u) for u in users]


@app.put("/api/admin/users/{user_id}")
async def update_user_status(user_id: int, update: UserStatusUpdate, user=Depends(get_admin_user)):
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if update.is_active is not None:
            conn.execute("UPDATE users SET is_active = ? WHERE id = ?", (int(update.is_active), user_id))
        if update.is_admin is not None:
            conn.execute("UPDATE users SET is_admin = ? WHERE id = ?", (int(update.is_admin), user_id))

        return {"message": "Usuario actualizado exitosamente"}


@app.get("/api/admin/bets")
async def list_all_bets(user=Depends(get_admin_user)):
    with get_db() as conn:
        bets = conn.execute(
            """SELECT b.*, u.username, e.name as event_name, p.name as player_name
               FROM bets b
               JOIN users u ON b.user_id = u.id
               JOIN events e ON b.event_id = e.id
               JOIN players p ON b.player_id = p.id
               ORDER BY b.created_at DESC"""
        ).fetchall()
        return [dict(b) for b in bets]


@app.get("/api/admin/users/{user_id}/bets")
async def get_user_bets(user_id: int, user=Depends(get_admin_user)):
    with get_db() as conn:
        bets = conn.execute(
            """SELECT b.*, e.name as event_name, p.name as player_name
               FROM bets b
               JOIN events e ON b.event_id = e.id
               JOIN players p ON b.player_id = p.id
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC""",
            (user_id,)
        ).fetchall()
        return [dict(b) for b in bets]


@app.get("/api/admin/stats")
async def admin_stats(user=Depends(get_admin_user)):
    with get_db() as conn:
        total_users = conn.execute("SELECT COUNT(*) as count FROM users WHERE is_admin = 0").fetchone()["count"]
        total_events = conn.execute("SELECT COUNT(*) as count FROM events").fetchone()["count"]
        total_bets = conn.execute("SELECT COUNT(*) as count FROM bets").fetchone()["count"]
        total_bet_amount = conn.execute("SELECT COALESCE(SUM(amount), 0) as total FROM bets").fetchone()["total"]
        pending_bets = conn.execute("SELECT COUNT(*) as count FROM bets WHERE status = 'pending'").fetchone()["count"]
        active_events = conn.execute("SELECT COUNT(*) as count FROM events WHERE status = 'upcoming'").fetchone()["count"]
        pending_deposits = conn.execute("SELECT COUNT(*) as count FROM deposit_requests WHERE status = 'pending'").fetchone()["count"]
        pending_withdrawals = conn.execute("SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'").fetchone()["count"]

        return {
            "total_users": total_users,
            "total_events": total_events,
            "total_bets": total_bets,
            "total_bet_amount": total_bet_amount,
            "pending_bets": pending_bets,
            "active_events": active_events,
            "pending_deposits": pending_deposits,
            "pending_withdrawals": pending_withdrawals,
        }


# ==================== PROFILE ====================

@app.put("/api/auth/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    with get_db() as conn:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if not updates:
            return {"message": "Nada que actualizar"}
        if "email" in updates:
            existing = conn.execute(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                (updates["email"], user["id"])
            ).fetchone()
            if existing:
                raise HTTPException(status_code=400, detail="Email ya esta en uso")
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [user["id"]]
        conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
        return {"message": "Perfil actualizado exitosamente"}


@app.put("/api/auth/password")
async def change_password(data: PasswordChange, user=Depends(get_current_user)):
    from app.auth import verify_password, hash_password
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Contrasena actual incorrecta")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contrasena debe tener al menos 6 caracteres")
    with get_db() as conn:
        new_hash = hash_password(data.new_password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
        return {"message": "Contrasena actualizada exitosamente"}


@app.get("/api/auth/profile/stats")
async def get_profile_stats(user=Depends(get_current_user)):
    with get_db() as conn:
        total_bets = conn.execute("SELECT COUNT(*) as c FROM bets WHERE user_id = ?", (user["id"],)).fetchone()["c"]
        total_bet_amount = conn.execute("SELECT COALESCE(SUM(amount), 0) as t FROM bets WHERE user_id = ?", (user["id"],)).fetchone()["t"]
        won_bets = conn.execute("SELECT COUNT(*) as c FROM bets WHERE user_id = ? AND status = 'won'", (user["id"],)).fetchone()["c"]
        lost_bets = conn.execute("SELECT COUNT(*) as c FROM bets WHERE user_id = ? AND status = 'lost'", (user["id"],)).fetchone()["c"]
        total_won = conn.execute("SELECT COALESCE(SUM(potential_win), 0) as t FROM bets WHERE user_id = ? AND status = 'won'", (user["id"],)).fetchone()["t"]
        return {
            "total_bets": total_bets,
            "total_bet_amount": total_bet_amount,
            "won_bets": won_bets,
            "lost_bets": lost_bets,
            "total_won": total_won,
            "win_rate": round(won_bets / total_bets * 100, 1) if total_bets > 0 else 0,
        }


# ==================== SELF EXCLUSION ====================

@app.post("/api/auth/self-exclude")
async def self_exclude(data: SelfExclusion, user=Depends(get_current_user)):
    if data.days < 1 or data.days > 365:
        raise HTTPException(status_code=400, detail="Periodo de exclusion: 1-365 dias")
    with get_db() as conn:
        exclude_until = (now_colombia() + timedelta(days=data.days)).isoformat()
        conn.execute("UPDATE users SET self_excluded_until = ? WHERE id = ?", (exclude_until, user["id"]))
        return {"message": f"Te has auto-excluido por {data.days} dias", "excluded_until": exclude_until}


# ==================== NOTIFICATIONS ====================

@app.get("/api/notifications")
async def get_notifications(user=Depends(get_current_user)):
    with get_db() as conn:
        notifications = conn.execute(
            """SELECT * FROM notifications WHERE user_id = ?
               ORDER BY created_at DESC LIMIT 30""",
            (user["id"],)
        ).fetchall()
        unread = conn.execute(
            "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
            (user["id"],)
        ).fetchone()["c"]
        return {"notifications": [dict(n) for n in notifications], "unread_count": unread}


@app.put("/api/notifications/read")
async def mark_notifications_read(user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (user["id"],)
        )
        return {"message": "Notificaciones marcadas como leidas"}


@app.put("/api/notifications/{notif_id}/read")
async def mark_one_read(notif_id: int, user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
            (notif_id, user["id"])
        )
        return {"message": "ok"}


# ==================== SSE STREAM ====================

@app.get("/api/notifications/stream")
async def notifications_stream(request: Request, token: str = ""):
    """Server-Sent Events stream for real-time notifications."""
    if not token:
        raise HTTPException(status_code=401, detail="Token requerido")
    user = get_user_from_token_str(token)
    user_id = user["id"]
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)

    # Register this client
    if user_id not in _sse_clients:
        _sse_clients[user_id] = []
    _sse_clients[user_id].append(queue)

    async def event_generator():
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Conectado'})}\n\n"
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    # Wait for a message with timeout (for keep-alive)
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive ping
                    yield f": ping\n\n"
        finally:
            # Cleanup on disconnect
            if user_id in _sse_clients:
                try:
                    _sse_clients[user_id].remove(queue)
                except ValueError:
                    pass
                if not _sse_clients[user_id]:
                    del _sse_clients[user_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ==================== DECLARE WINNER ====================

@app.post("/api/events/{event_id}/winner")
async def declare_winner(event_id: int, data: DeclareWinner, user=Depends(get_admin_user)):
    with get_db() as conn:
        event = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        ep = conn.execute(
            "SELECT * FROM event_players WHERE event_id = ? AND player_id = ?",
            (event_id, data.player_id)
        ).fetchone()
        if not ep:
            raise HTTPException(status_code=400, detail="Jugador no participa en este evento")

        player = conn.execute("SELECT name FROM players WHERE id = ?", (data.player_id,)).fetchone()

        # Update event
        conn.execute(
            "UPDATE events SET status = 'finished', winner_player_id = ? WHERE id = ?",
            (data.player_id, event_id)
        )

        # Update player stats
        conn.execute("UPDATE players SET stats_wins = stats_wins + 1 WHERE id = ?", (data.player_id,))
        losing_players = conn.execute(
            "SELECT player_id FROM event_players WHERE event_id = ? AND player_id != ?",
            (event_id, data.player_id)
        ).fetchall()
        for lp in losing_players:
            conn.execute("UPDATE players SET stats_losses = stats_losses + 1 WHERE id = ?", (lp["player_id"],))

        # Process bets - winners
        winning_bets = conn.execute(
            "SELECT * FROM bets WHERE event_id = ? AND player_id = ? AND status = 'pending'",
            (event_id, data.player_id)
        ).fetchall()
        for bet in winning_bets:
            conn.execute("UPDATE bets SET status = 'won', resolved_at = ? WHERE id = ?",
                         (now_colombia().isoformat(), bet["id"]))
            conn.execute("UPDATE users SET balance = balance + ? WHERE id = ?",
                         (bet["potential_win"], bet["user_id"]))
            conn.execute(
                """INSERT INTO transactions (user_id, type, amount, method, description)
                   VALUES (?, 'winning', ?, 'saldo', ?)""",
                (bet["user_id"], bet["potential_win"],
                 f"Ganancia en {event['name']} - {player['name']}")
            )
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'win')""",
                (bet["user_id"], "Apuesta ganada!",
                 f"Tu apuesta en {event['name']} gano! Ganaste ${int(bet['potential_win']):,} COP")
            )

        # Process bets - losers
        losing_bets = conn.execute(
            "SELECT * FROM bets WHERE event_id = ? AND player_id != ? AND status = 'pending'",
            (event_id, data.player_id)
        ).fetchall()
        for bet in losing_bets:
            conn.execute("UPDATE bets SET status = 'lost', resolved_at = ? WHERE id = ?",
                         (now_colombia().isoformat(), bet["id"]))
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'loss')""",
                (bet["user_id"], "Apuesta perdida",
                 f"Tu apuesta en {event['name']} no gano. El ganador fue {player['name']}.")
            )

        # Collect user ids for SSE broadcast
        winner_user_ids = [(b["user_id"], b["potential_win"]) for b in winning_bets]
        loser_user_ids = [b["user_id"] for b in losing_bets]
        event_name = event["name"]
        player_name = player["name"]

    # SSE: notify winners
    for uid, pwin in winner_user_ids:
        await broadcast_to_user(uid, "bet_won", {
            "title": "Apuesta ganada!",
            "message": f"Tu apuesta en {event_name} gano! Ganaste ${int(pwin):,} COP",
            "amount": pwin,
            "event_name": event_name,
            "player_name": player_name,
        })
    # SSE: notify losers
    for uid in loser_user_ids:
        await broadcast_to_user(uid, "bet_lost", {
            "title": "Apuesta perdida",
            "message": f"Tu apuesta en {event_name} no gano. El ganador fue {player_name}.",
            "event_name": event_name,
            "player_name": player_name,
        })

    return {
        "message": f"Ganador declarado: {player_name}",
        "winning_bets": len(winner_user_ids),
        "losing_bets": len(loser_user_ids),
    }


# ==================== ADMIN DEPOSITS & WITHDRAWALS ====================

@app.get("/api/admin/deposits")
async def list_deposits(user=Depends(get_admin_user)):
    with get_db() as conn:
        deposits = conn.execute(
            """SELECT dr.*, u.username, u.full_name
               FROM deposit_requests dr
               JOIN users u ON dr.user_id = u.id
               ORDER BY dr.created_at DESC"""
        ).fetchall()
        return [dict(d) for d in deposits]


@app.put("/api/admin/deposits/{dep_id}")
async def review_deposit(dep_id: int, data: DepositReview, user=Depends(get_admin_user)):
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Estado invalido")
    with get_db() as conn:
        dep = conn.execute("SELECT * FROM deposit_requests WHERE id = ?", (dep_id,)).fetchone()
        if not dep:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if dep["status"] != "pending":
            raise HTTPException(status_code=400, detail="Solicitud ya fue procesada")

        conn.execute(
            "UPDATE deposit_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
            (data.status, user["id"], now_colombia().isoformat(), dep_id)
        )

        method_names = {"nequi": "Nequi", "daviplata": "Daviplata", "bancolombia": "Bancolombia"}
        dep_user_id = dep["user_id"]
        dep_amount = dep["amount"]
        dep_method = dep["method"]
        if data.status == "approved":
            conn.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (dep_amount, dep_user_id)
            )
            new_bal = conn.execute("SELECT balance FROM users WHERE id = ?", (dep_user_id,)).fetchone()["balance"]
            conn.execute(
                """INSERT INTO transactions (user_id, type, amount, method, reference, description)
                   VALUES (?, 'deposit', ?, ?, ?, ?)""",
                (dep_user_id, dep_amount, dep_method, dep["reference"],
                 f"Recarga via {method_names.get(dep_method, dep_method)}")
            )
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'deposit')""",
                (dep_user_id, "Deposito aprobado",
                 f"Tu deposito de ${int(dep_amount):,} COP via {method_names.get(dep_method, dep_method)} ha sido aprobado.")
            )
        else:
            new_bal = None
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'deposit')""",
                (dep_user_id, "Deposito rechazado",
                 f"Tu solicitud de deposito de ${int(dep_amount):,} COP fue rechazada. Contacta soporte para mas informacion.")
            )

    # SSE: notify user about deposit review
    if data.status == "approved":
        await broadcast_to_user(dep_user_id, "deposit_approved", {
            "title": "Deposito aprobado",
            "message": f"Tu deposito de ${int(dep_amount):,} COP ha sido aprobado.",
            "amount": dep_amount,
            "new_balance": new_bal,
        })
    else:
        await broadcast_to_user(dep_user_id, "deposit_rejected", {
            "title": "Deposito rechazado",
            "message": f"Tu solicitud de deposito de ${int(dep_amount):,} COP fue rechazada.",
            "amount": dep_amount,
        })

    return {"message": f"Deposito {data.status}"}


@app.get("/api/admin/withdrawals")
async def list_withdrawals(user=Depends(get_admin_user)):
    with get_db() as conn:
        withdrawals = conn.execute(
            """SELECT wr.*, u.username, u.full_name
               FROM withdrawal_requests wr
               JOIN users u ON wr.user_id = u.id
               ORDER BY wr.created_at DESC"""
        ).fetchall()
        return [dict(w) for w in withdrawals]


@app.put("/api/admin/withdrawals/{wd_id}")
async def review_withdrawal(wd_id: int, data: WithdrawalReview, user=Depends(get_admin_user)):
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Estado invalido")
    with get_db() as conn:
        wd = conn.execute("SELECT * FROM withdrawal_requests WHERE id = ?", (wd_id,)).fetchone()
        if not wd:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if wd["status"] != "pending":
            raise HTTPException(status_code=400, detail="Solicitud ya fue procesada")

        conn.execute(
            "UPDATE withdrawal_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
            (data.status, user["id"], now_colombia().isoformat(), wd_id)
        )

        method_names = {"nequi": "Nequi", "daviplata": "Daviplata", "bancolombia": "Bancolombia"}
        wd_user_id = wd["user_id"]
        wd_amount = wd["amount"]
        if data.status == "approved":
            conn.execute(
                "UPDATE users SET balance = balance - ? WHERE id = ?",
                (wd_amount, wd_user_id)
            )
            conn.execute(
                """INSERT INTO transactions (user_id, type, amount, method, description)
                   VALUES (?, 'withdrawal', ?, ?, ?)""",
                (wd_user_id, -wd_amount, wd["method"],
                 f"Retiro via {method_names.get(wd['method'], wd['method'])} a {wd['account_number']}")
            )
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'withdrawal')""",
                (wd_user_id, "Retiro aprobado",
                 f"Tu retiro de ${int(wd_amount):,} COP a {wd['account_number']} ha sido aprobado.")
            )
        else:
            conn.execute(
                """INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'withdrawal')""",
                (wd_user_id, "Retiro rechazado",
                 f"Tu solicitud de retiro de ${int(wd_amount):,} COP fue rechazada.")
            )

    # SSE: notify user about withdrawal review
    if data.status == "approved":
        await broadcast_to_user(wd_user_id, "withdrawal_approved", {
            "title": "Retiro aprobado",
            "message": f"Tu retiro de ${int(wd_amount):,} COP ha sido aprobado.",
            "amount": wd_amount,
        })
    else:
        await broadcast_to_user(wd_user_id, "withdrawal_rejected", {
            "title": "Retiro rechazado",
            "message": f"Tu solicitud de retiro de ${int(wd_amount):,} COP fue rechazada.",
            "amount": wd_amount,
        })

    return {"message": f"Retiro {data.status}"}


# ==================== PROMOTIONS ====================

class PromotionData(BaseModel):
    title: str
    message: str

@app.post("/api/admin/promotions")
async def send_promotion(data: PromotionData, user=Depends(get_admin_user)):
    """Send a promotional notification to ALL active users via SSE."""
    with get_db() as conn:
        active_users = conn.execute("SELECT id FROM users WHERE is_active = 1").fetchall()
        for u in active_users:
            conn.execute(
                "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'promotion')",
                (u["id"], data.title, data.message),
            )
        # Broadcast via SSE to all connected clients
        for u in active_users:
            await broadcast_to_user(u["id"], "promotion", {
                "title": data.title,
                "message": data.message,
            })
    return {"message": f"Promocion enviada a {len(active_users)} usuarios"}


# ==================== TELEGRAM BOT WEBHOOK ====================

@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """Handle Telegram webhook updates (callback queries from inline buttons)."""
    try:
        update = await request.json()
    except Exception:
        return {"ok": True}

    # Handle callback queries (inline button presses)
    callback_query = update.get("callback_query")
    if callback_query:
        callback_id = callback_query["id"]
        data = callback_query.get("data", "")
        message = callback_query.get("message", {})
        chat_id = str(message.get("chat", {}).get("id", ""))
        message_id = message.get("message_id")

        if data.startswith("approve_deposit:") or data.startswith("reject_deposit:"):
            action, dep_id_str = data.split(":", 1)
            try:
                dep_id = int(dep_id_str)
            except ValueError:
                await telegram_bot.answer_callback_query(callback_id, "ID de deposito invalido")
                return {"ok": True}

            new_status = "approved" if action == "approve_deposit" else "rejected"

            with get_db() as conn:
                dep = conn.execute("SELECT * FROM deposit_requests WHERE id = ?", (dep_id,)).fetchone()
                if not dep:
                    await telegram_bot.answer_callback_query(callback_id, "Deposito no encontrado")
                    return {"ok": True}
                if dep["status"] != "pending":
                    await telegram_bot.answer_callback_query(callback_id, f"Deposito ya fue {dep['status']}")
                    # Update the message to reflect current status
                    dep_user = conn.execute("SELECT username FROM users WHERE id = ?", (dep["user_id"],)).fetchone()
                    await telegram_bot.edit_message_caption(
                        chat_id, message_id,
                        f"<b>Deposito #{dep_id} - {'APROBADO' if dep['status'] == 'approved' else 'RECHAZADO'}</b>\n\n"
                        f"<b>Usuario:</b> {dep_user['username'] if dep_user else 'N/A'}\n"
                        f"<b>Monto:</b> ${int(dep['amount']):,} COP\n"
                        f"<b>Estado:</b> Ya procesado"
                    )
                    return {"ok": True}

                # Get first admin user for reviewed_by
                admin = conn.execute("SELECT id FROM users WHERE is_admin = 1 LIMIT 1").fetchone()
                admin_id = admin["id"] if admin else 1

                conn.execute(
                    "UPDATE deposit_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
                    (new_status, admin_id, now_colombia().isoformat(), dep_id)
                )

                dep_user_id = dep["user_id"]
                dep_amount = dep["amount"]
                dep_method = dep["method"]
                method_names = {"nequi": "Nequi", "daviplata": "Daviplata", "bancolombia": "Bancolombia"}

                if new_status == "approved":
                    conn.execute(
                        "UPDATE users SET balance = balance + ? WHERE id = ?",
                        (dep_amount, dep_user_id)
                    )
                    new_bal = conn.execute("SELECT balance FROM users WHERE id = ?", (dep_user_id,)).fetchone()["balance"]
                    conn.execute(
                        """INSERT INTO transactions (user_id, type, amount, method, reference, description)
                           VALUES (?, 'deposit', ?, ?, ?, ?)""",
                        (dep_user_id, dep_amount, dep_method, dep["reference"],
                         f"Recarga via {method_names.get(dep_method, dep_method)}")
                    )
                    conn.execute(
                        """INSERT INTO notifications (user_id, title, message, type)
                           VALUES (?, ?, ?, 'deposit')""",
                        (dep_user_id, "Deposito aprobado",
                         f"Tu deposito de ${int(dep_amount):,} COP via {method_names.get(dep_method, dep_method)} ha sido aprobado.")
                    )
                else:
                    new_bal = None
                    conn.execute(
                        """INSERT INTO notifications (user_id, title, message, type)
                           VALUES (?, ?, ?, 'deposit')""",
                        (dep_user_id, "Deposito rechazado",
                         f"Tu solicitud de deposito de ${int(dep_amount):,} COP fue rechazada. Contacta soporte para mas informacion.")
                    )

                dep_user = conn.execute("SELECT username FROM users WHERE id = ?", (dep_user_id,)).fetchone()

            # SSE: notify user about deposit review
            if new_status == "approved":
                await broadcast_to_user(dep_user_id, "deposit_approved", {
                    "title": "Deposito aprobado",
                    "message": f"Tu deposito de ${int(dep_amount):,} COP ha sido aprobado.",
                    "amount": dep_amount,
                    "new_balance": new_bal,
                })
            else:
                await broadcast_to_user(dep_user_id, "deposit_rejected", {
                    "title": "Deposito rechazado",
                    "message": f"Tu solicitud de deposito de ${int(dep_amount):,} COP fue rechazada.",
                    "amount": dep_amount,
                })

            # Update Telegram message
            status_label = "APROBADO" if new_status == "approved" else "RECHAZADO"
            username = dep_user["username"] if dep_user else "N/A"
            updated_caption = (
                f"<b>Deposito #{dep_id} - {status_label}</b>\n\n"
                f"<b>Usuario:</b> {username}\n"
                f"<b>Monto:</b> ${int(dep_amount):,} COP\n"
                f"<b>Metodo:</b> {method_names.get(dep_method, dep_method)}\n"
                f"<b>Estado:</b> {status_label}"
            )
            await telegram_bot.edit_message_caption(chat_id, message_id, updated_caption)
            await telegram_bot.answer_callback_query(
                callback_id,
                f"Deposito #{dep_id} {status_label}"
            )

    # Handle /start command - respond with chat ID info
    msg = update.get("message", {})
    if msg.get("text", "").startswith("/start"):
        chat_id = str(msg.get("chat", {}).get("id", ""))
        await telegram_bot.send_message(
            chat_id,
            "<b>Club del Coleo - Bot Admin</b>\n\n"
            f"Chat ID: <code>{chat_id}</code>\n\n"
            "Este bot te notificara cuando un usuario solicite un deposito. "
            "Podras aprobar o rechazar directamente desde aqui."
        )

    return {"ok": True}


@app.get("/api/admin/telegram/status")
async def telegram_status(user=Depends(get_admin_user)):
    """Check Telegram bot configuration status."""
    return {
        "configured": telegram_bot.is_configured(),
        "bot_token_set": bool(telegram_bot.TELEGRAM_BOT_TOKEN),
        "chat_id_set": bool(telegram_bot.TELEGRAM_ADMIN_CHAT_ID),
    }


# ==================== SEED DATA ====================

@app.post("/api/admin/seed")
async def seed_data(user=Depends(get_admin_user)):
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()["c"]
        if count > 0:
            return {"message": "Base de datos ya tiene datos"}

        players_data = [
            ("Jose Manuel Rodriguez", "El Tigre", "Los Centauros del Llano", None, 15, 3, 4.5),
            ("Carlos Alberto Perez", "El Relampago", "Los Potros Salvajes", None, 12, 5, 4.2),
            ("Luis Fernando Gomez", "El Ciclon", "Los Centauros del Llano", None, 10, 4, 3.8),
            ("Andres Felipe Torres", "El Toro", "Los Jinetes del Arauca", None, 8, 6, 3.5),
            ("Miguel Angel Castillo", "El Halcon", "Los Potros Salvajes", None, 20, 2, 4.8),
            ("Pedro Pablo Hernandez", "El Rayo", "Los Jinetes del Arauca", None, 7, 8, 3.2),
            ("Juan David Morales", "El Centauro", "Los Llaneros Bravos", None, 11, 4, 4.0),
            ("Santiago Rivera Lopez", "El Gaucho", "Los Llaneros Bravos", None, 9, 5, 3.6),
            ("Diego Armando Vargas", "El Mustang", "Vaqueros de Casanare", None, 14, 3, 4.3),
            ("Roberto Carlos Silva", "El Domador", "Vaqueros de Casanare", None, 6, 7, 3.0),
        ]
        for p in players_data:
            conn.execute(
                "INSERT INTO players (name, nickname, team, photo_url, stats_wins, stats_losses, rating) VALUES (?,?,?,?,?,?,?)",
                p
            )

        events_data = [
            ("Gran Torneo Nacional de Coleo", "El torneo mas esperado del ano. Los mejores coleadores del pais se enfrentan en una competencia epica.", "Manga de Coleo Villavicencio, Meta", "colombia", "2026-05-15", "14:00", "upcoming"),
            ("Copa Llanera 2026", "Competencia regional con los mejores jinetes del llano.", "Manga de Coleo Yopal, Casanare", "colombia", "2026-05-22", "10:00", "upcoming"),
            ("Clasico de los Centauros", "Enfrentamiento entre los equipos mas fuertes de la temporada.", "Manga de Coleo Arauca", "colombia", "2026-06-01", "16:00", "upcoming"),
            ("Festival del Joropo y Coleo", "Evento cultural con competencias de coleo y musica llanera.", "Manga de Coleo San Martin, Meta", "colombia", "2026-04-10", "09:00", "finished"),
            ("Campeonato Venezolano de Coleo", "Los mejores coleadores de Venezuela compiten por el titulo nacional.", "Manga de Coleo Barinas", "venezuela", "2026-05-20", "15:00", "upcoming"),
            ("Copa Llanos de Venezuela", "Competencia entre los mejores equipos del llano venezolano.", "Manga de Coleo Calabozo, Guarico", "venezuela", "2026-06-05", "11:00", "upcoming"),
        ]
        for e in events_data:
            conn.execute(
                "INSERT INTO events (name, description, location, country, date, time, status) VALUES (?,?,?,?,?,?,?)",
                e
            )

        event_players_data = [
            (1, 1, 1, 2.5), (1, 2, 2, 3.0), (1, 3, 3, 2.8), (1, 4, 4, 3.5), (1, 5, 5, 1.8),
            (2, 1, 1, 2.2), (2, 6, 2, 4.0), (2, 7, 3, 3.2), (2, 8, 4, 3.5), (2, 9, 5, 2.0),
            (3, 2, 1, 2.8), (3, 5, 2, 1.9), (3, 10, 3, 5.0), (3, 3, 4, 3.0), (3, 7, 5, 3.3),
        ]
        for ep in event_players_data:
            conn.execute(
                "INSERT INTO event_players (event_id, player_id, position, odds) VALUES (?,?,?,?)",
                ep
            )

        for i in range(5):
            code = f"CDC-DEMO{i+1:02d}"
            conn.execute(
                "INSERT INTO invite_codes (code, created_by) VALUES (?, 1)",
                (code,)
            )

        return {"message": "Datos de ejemplo creados exitosamente"}


# ==================== BACKUP SYSTEM ====================

@app.get("/api/admin/backups")
async def get_backups(user=Depends(get_admin_user)):
    """List all available database backups."""
    backups = list_backups()
    return {"backups": backups}


@app.post("/api/admin/backups")
async def create_manual_backup(user=Depends(get_admin_user)):
    """Create a manual database backup."""
    path = create_backup("manual")
    if not path:
        raise HTTPException(status_code=500, detail="No se pudo crear el backup")
    return {"message": "Backup creado exitosamente", "path": path}


@app.post("/api/admin/backups/restore")
async def restore_from_backup(data: dict, user=Depends(get_admin_user)):
    """Restore database from a backup."""
    backup_name = data.get("name", "")
    if not backup_name:
        raise HTTPException(status_code=400, detail="Nombre de backup requerido")
    backups = list_backups()
    backup = next((b for b in backups if b["name"] == backup_name), None)
    if not backup:
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    success = restore_backup(backup["path"])
    if not success:
        raise HTTPException(status_code=500, detail="Error al restaurar el backup")
    return {"message": f"Base de datos restaurada desde {backup_name}"}


# ==================== PASSWORD RECOVERY ====================

class PasswordResetRequest(BaseModel):
    username_or_email: str


class AdminResetPassword(BaseModel):
    new_password: str


@app.post("/api/auth/password-reset-request")
async def request_password_reset(data: PasswordResetRequest):
    """User requests a password reset. Notifies admin via Telegram."""
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, email, full_name, phone FROM users WHERE username = ? OR email = ?",
            (data.username_or_email, data.username_or_email)
        ).fetchone()
        if not user:
            # Don't reveal if user exists or not
            return {"message": "Si tu cuenta existe, el administrador recibira tu solicitud de recuperacion."}

        user = dict(user)

        # Store the reset request in notifications for admin
        conn.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               VALUES (?, ?, ?, ?)""",
            (1,  # admin user id
             "Solicitud de recuperacion de contrasena",
             f"El usuario {user['username']} ({user['email']}) solicita restablecer su contrasena. Telefono: {user.get('phone', 'N/A')}",
             "password_reset")
        )

    # Notify admin via Telegram
    if telegram_bot.is_configured():
        await telegram_bot.send_message(
            telegram_bot.TELEGRAM_ADMIN_CHAT_ID,
            f"<b>Solicitud de Recuperacion de Contrasena</b>\n\n"
            f"<b>Usuario:</b> {user['username']}\n"
            f"<b>Email:</b> {user['email']}\n"
            f"<b>Nombre:</b> {user['full_name']}\n"
            f"<b>Telefono:</b> {user.get('phone', 'N/A')}\n\n"
            f"Para restablecer, ve al panel admin > Usuarios"
        )

    # SSE notify admins
    await broadcast_to_admins("password_reset_request", {
        "title": "Recuperacion de contrasena",
        "message": f"{user['username']} solicita restablecer su contrasena",
    })

    return {"message": "Si tu cuenta existe, el administrador recibira tu solicitud de recuperacion."}


@app.put("/api/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: int, data: AdminResetPassword, admin=Depends(get_admin_user)):
    """Admin resets a user's password."""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contrasena debe tener al menos 6 caracteres")
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        new_hash = hash_password(data.new_password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))

        # Notify user that their password was reset
        conn.execute(
            """INSERT INTO notifications (user_id, title, message, type)
               VALUES (?, ?, ?, ?)""",
            (user_id,
             "Contrasena restablecida",
             "Tu contrasena ha sido restablecida por el administrador. Inicia sesion con tu nueva contrasena.",
             "info")
        )

    # SSE notify the user
    await broadcast_to_user(user_id, "password_reset", {
        "title": "Contrasena restablecida",
        "message": "Tu contrasena ha sido restablecida. Inicia sesion nuevamente.",
    })

    return {"message": f"Contrasena de {user['username']} restablecida exitosamente"}
