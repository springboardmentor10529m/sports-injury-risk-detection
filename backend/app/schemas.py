from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    phone: Optional[str] = None


class UserResponse(BaseModel):
    user_id: UUID
    name: str
    email: str
    role: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AthleteCreate(BaseModel):
    sport: str
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = 0.0
    flexibility: Optional[float] = 0.0
    strength: Optional[float] = 0.0
    balance: Optional[float] = 0.0
    endurance: Optional[float] = 0.0
    coach_notes: Optional[str] = None


class AthleteResponse(BaseModel):
    athlete_id: UUID
    user_id: UUID
    sport: str
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: float = 0.0
    flexibility: float = 0.0
    strength: float = 0.0
    balance: float = 0.0
    endurance: float = 0.0
    coach_notes: Optional[str] = None

    class Config:
        from_attributes = True


class InjuryHistoryCreate(BaseModel):
    injury_type: str
    body_part: str
    severity: str
    injury_date: date
    recovery_date: Optional[date] = None
    remarks: Optional[str] = None


class InjuryHistoryResponse(BaseModel):
    injury_id: UUID
    athlete_id: UUID
    injury_type: str
    body_part: str
    severity: str
    injury_date: date
    recovery_date: Optional[date] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True


class VideoResponse(BaseModel):
    video_id: UUID
    athlete_id: UUID
    activity: Optional[str] = None
    video_url: str
    duration: Optional[float] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None
    quality_score: Optional[float] = None
    processing_status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class AnalysisResultResponse(BaseModel):
    analysis_id: UUID
    video_id: UUID
    athlete_id: UUID
    knee_valgus: Optional[float] = None
    hip_stability: Optional[float] = None
    trunk_lean: Optional[float] = None
    stride_length: Optional[float] = None
    joint_alignment: Optional[float] = None
    symmetry_score: Optional[float] = None
    fatigue_score: Optional[float] = None
    movement_quality: Optional[float] = None
    overall_risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InjuryPredictionResponse(BaseModel):
    prediction_id: UUID
    analysis_id: UUID
    acl_risk: Optional[float] = None
    hamstring_risk: Optional[float] = None
    ankle_risk: Optional[float] = None
    shoulder_risk: Optional[float] = None
    lower_back_risk: Optional[float] = None
    overuse_risk: Optional[float] = None

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    recommendation_id: UUID
    prediction_id: UUID
    exercise: Optional[str] = None
    mobility: Optional[str] = None
    strengthening: Optional[str] = None
    recovery: Optional[str] = None
    training_modification: Optional[str] = None

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class MovementAnomalyResponse(BaseModel):
    anomaly_id: UUID
    analysis_id: UUID
    video_id: UUID
    timestamp_start: float
    timestamp_end: float
    issue_type: str
    severity: str
    confidence: float
    affected_joints: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RiskAssessmentResponse(BaseModel):
    video_id: UUID
    athlete_id: UUID
    overall_risk_score: float
    risk_category: str
    biomechanical_risk: Optional[float] = None
    historical_injury_risk: Optional[float] = None
    asymmetry_risk: Optional[float] = None
    training_load_risk: Optional[float] = None
    fatigue_risk: Optional[float] = None
    acl_risk: float
    hamstring_risk: float
    ankle_risk: float
    shoulder_risk: float
    lower_back_risk: float
    overuse_risk: float
    disclaimer: str
    explanations: List[str] = []
    contributing_factors: List[Dict[str, Any]] = []
    anomalies: List[Dict[str, Any]] = []
    recommendations: Dict[str, Any] = {}
    ml_prediction: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class RiskHistoryItem(BaseModel):
    video_id: UUID
    uploaded_at: datetime
    overall_risk_score: float
    risk_category: str
    acl_risk: float
    hamstring_risk: float
    movement_quality: float