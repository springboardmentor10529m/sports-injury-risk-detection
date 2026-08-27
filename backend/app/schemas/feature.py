"""
app/schemas/feature.py
----------------------
Pydantic schemas for the biomechanical feature endpoint GET /videos/{video_id}/features.
"""
from datetime import datetime
from typing import Any, Dict
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnalysisFeatureResponse(BaseModel):
    """
    Returned by GET /videos/{video_id}/features.

    Contains the structured feature vector, feature version string, and timestamps.
    """
    feature_id: UUID
    analysis_id: UUID
    feature_version: str
    features: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
