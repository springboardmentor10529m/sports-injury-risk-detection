import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

import database, models
from routers import auth_router, athlete_router, video_router, pose_router, analysis_router, ml_catalog_router

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="AthleteGuard",
    description="Backend service for AthleteGuard - AI Sports Biomechanics & Injury Prevention.",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads and pose_results directories exist and mount static files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

POSE_RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pose_results")
os.makedirs(POSE_RESULTS_DIR, exist_ok=True)
app.mount("/pose_results", StaticFiles(directory=POSE_RESULTS_DIR), name="pose_results")

# Include Routers
app.include_router(auth_router.router)
app.include_router(athlete_router.router)
app.include_router(video_router.router)
app.include_router(pose_router.router)
app.include_router(analysis_router.router)
app.include_router(ml_catalog_router.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AthleteGuard",
        "phase": "Pose Estimation Engine & Athlete Profile System",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
