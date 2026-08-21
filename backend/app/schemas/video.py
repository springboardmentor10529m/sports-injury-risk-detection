"""Video schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.video import VideoStatus


class VideoBase(BaseModel):
    filename: str
    sport_type: str | None = None


class VideoUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID
    filename: str
    original_filename: str | None = None
    status: VideoStatus
    uploaded_at: datetime
    message: str = "Video uploaded successfully"


class VideoStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: VideoStatus
    processed_at: datetime | None = None
    message: str | None = None


class VideoDetailResponse(VideoBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID
    uploaded_by: UUID | None = None
    original_filename: str | None = None
    storage_path: str | None = None
    storage_url: str | None = None
    content_type: str | None = None
    file_size: int | None = None
    status: VideoStatus
    fps: float | None = None
    duration_seconds: float | None = None
    resolution: str | None = None
    uploaded_at: datetime
    processed_at: datetime | None = None


class KeypointsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: UUID
    fps: float
    duration: float
    processed_fps: float
    frame_count: int
    smoothing_method: str
    frames: list[dict[str, Any]]
