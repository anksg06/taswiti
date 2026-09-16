import logging
import queue
from logging.handlers import QueueHandler, QueueListener, RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

_FORMAT = logging.Formatter("[%(asctime)s] %(levelname)s %(name)s: %(message)s")

_listener = None


class _SensitiveFilter:
    def filter(self, record) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        return not ("client_token" in msg.lower() or "x-client-token" in msg.lower())


def setup_logging() -> None:
    global _listener
    if _listener is not None:
        return

    q = queue.Queue(-1)

    file_handler = RotatingFileHandler(
        LOG_DIR / "app.log", maxBytes=1_000_000, backupCount=2, encoding="utf-8"
    )
    file_handler.setFormatter(_FORMAT)
    file_handler.addFilter(_SensitiveFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(QueueHandler(q))

    _listener = QueueListener(q, file_handler)
    _listener.start()


def shutdown_logging() -> None:
    global _listener
    if _listener is not None:
        _listener.stop()
        _listener = None


def logger(name: str) -> logging.Logger:
    return logging.getLogger(name)