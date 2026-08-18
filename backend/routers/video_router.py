import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import database, models, schemas, auth
from utils.video_utils import extract_video_metadata

router = APIRouter(prefix="/api/videos", tags=["Videos"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "videos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.VideoOut)
async def upload_video(
    activity: str = Form("General Movement"),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"]
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Supported formats: {', '.join(allowed_extensions)}"
        )

    # Unique file name on disk
    unique_id = str(uuid.uuid4())
    safe_filename = f"{unique_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video file: {str(e)}")

    # Extract metadata using OpenCV
    metadata = extract_video_metadata(file_path)

    # Get athlete_id if user has an athlete profile
    athlete_id = None
    if current_user.athlete_profile:
        athlete_id = current_user.athlete_profile.athlete_id

    # Create video URL for static serving
    video_url = f"/uploads/videos/{safe_filename}"

    # DB record
    video_record = models.Video(
        video_id=unique_id,
        athlete_id=athlete_id,
        user_id=current_user.user_id,
        activity=activity,
        video_url=video_url,
        filename=file.filename,
        duration=metadata["duration"],
        fps=metadata["fps"],
        resolution=metadata["resolution"],
        quality_score=metadata["quality_score"],
        processing_status="UPLOADED", # Ready for ML in Phase 2
    )

    db.add(video_record)
    db.commit()
    db.refresh(video_record)

    out = schemas.VideoOut.from_orm(video_record)
    out.user_name = current_user.name
    return out

@router.get("/my-videos", response_model=List[schemas.VideoOut])
def get_my_videos(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    videos = db.query(models.Video).filter(models.Video.user_id == current_user.user_id).order_by(models.Video.uploaded_at.desc()).all()
    results = []
    for v in videos:
        vo = schemas.VideoOut.from_orm(v)
        vo.user_name = current_user.name
        results.append(vo)
    return results

@router.get("/all", response_model=List[schemas.VideoOut])
def get_all_videos(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Returns all videos uploaded across all athletes/users so users can explore and view other videos.
    """
    videos = db.query(models.Video).order_by(models.Video.uploaded_at.desc()).all()
    results = []
    for v in videos:
        vo = schemas.VideoOut.from_orm(v)
        vo.user_name = v.user.name if v.user else "Unknown Athlete"
        results.append(vo)
    return results

@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")

    # Delete physical file
    safe_filename = os.path.basename(video.video_url)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully", "video_id": video_id}
