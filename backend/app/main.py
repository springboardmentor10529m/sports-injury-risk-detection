import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine
from app.core.schema import initialize_schema
from app.core.request_limits import RequestLimits
from app.routers import admin, analysis, athlete, auth, coach, notifications, physio, scientist, video

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app):
    if settings.ENVIRONMENT != "production":
        initialize_schema()
    yield

app = FastAPI(
    title="InjuryGuard AI API",
    description="Sports Injury Risk Detection from Video - core pipeline (athlete role).",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT == "production" else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLimits)


@app.exception_handler(IntegrityError)
async def handle_conflict(request, exc):
    return JSONResponse(status_code=409, content={"detail": "This change conflicts with an existing record."})

app.include_router(auth.router)
app.include_router(athlete.router)
app.include_router(video.router)
app.include_router(analysis.router)
app.include_router(coach.router)
app.include_router(physio.router)
app.include_router(scientist.router)
app.include_router(admin.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"message": "InjuryGuard AI API is running", "status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ready")
def ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM video_analyses LIMIT 1"))
        if not Path(settings.POSE_MODEL_PATH).is_file():
            raise RuntimeError("Pose model missing")
    except Exception:
        logging.getLogger(__name__).exception("Readiness check failed")
        raise HTTPException(503, "Service is not ready")
    return {"status": "ready"}
