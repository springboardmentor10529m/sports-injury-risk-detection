import uuid
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.models import ActivityType, User, VideoAnalysis, VideoStatus
from app.routers.deps import require_athlete
from app.schemas import VideoAnalysisOut
from app.services.pipeline import run_pipeline
from app.services.jobs import TERMINAL

router = APIRouter(prefix="/api/videos", tags=["videos"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
local_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="video-pipeline")


@router.get("/limits")
def upload_limits():
    return {"max_upload_mb": settings.MAX_UPLOAD_MB, "max_video_seconds": settings.MAX_VIDEO_SECONDS}


@router.post("/upload", response_model=VideoAnalysisOut, status_code=201)
def upload_video(
    file: UploadFile = File(...),
    activity_type: ActivityType = Form(...),
    current_user: User = Depends(require_athlete),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    stored_name = f"{uuid.uuid4()}{ext}"
    stored_path = settings.upload_path / stored_name
    try:
        # Serialize admission across API processes; released on commit/rollback.
        if db.bind.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(73190422)"))
        pending = db.query(VideoAnalysis).filter(VideoAnalysis.status.notin_(TERMINAL))
        if (pending.count() >= settings.MAX_PENDING_VIDEOS or pending.filter(
                VideoAnalysis.athlete_id == current_user.athlete_profile.id).count() >= settings.MAX_PENDING_PER_ATHLETE):
            raise HTTPException(429, "Processing queue is full. Wait for an analysis to finish.")
        used = 0
        for existing in settings.upload_path.iterdir():
            try:
                if existing.is_file():
                    used += existing.stat().st_size
            except FileNotFoundError:
                # A worker may delete a completed upload during admission.
                continue
        if (used + max_bytes > settings.MAX_UPLOAD_STORAGE_MB * 1024 * 1024
                or shutil.disk_usage(settings.upload_path).free < max_bytes + 256 * 1024 * 1024):
            raise HTTPException(507, "Video storage is full. Please contact the administrator.")
        size = 0
        with stored_path.open("xb") as output:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(413, f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")
                output.write(chunk)
        if not size:
            raise HTTPException(400, "Uploaded file is empty.")
        video = VideoAnalysis(
            athlete_id=current_user.athlete_profile.id, activity_type=activity_type,
            original_filename=Path(file.filename).name[:255], stored_path=str(stored_path),
            status=VideoStatus.UPLOADED,
        )
        db.add(video)
        db.commit()
    except BaseException:
        db.rollback()
        stored_path.unlink(missing_ok=True)
        raise
    finally:
        file.file.close()
    db.refresh(video)
    if settings.PROCESSING_MODE == "local":
        local_executor.submit(run_pipeline, video.id, SessionLocal)

    return video


@router.get("", response_model=list[VideoAnalysisOut])
def list_videos(current_user: User = Depends(require_athlete), db: Session = Depends(get_db)):
    return (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.athlete_id == current_user.athlete_profile.id)
        .order_by(VideoAnalysis.created_at.desc())
        .all()
    )


@router.get("/{video_id}", response_model=VideoAnalysisOut)
def get_video(video_id: str, current_user: User = Depends(require_athlete), db: Session = Depends(get_db)):
    video = db.get(VideoAnalysis, video_id)
    if video is None or video.athlete_id != current_user.athlete_profile.id:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.get("/{video_id}/pose-frames")
def get_pose_frames(video_id: str, current_user: User = Depends(require_athlete), db: Session = Depends(get_db)):
    video = db.get(VideoAnalysis, video_id)
    if video is None or video.athlete_id != current_user.athlete_profile.id:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.pose_frames is None:
        raise HTTPException(status_code=404, detail="Pose frames not available yet")
    return video.pose_frames
