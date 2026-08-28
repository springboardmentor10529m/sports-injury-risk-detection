import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.models import ActivityType, User, VideoAnalysis, VideoStatus
from app.routers.deps import require_athlete
from app.schemas import VideoAnalysisOut
from app.services.pipeline import run_pipeline

router = APIRouter(prefix="/api/videos", tags=["videos"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}


@router.post("/upload", response_model=VideoAnalysisOut, status_code=201)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    activity_type: ActivityType = Form(...),
    current_user: User = Depends(require_athlete),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    stored_name = f"{uuid.uuid4()}{ext}"
    stored_path = settings.upload_path / stored_name
    stored_path.write_bytes(contents)

    video = VideoAnalysis(
        athlete_id=current_user.athlete_profile.id,
        activity_type=activity_type,
        original_filename=file.filename,
        stored_path=str(stored_path),
        status=VideoStatus.UPLOADED,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    background_tasks.add_task(run_pipeline, video.id, SessionLocal)

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
    return video.pose_frames or {"frames": []}
