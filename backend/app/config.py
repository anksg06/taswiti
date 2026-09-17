import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "polls.db"
LOG_DIR = BASE_DIR / "logs"

DATABASE_URL = os.environ.get("DATABASE_URL", "")

POLL_TITLE_MAX = 120
POLL_OPTIONS_MIN = 2
POLL_OPTIONS_MAX = 10
OPTION_TEXT_MAX = 80
RESULTS_POLL_INTERVAL_SEC = 5

VISIBILITIES = ("public", "private")
DEFAULT_VISIBILITY = "public"
DURATION_MIN_SECONDS = 30
DURATION_MAX_SECONDS = 2_592_000  # 30 days
DEFAULT_DURATION_SECONDS = 86400
LEGACY_EXPIRY_DAYS = 7

def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return ["*"]


CORS_ORIGINS = _cors_origins()

for d in (DATA_DIR, LOG_DIR):
    os.makedirs(d, exist_ok=True)