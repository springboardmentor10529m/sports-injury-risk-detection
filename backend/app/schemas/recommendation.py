"""Recommendation schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.recommendation import RecCategory, RecPriority, RecStatus


class ExerciseBase(BaseModel):
    name: str
    sets: int
    reps: int
    duration_seconds: int | None = None
    notes: str | None = None


class RecommendationBase(BaseModel):
    category: RecCategory
    priority: RecPriority
    title: str
    description: str
    exercises: list[ExerciseBase] = []


class RecommendationResponse(RecommendationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    risk_report_id: UUID
    status: RecStatus
    created_at: datetime
    updated_at: datetime


class RecommendationStatusUpdate(BaseModel):
    status: RecStatus
