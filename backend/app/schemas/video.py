"""
app/schemas/video.py
--------------------
Pydantic schemas for the Video resource.

The binary payload (file_data) is intentionally excluded from all response
schemas — callers receive only metadata, never the raw bytes over the wire.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict


class VideoUploadResponse(BaseModel):
    """
    Returned to the client after a successful POST /videos upload.

    Never includes file_data — the binary is stored in PostgreSQL but is
    not serialised into the HTTP response.
    """

    video_id: UUID
    athlete_id: UUID

    original_filename: Optional[str] = None
    content_type: Optional[str] = None

    # Size in bytes so the client can show a human-readable confirmation.
    file_size: Optional[int] = None

    processing_status: Optional[str] = None
    activity: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
