"""Video schemas."""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.video import VideoStatus


class VideoBase(BaseModel):
    filename: str
    sport_type: Optional[str] = None


class VideoUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID
    filename: str
    original_filename: Optional[str] = None
    status: VideoStatus
    uploaded_at: datetime
    message: str = "Video uploaded successfully"


class VideoStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: VideoStatus
    processed_at: Optional[datetime] = None
    message: Optional[str] = None


class VideoDetailResponse(VideoBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID
    uploaded_by: Optional[UUID] = None
    original_filename: Optional[str] = None
    storage_path: Optional[str] = None
    storage_url: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    status: VideoStatus
    fps: Optional[float] = None
    duration_seconds: Optional[float] = None
    resolution: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None


class KeypointsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: UUID
    fps: float
    duration: float
    processed_fps: float
    frame_count: int
    smoothing_method: str
    frames: List[Dict[str, Any]]
