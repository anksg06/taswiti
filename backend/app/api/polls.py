import json
import time
import uuid

from fastapi import APIRouter, HTTPException, Response, status

from .. import config
from ..database import execute, get_conn, purge_expired
from ..logging import logger

router = APIRouter(prefix="/api/polls", tags=["polls"])
log = logger("polls")


class PollGone(HTTPException):
    pass


def _serialize_poll(row, counts) -> dict:
    options = json.loads(row["options"])
    total = sum(counts.values()) if counts else 0
    items = [
        {
            "text": text,
            "count": counts.get(i, 0),
            "pct": round(counts.get(i, 0) / total * 100, 1) if total else 0.0,
        }
        for i, text in enumerate(options)
    ]
    return {
        "id": row["id"],
        "title": row["title"],
        "visibility": row["visibility"],
        "expires_at": row["expires_at"],
        "created_at": row["created_at"],
        "total": total,
        "options": items,
    }


def _fetch_live(conn, poll_id: str, now: int):
    row = execute(conn, "SELECT * FROM polls WHERE id = ?", (poll_id,)).fetchone()
    if row is None:
        purge_expired(conn, now)
        raise HTTPException(status_code=404, detail="Poll not found")
    if now >= row["expires_at"]:
        log.info("poll_expired_purged id=%s", poll_id)
        execute(conn, "DELETE FROM polls WHERE id = ?", (poll_id,))
        conn.commit()
        raise HTTPException(status_code=410, detail="Poll expired")
    return row


def _validate_payload(title: str, options: list, visibility: str, duration_seconds: int):
    if not title.strip():
        raise HTTPException(status_code=422, detail="Poll title is required")
    if len(title) > config.POLL_TITLE_MAX:
        raise HTTPException(
            status_code=422,
            detail=f"Title exceeds {config.POLL_TITLE_MAX} characters",
        )
    if visibility not in config.VISIBILITIES:
        raise HTTPException(status_code=422, detail="visibility must be public or private")
    if not (config.DURATION_MIN_SECONDS <= duration_seconds <= config.DURATION_MAX_SECONDS):
        raise HTTPException(
            status_code=422,
            detail=f"duration_seconds must be between {config.DURATION_MIN_SECONDS} and {config.DURATION_MAX_SECONDS}",
        )
    if not (config.POLL_OPTIONS_MIN <= len(options) <= config.POLL_OPTIONS_MAX):
        raise HTTPException(
            status_code=422,
            detail=f"Poll needs {config.POLL_OPTIONS_MIN}-{config.POLL_OPTIONS_MAX} options",
        )
    cleaned = []
    for opt in options:
        text = opt.strip()
        if not text:
            raise HTTPException(status_code=422, detail="Option cannot be empty")
        if len(text) > config.OPTION_TEXT_MAX:
            raise HTTPException(
                status_code=422,
                detail=f"Option exceeds {config.OPTION_TEXT_MAX} characters",
            )
        cleaned.append(text)
    return cleaned


@router.post("", status_code=status.HTTP_201_CREATED)
def create_poll(payload: dict) -> dict:
    title = str(payload.get("title", ""))
    visibility = str(payload.get("visibility", config.DEFAULT_VISIBILITY))
    try:
        duration_seconds = int(
            payload.get("duration_seconds", config.DEFAULT_DURATION_SECONDS)
        )
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="duration_seconds must be an int")
    try:
        options = list(payload.get("options", []))
    except TypeError:
        raise HTTPException(status_code=422, detail="options must be a list")
    cleaned = _validate_payload(title, options, visibility, duration_seconds)

    poll_id = uuid.uuid4().hex[:10]
    now = int(time.time())
    expires_at = now + duration_seconds
    with get_conn() as conn:
        execute(
            conn,
            "INSERT INTO polls (id, title, options, visibility, expires_at, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (poll_id, title.strip(), json.dumps(cleaned), visibility, expires_at, now),
        )
    log.info(
        "poll_created id=%s visibility=%s options=%d expires_in_seconds=%d",
        poll_id, visibility, len(cleaned), duration_seconds,
    )
    return {
        "id": poll_id,
        "title": title.strip(),
        "visibility": visibility,
        "expires_at": expires_at,
        "options": cleaned,
    }


@router.get("")
def list_polls() -> list[dict]:
    now = int(time.time())
    with get_conn() as conn:
        purge_expired(conn, now)
        rows = execute(
            conn,
            """
            SELECT p.id, p.title, p.created_at,
                   COUNT(v.id) AS total_votes
            FROM polls p
            LEFT JOIN votes v ON v.poll_id = p.id
            WHERE p.visibility = 'public' AND p.expires_at > ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 50
            """,
            (now,),
        ).fetchall()
    log.info("polls_listed count=%d", len(rows))
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "created_at": r["created_at"],
            "total_votes": r["total_votes"],
        }
        for r in rows
    ]


@router.get("/{poll_id}")
def get_poll(poll_id: str, response: Response) -> dict:
    now = int(time.time())
    with get_conn() as conn:
        row = _fetch_live(conn, poll_id, now)
        counts = {
            r["option_index"]: r["c"]
            for r in execute(
                conn,
                "SELECT option_index, COUNT(*) AS c FROM votes WHERE poll_id = ? GROUP BY option_index",
                (poll_id,),
            ).fetchall()
        }
    poll = _serialize_poll(row, counts)
    response.headers["Cache-Control"] = "no-store"
    return poll