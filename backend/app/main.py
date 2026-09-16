from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .api import polls, votes
from .database import init_db
from .logging import logger, setup_logging, shutdown_logging

log = logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_db()
    log.info("voting_app_started")
    yield
    shutdown_logging()
    log.info("voting_app_stopped")


app = FastAPI(title="Quick Voting API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(polls.router)
app.include_router(votes.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "time": __import__("time").time()}