from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uuid
from datetime import datetime, timezone

from app.database import get_db, init_db
from app.auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_admin_user
)
from app.models import (
    RegisterRequest, LoginRequest, TokenResponse,
    EventCreate, EventUpdate,
    PlayerCreate, PlayerUpdate,
    EventPlayerAdd, BetCreate, DepositRequest,
    InviteCodeCreate, UserStatusUpdate
)

app = FastAPI(title="Club del Coleo API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
def startup():
    init_db()


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
            (user_id, datetime.now(timezone.utc).isoformat(), invite["id"])
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

    with get_db() as conn:
        event = conn.execute(
            "SELECT * FROM events WHERE id = ? AND status = 'upcoming'",
            (bet.event_id,)
        ).fetchone()
        if not event:
            raise HTTPException(status_code=400, detail="Evento no disponible para apuestas")

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
            "created_at": datetime.now(timezone.utc).isoformat(),
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


@app.post("/api/wallet/deposit")
async def deposit(req: DepositRequest, user=Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Monto debe ser mayor a 0")
    if req.amount < 5000:
        raise HTTPException(status_code=400, detail="Deposito minimo: $5,000 COP")
    if req.method not in ["nequi", "daviplata", "bancolombia"]:
        raise HTTPException(status_code=400, detail="Metodo de pago no valido")

    with get_db() as conn:
        conn.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            (req.amount, user["id"])
        )
        method_names = {"nequi": "Nequi", "daviplata": "Daviplata", "bancolombia": "Bancolombia"}
        conn.execute(
            """INSERT INTO transactions (user_id, type, amount, method, reference, description)
               VALUES (?, 'deposit', ?, ?, ?, ?)""",
            (user["id"], req.amount, req.method, req.reference,
             f"Recarga via {method_names.get(req.method, req.method)}")
        )
        new_balance = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (user["id"],)
        ).fetchone()

        return {
            "message": "Recarga exitosa",
            "new_balance": new_balance["balance"],
            "amount": req.amount,
            "method": req.method,
        }


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


@app.get("/api/admin/stats")
async def admin_stats(user=Depends(get_admin_user)):
    with get_db() as conn:
        total_users = conn.execute("SELECT COUNT(*) as count FROM users WHERE is_admin = 0").fetchone()["count"]
        total_events = conn.execute("SELECT COUNT(*) as count FROM events").fetchone()["count"]
        total_bets = conn.execute("SELECT COUNT(*) as count FROM bets").fetchone()["count"]
        total_bet_amount = conn.execute("SELECT COALESCE(SUM(amount), 0) as total FROM bets").fetchone()["total"]
        pending_bets = conn.execute("SELECT COUNT(*) as count FROM bets WHERE status = 'pending'").fetchone()["count"]
        active_events = conn.execute("SELECT COUNT(*) as count FROM events WHERE status = 'upcoming'").fetchone()["count"]

        return {
            "total_users": total_users,
            "total_events": total_events,
            "total_bets": total_bets,
            "total_bet_amount": total_bet_amount,
            "pending_bets": pending_bets,
            "active_events": active_events,
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
