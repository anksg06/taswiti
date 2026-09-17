import json
import time

from fastapi import APIRouter, Header, HTTPException, status

from ..database import IntegrityError, execute, get_conn
from ..logging import logger

router = APIRouter(prefix="/api/polls", tags=["votes"])
log = logger("votes")


@router.post("/{poll_id}/vote", status_code=status.HTTP_201_CREATED)
def submit_vote(
    poll_id: str,
    payload: dict,
    x_client_token: str = Header(..., min_length=8, max_length=128),
) -> dict:
    option_index = payload.get("option_index")
    if not isinstance(option_index, int) or option_index < 0:
        raise HTTPException(status_code=422, detail="option_index must be a non-negative int")

    now = int(time.time())
    try:
        with get_conn() as conn:
            poll = execute(
                conn, "SELECT id, options, expires_at FROM polls WHERE id = ?", (poll_id,)
            ).fetchone()
            if poll is None:
                raise HTTPException(status_code=404, detail="Poll not found")
            if now >= poll["expires_at"]:
                log.info("poll_expired_purged id=%s", poll_id)
                execute(conn, "DELETE FROM polls WHERE id = ?", (poll_id,))
                conn.commit()
                raise HTTPException(status_code=410, detail="Poll expired")

            options = json.loads(poll["options"])
            if option_index >= len(options):
                raise HTTPException(status_code=422, detail="option_index out of range")

            execute(
                conn,
                "INSERT INTO votes (poll_id, option_index, client_token, created_at)"
                " VALUES (?, ?, ?, ?)",
                (poll_id, option_index, x_client_token, now),
            )
    except IntegrityError:
        log.warning("duplicate_vote poll_id=%s", poll_id)
        raise HTTPException(status_code=409, detail="Already voted")

    log.info("vote_recorded poll_id=%s option_index=%d", poll_id, option_index)
    return {"ok": True, "option_index": option_index}