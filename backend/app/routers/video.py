import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from .. import models, schemas, auth

router = APIRouter(
    prefix="/video",
    tags=["Video Processing"]
)

@router.post("/upload", response_model=schemas.VideoResponse)
def upload_video(
    activity: str = Form(None),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "athlete":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only athletes can upload videos"
        )
        
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your athlete profile first before uploading video"
        )
        
    # File type validation (MP4, AVI, MOV, etc.)
    allowed_extensions = {".mp4", ".mov", ".avi", ".mkv"}
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format. Allowed: {', '.join(allowed_extensions)}"
        )
        
    # Create unique file name to avoid collision
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {str(e)}"
        )
        
    # Store the URL as relative static path: /uploads/unique_filename
    video_relative_url = f"/uploads/{unique_filename}"
    
    new_video = models.Video(
        athlete_id=athlete.athlete_id,
        activity=activity or "General",
        video_url=video_relative_url,
        processing_status="Uploaded"
    )
    
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.get("/list", response_model=List[schemas.VideoResponse])
def list_videos(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "athlete":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only athletes can retrieve video logs"
        )
        
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        return []
        
    videos = db.query(models.Video).filter(models.Video.athlete_id == athlete.athlete_id).all()
    return videos
