"""
app/schemas/analysis.py
------------------------
Pydantic request/response schemas for the video analysis endpoints.

POST /videos/{video_id}/analyze  → AnalysisTriggerResponse
GET  /videos/{video_id}/analysis → AnalysisStatusResponse
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict


class AnalysisTriggerResponse(BaseModel):
    """
    Returned immediately after triggering analysis via POST /analyze.

    The background task has been queued; the client should poll
    GET /analysis to track progress.
    """
    analysis_id: UUID
    video_id: UUID
    status: str           # "PENDING" at creation time
    message: str          # Human-readable confirmation

    model_config = ConfigDict(from_attributes=True)


class AnalysisStatusResponse(BaseModel):
    """
    Returned by GET /videos/{video_id}/analysis.

    Includes video metadata once processing completes, plus pose landmark
    summary counts for display.
    """
    analysis_id: UUID
    video_id: UUID
    athlete_id: UUID
    status: str                           # PENDING | PROCESSING | COMPLETED | FAILED

    # Set when status is FAILED
    error_message: Optional[str] = None

    # Video metadata — populated after OpenCV processing
    fps: Optional[float] = None
    frame_count: Optional[int] = None
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    frames_processed: Optional[int] = None

    # Timestamps
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
