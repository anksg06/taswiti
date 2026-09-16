"""Automated end-to-end test for the voting API (Run: python verify_api.py)."""
import http.client
import json
import sqlite3
import sys
import time
import uuid

from app import config

BASE = "127.0.0.1"
PORT = 8001
PASS = 0
FAIL = 0


def request(method, path, body=None, token=None, expect=None):
    global PASS, FAIL
    conn = http.client.HTTPConnection(BASE, PORT, timeout=10)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Client-Token"] = token
    conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
    resp = conn.getresponse()
    data = json.loads(resp.read().decode() or "null")
    status = resp.status
    conn.close()

    ok = expect is None or status == expect
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {method} {path} -> {status} {json.dumps(data, ensure_ascii=False)[:110]}")
    if ok:
        PASS += 1
    else:
        FAIL += 1
        print(f"        expected {expect}")
    return data, status


def force_expire(poll_id):
    db = sqlite3.connect(config.DB_PATH)
    db.execute("UPDATE polls SET expires_at = 1 WHERE id = ?", (poll_id,))
    db.commit()
    db.close()


def main():
    tok = "autotest-user-" + uuid.uuid4().hex[:8]
    tok2 = "autotest-user-" + uuid.uuid4().hex[:8]

    request("GET", "/api/health", expect=200)

    pub, _ = request("POST", "/api/polls",
                     {"title": "Public E2E", "options": ["A", "B"],
                      "visibility": "public", "duration_seconds": 3600}, expect=201)
    priv, _ = request("POST", "/api/polls",
                      {"title": "Private E2E", "options": ["A", "B"],
                       "visibility": "private", "duration_seconds": 86400}, expect=201)

    request("POST", "/api/polls", {"title": "Bad vis", "options": ["A", "B"], "visibility": "x"}, expect=422)
    request("POST", "/api/polls", {"title": "Too short", "options": ["A", "B"], "duration_seconds": 5}, expect=422)
    request("POST", "/api/polls", {"title": "Too long", "options": ["A", "B"], "duration_seconds": 40_000_000}, expect=422)
    request("POST", "/api/polls", {"title": "Bad dur type", "options": ["A", "B"], "duration_seconds": "abc"}, expect=422)

    short, _ = request("POST", "/api/polls",
                       {"title": "30s poll", "options": ["A", "B"], "duration_seconds": 30}, expect=201)
    assert short["expires_at"] - int(time.time()) == 30
    print("[PASS] custom 30-second duration accepted (seconds precision)")

    listed, _ = request("GET", "/api/polls", expect=200)
    listed_ids = [p["id"] for p in listed]
    assert pub["id"] in listed_ids, "public poll must appear in list"
    assert priv["id"] not in listed_ids, "private poll must NOT appear in list"
    print(f"[PASS] visibility filtering verified (public listed, private hidden)")

    detail, _ = request("GET", f"/api/polls/{priv['id']}", expect=200)
    assert detail["visibility"] == "private" and detail["expires_at"] > 0
    print("[PASS] private poll reachable by direct link")

    request("POST", f"/api/polls/{priv['id']}/vote", {"option_index": 0}, token=tok, expect=201)
    request("POST", f"/api/polls/{priv['id']}/vote", {"option_index": 0}, token=tok, expect=409)
    request("POST", f"/api/polls/{pub['id']}/vote", {"option_index": 1}, token=tok2, expect=201)

    # expiry flow: poll exists -> 410 -> purged (404 on next access)
    exp, _ = request("POST", "/api/polls",
                     {"title": "Ephemeral", "options": ["A", "B"], "duration_seconds": 3600}, expect=201)
    force_expire(exp["id"])
    request("GET", f"/api/polls/{exp['id']}", expect=410)
    request("GET", f"/api/polls/{exp['id']}", expect=404)
    request("POST", f"/api/polls/{exp['id']}/vote", {"option_index": 0}, token=tok, expect=404)
    print("[PASS] expired poll returns 410 then is fully purged from site")

    eno, _ = request("POST", "/api/polls",
                     {"title": "Exp vote", "options": ["A", "B"], "visibility": "private"}, expect=201)
    force_expire(eno["id"])
    request("POST", f"/api/polls/{eno['id']}/vote", {"option_index": 0}, token=tok, expect=410)

    request("GET", "/api/polls/does-not-exist", expect=404)
    request("POST", "/api/polls/no-such-poll/vote", {"option_index": 0}, token=tok, expect=404)
    request("POST", "/api/polls", {"title": "", "options": ["A", "B"]}, expect=422)
    request("POST", "/api/polls", {"title": "X", "options": ["A"]}, expect=422)
    request("POST", "/api/polls", {"title": "X", "options": ["A", ""]}, expect=422)

    detail, _ = request("GET", f"/api/polls/{pub['id']}", expect=200)
    counts = [o["count"] for o in detail["options"]]
    assert counts == [0, 1] and detail["total"] == 1, f"WRONG AGGREGATION: {counts}"
    print(f"[PASS] aggregation verified: counts={counts}")

    print(f"\nRESULT: {PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()