import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("DB_PATH", "clubdelcoleo.db")


def get_db_path():
    return DB_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
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
        """)

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
