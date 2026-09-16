import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from . import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    options TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    client_token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(poll_id, client_token)
);
"""


def _connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def purge_expired(conn: sqlite3.Connection, now: int = None) -> None:
    now = now or int(time.time())
    conn.execute("DELETE FROM polls WHERE expires_at < ?", (now,))


def init_db() -> None:
    with _connect(config.DB_PATH) as conn:
        conn.executescript(_SCHEMA)
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(polls)").fetchall()]
        if "visibility" not in cols:
            conn.execute(
                "ALTER TABLE polls ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'"
            )
        if "expires_at" not in cols:
            conn.execute(
                "ALTER TABLE polls ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0"
            )
            conn.execute(
                "UPDATE polls SET expires_at = created_at + ? WHERE expires_at = 0",
                (config.LEGACY_EXPIRY_DAYS * 86400,),
            )
        purge_expired(conn)


@contextmanager
def get_conn():
    conn = _connect(config.DB_PATH)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()