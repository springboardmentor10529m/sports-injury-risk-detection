import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import admin, analysis, athlete, auth, coach, notifications, physio, scientist, video

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InjuryGuard AI API",
    description="Sports Injury Risk Detection from Video - core pipeline (athlete role).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
