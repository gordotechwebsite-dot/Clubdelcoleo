import sqlite3
import os
import shutil
import glob
from contextlib import contextmanager
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

COLOMBIA_TZ = ZoneInfo("America/Bogota")


def _timestamp_to_colombia(raw: bytes) -> str:
    """Return any stored TIMESTAMP as an ISO string in Colombia time.

    Rows written with SQLite CURRENT_TIMESTAMP are naive UTC; without this the
    clients render them as if they were local time.
    """
    value = raw.decode() if isinstance(raw, bytes) else str(raw)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(COLOMBIA_TZ).isoformat()


sqlite3.register_converter("timestamp", _timestamp_to_colombia)

BACKUP_DIR = "/data/backups" if os.path.isdir("/data") else "backups"

_default_db = "/data/app.db" if os.path.isdir("/data") else "clubdelcoleo.db"
DB_PATH = os.environ.get("DB_PATH", _default_db)


def get_db_path():
    return DB_PATH


def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)


def create_backup(label: str = "auto") -> str:
    """Create a backup of the current database. Returns the backup file path."""
    ensure_backup_dir()
    db_path = get_db_path()
    if not os.path.exists(db_path):
        return ""
    now = datetime.now(COLOMBIA_TZ)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_{label}_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    # Use SQLite backup API for safe copy
    src = sqlite3.connect(db_path)
    dst = sqlite3.connect(backup_path)
    src.backup(dst)
    dst.close()
    src.close()
    # Keep only last 20 backups
    backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "backup_*.db")))
    while len(backups) > 20:
        os.remove(backups.pop(0))
    return backup_path


def list_backups() -> list[dict]:
    """List all available backups."""
    ensure_backup_dir()
    backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "backup_*.db")), reverse=True)
    result = []
    for bp in backups:
        name = os.path.basename(bp)
        size = os.path.getsize(bp)
        result.append({"name": name, "path": bp, "size_kb": round(size / 1024, 1)})
    return result


def restore_backup(backup_path: str) -> bool:
    """Restore database from a backup file."""
    if not os.path.exists(backup_path):
        return False
    db_path = get_db_path()
    # First backup current state before restoring
    if os.path.exists(db_path):
        create_backup("pre_restore")
    shutil.copy2(backup_path, db_path)
    return True


def has_data() -> bool:
    """Check if database has any meaningful data (users beyond default admin)."""
    try:
        conn = sqlite3.connect(get_db_path())
        count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
        return count > 0 or user_count > 1
    except Exception:
        return False


def auto_restore_if_empty():
    """If the DB is empty but backups exist, restore from the latest backup."""
    if has_data():
        return
    backups = list_backups()
    if not backups:
        return
    # Find latest non-pre_restore backup
    for bp in backups:
        if "pre_restore" not in bp["name"]:
            restore_backup(bp["path"])
            print(f"AUTO-RESTORED database from {bp['name']}")
            return
    # If only pre_restore backups, use the latest one
    if backups:
        restore_backup(backups[0]["path"])
        print(f"AUTO-RESTORED database from {backups[0]['name']}")


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path(), detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                is_admin INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                balance REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS invite_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                created_by INTEGER REFERENCES users(id),
                used_by INTEGER REFERENCES users(id),
                is_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                location TEXT NOT NULL,
                country TEXT DEFAULT 'colombia',
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                status TEXT DEFAULT 'upcoming',
                image_url TEXT,
                stream_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                nickname TEXT,
                team TEXT,
                photo_url TEXT,
                stats_wins INTEGER DEFAULT 0,
                stats_losses INTEGER DEFAULT 0,
                rating REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS event_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
                position INTEGER,
                odds REAL DEFAULT 2.0,
                UNIQUE(event_id, player_id)
            );

            CREATE TABLE IF NOT EXISTS bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                event_id INTEGER REFERENCES events(id),
                player_id INTEGER REFERENCES players(id),
                amount REAL NOT NULL,
                odds REAL NOT NULL,
                potential_win REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                ticket_code TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT,
                reference TEXT,
                description TEXT,
                status TEXT DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS deposit_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                reference TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                reviewed_by INTEGER REFERENCES users(id),
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                account_number TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                reviewed_by INTEGER REFERENCES users(id),
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migrate: add winner_player_id to events if missing
        cols = [row[1] for row in conn.execute("PRAGMA table_info(events)").fetchall()]
        if "winner_player_id" not in cols:
            conn.execute("ALTER TABLE events ADD COLUMN winner_player_id INTEGER REFERENCES players(id)")
        if "max_bet_amount" not in cols:
            conn.execute("ALTER TABLE events ADD COLUMN max_bet_amount REAL DEFAULT 500000")

        # Migrate: add daily_deposit_limit and max_single_bet to users if missing
        user_cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "daily_deposit_limit" not in user_cols:
            conn.execute("ALTER TABLE users ADD COLUMN daily_deposit_limit REAL DEFAULT 2000000")
        if "self_excluded_until" not in user_cols:
            conn.execute("ALTER TABLE users ADD COLUMN self_excluded_until TIMESTAMP")

        # Create default admin if not exists
        import bcrypt as _bcrypt
        admin_exists = conn.execute(
            "SELECT id FROM users WHERE username = 'admin'"
        ).fetchone()
        if not admin_exists:
            admin_hash = _bcrypt.hashpw("admin123".encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
            conn.execute(
                """INSERT INTO users (username, email, password_hash, full_name, is_admin, balance)
                   VALUES (?, ?, ?, ?, 1, 1000000.0)""",
                ("admin", "admin@clubdelcoleo.com", admin_hash, "Administrador")
            )
