"""
app/schemas/less.py
-------------------
Pydantic schemas for LESS (Landing Error Scoring System) API responses.
"""
from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LESSItemSchema(BaseModel):
    item_number: int
    item_name: str
    status: str                         # PASS | ERROR | NOT_COMPUTABLE
    score: Optional[int] = None
    measured_value: Optional[float] = None
    criterion_threshold: Optional[Any] = None
    unit: Optional[str] = None
    reference: str
    reason: Optional[str] = None


class AnalysisLESSResponse(BaseModel):
    less_id: UUID
    analysis_id: UUID
    score: int
    max_computable_score: int
    computable_items: int
    error_items: int
    not_computable_items: int
    classification: str
    source: str
    validation_source: str
    source_version: str
    disclaimer: str
    items: list[LESSItemSchema]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
