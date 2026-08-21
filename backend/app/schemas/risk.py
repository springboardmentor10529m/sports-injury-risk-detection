"""
Risk schemas.
Risk scores are decision-support signals, not clinical diagnoses.
"""
from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.analysis import RiskCategory

class RiskComponentScores(BaseModel):
    biomechanical: float
    historical: float
    asymmetry: float
    training_load: float
    fatigue: float

class RiskScoreResponse(BaseModel):
    """Risk scores are decision-support signals, not clinical diagnoses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID
    composite_score: float
    risk_category: RiskCategory
    component_scores: RiskComponentScores
    generated_at: datetime

class RiskHistoryResponse(BaseModel):
    history: List[RiskScoreResponse]

class RiskBreakdownResponse(BaseModel):
    """Risk scores are decision-support signals, not clinical diagnoses."""
    acl_risk: float
    hamstring_risk: float
    ankle_sprain_risk: float
    shoulder_risk: float
    lower_back_risk: float
    overuse_risk: float
