import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import database, models, schemas, auth
from utils.video_utils import extract_video_metadata

router = APIRouter(prefix="/api/videos", tags=["Videos"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "videos")
PROCESSED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "processed")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.VideoOut)
async def upload_video(
    activity: str = Form("General Movement"),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Validate MIME type
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("video/") and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Must be a valid video stream."
        )

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"]
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Supported formats: {', '.join(allowed_extensions)}"
        )

    # Validate maximum file size (100MB limit)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum permitted limit of 100MB ({file_size / (1024*1024):.1f}MB detected)."
        )

    # Unique file name on disk preventing path traversal
    unique_id = str(uuid.uuid4())
    safe_filename = f"{unique_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video file: {str(e)}")

    # Extract metadata using OpenCV and validate duration
    metadata = extract_video_metadata(file_path)
    if metadata.get("duration", 0.0) > 300.0:  # Max 5 minutes
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video duration ({metadata.get('duration'):.1f}s) exceeds maximum allowed length of 300 seconds."
        )

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
        latest_job = db.query(models.AnalysisJob).filter(
            models.AnalysisJob.video_id == v.video_id
        ).order_by(models.AnalysisJob.created_at.desc()).first()
        if latest_job:
            vo.latest_analysis_id = latest_job.id
            vo.latest_analysis_status = latest_job.status
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

@router.get("/{video_id}", response_model=schemas.VideoOut)
def get_video_by_id(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to access this video")
    out = schemas.VideoOut.from_orm(video)
    out.user_name = video.user.name if video.user else "Unknown Athlete"
    return out

@router.get("/{video_id}/processed")
def get_processed_video(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user_from_header_or_query),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to access this video")

    # Locate processed video file
    candidate_paths = []
    if video.processed_video_path:
        candidate_paths.append(video.processed_video_path)
    
    candidate_paths.extend([
        os.path.join(PROCESSED_DIR, f"{video_id}_pose.mp4"),
        os.path.join(PROCESSED_DIR, f"{video_id}_skeleton.mp4")
    ])

    matched_path = None
    for p in candidate_paths:
        if p and os.path.exists(p) and os.path.getsize(p) > 0:
            matched_path = p
            break

    if not matched_path:
        raise HTTPException(status_code=404, detail="Annotated video not found or not yet generated")

    return FileResponse(
        matched_path,
        media_type="video/mp4",
        filename=f"annotated_{video_id}.mp4",
        headers={"Accept-Ranges": "bytes"}
    )
