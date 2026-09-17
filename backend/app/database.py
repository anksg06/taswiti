import os
import sqlite3
import time
from contextlib import contextmanager

from . import config

IS_PG = config.DATABASE_URL.startswith("postgres")

_SQLITE_SCHEMA = """
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

_PG_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    options TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
)""",
    """CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    client_token TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE(poll_id, client_token)
)""",
]

if IS_PG:
    import psycopg
    from psycopg.rows import dict_row

    IntegrityError = psycopg.errors.UniqueViolation
else:
    IntegrityError = sqlite3.IntegrityError


def _connect():
    if IS_PG:
        return psycopg.connect(config.DATABASE_URL, row_factory=dict_row)
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def execute(conn, sql, params=()):
    if IS_PG:
        sql = sql.replace("?", "%s")
    return conn.execute(sql, params)


def column_names(conn, table):
    if IS_PG:
        rows = conn.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
            (table,),
        ).fetchall()
        return [r["column_name"] for r in rows]
    rows = conn.execute("PRAGMA table_info(%s)" % table).fetchall()
    return [r["name"] for r in rows]


def purge_expired(conn, now: int = None) -> None:
    now = now or int(time.time())
    execute(conn, "DELETE FROM polls WHERE expires_at < ?", (now,))


def init_db() -> None:
    with _connect() as conn:
        if IS_PG:
            for stmt in _PG_SCHEMA:
                conn.execute(stmt)
        else:
            conn.executescript(_SQLITE_SCHEMA)
        cols = column_names(conn, "polls")
        if "visibility" not in cols:
            execute(conn, "ALTER TABLE polls ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'")
        if "expires_at" not in cols:
            if IS_PG:
                conn.execute("ALTER TABLE polls ADD COLUMN expires_at BIGINT NOT NULL DEFAULT 0")
                conn.execute(
                    "UPDATE polls SET expires_at = created_at + %s",
                    (config.LEGACY_EXPIRY_DAYS * 86400,),
                )
            else:
                execute(conn, "ALTER TABLE polls ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0")
                execute(
                    conn,
                    "UPDATE polls SET expires_at = created_at + ? WHERE expires_at = 0",
                    (config.LEGACY_EXPIRY_DAYS * 86400,),
                )
        purge_expired(conn)
        conn.commit()


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()