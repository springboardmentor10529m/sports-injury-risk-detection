from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime, date

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "ATHLETE"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- Athlete Schemas ---
class AthleteBase(BaseModel):
    sport: Optional[str] = "General"
    position: Optional[str] = "Athlete"
    age: Optional[int] = 20
    height: Optional[float] = 175.0
    weight: Optional[float] = 70.0
    training_load: Optional[float] = 50.0
    flexibility: Optional[float] = 75.0
    strength: Optional[float] = 80.0
    balance: Optional[float] = 70.0
    endurance: Optional[float] = 75.0
    coach_notes: Optional[str] = None

class AthleteCreate(AthleteBase):
    pass

class AthleteOut(AthleteBase):
    athlete_id: str
    user_id: str

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: datetime
    athlete_profile: Optional[AthleteOut] = None

    class Config:
        from_attributes = True

# --- Injury History Schemas ---
class InjuryHistoryBase(BaseModel):
    injury_type: str
    body_part: str
    severity: Optional[str] = "MODERATE"
    injury_date: Optional[date] = None
    recovery_date: Optional[date] = None
    remarks: Optional[str] = None

class InjuryHistoryCreate(InjuryHistoryBase):
    athlete_id: str

class InjuryHistoryOut(InjuryHistoryBase):
    injury_id: str
    athlete_id: str

    class Config:
        from_attributes = True

# --- Video Schemas ---
class VideoOut(BaseModel):
    video_id: str
    athlete_id: Optional[str] = None
    user_id: str
    user_name: Optional[str] = None
    activity: str
    video_url: str
    filename: str
    duration: float
    fps: int
    resolution: str
    quality_score: float
    processing_status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Analysis Results Schemas ---
class AnalysisResultBase(BaseModel):
    knee_valgus: Optional[float] = 0.0
    hip_stability: Optional[float] = 0.0
    trunk_lean: Optional[float] = 0.0
    stride_length: Optional[float] = 0.0
    joint_alignment: Optional[float] = 0.0
    symmetry_score: Optional[float] = 0.0
    fatigue_score: Optional[float] = 0.0
    movement_quality: Optional[float] = 0.0
    overall_risk_score: Optional[float] = 0.0
    risk_level: Optional[str] = "LOW"

class AnalysisResultCreate(AnalysisResultBase):
    video_id: str
    athlete_id: str

class AnalysisResultOut(AnalysisResultBase):
    analysis_id: str
    video_id: str
    athlete_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Injury Prediction Schemas ---
class InjuryPredictionBase(BaseModel):
    acl_risk: Optional[float] = 0.0
    hamstring_risk: Optional[float] = 0.0
    ankle_risk: Optional[float] = 0.0
    shoulder_risk: Optional[float] = 0.0
    lower_back_risk: Optional[float] = 0.0
    overuse_risk: Optional[float] = 0.0

class InjuryPredictionCreate(InjuryPredictionBase):
    analysis_id: str

class InjuryPredictionOut(InjuryPredictionBase):
    prediction_id: str
    analysis_id: str

    class Config:
        from_attributes = True

# --- Recommendation Schemas ---
class RecommendationBase(BaseModel):
    exercise: Optional[str] = None
    mobility: Optional[str] = None
    strengthening: Optional[str] = None
    recovery: Optional[str] = None
    training_modification: Optional[str] = None

class RecommendationCreate(RecommendationBase):
    prediction_id: str

class RecommendationOut(RecommendationBase):
    recommendation_id: str
    prediction_id: str

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: Optional[str] = "INFO"

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationOut(NotificationBase):
    notification_id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Report Schemas ---
class ReportBase(BaseModel):
    report_type: Optional[str] = "FULL_ASSESSMENT"
    file_path: str

class ReportCreate(ReportBase):
    athlete_id: str

class ReportOut(ReportBase):
    report_id: str
    athlete_id: str
    generated_by: str
    file_path: str
    generated_at: datetime

    class Config:
        from_attributes = True

# --- Performance Record Schemas ---
class PerformanceRecordBase(BaseModel):
    activity: str
    score: Optional[float] = 0.0
    remarks: Optional[str] = None

class PerformanceRecordCreate(PerformanceRecordBase):
    athlete_id: str

class PerformanceRecordOut(PerformanceRecordBase):
    record_id: str
    athlete_id: str
    recorded_at: datetime

    class Config:
        from_attributes = True

# --- MongoDB Collection Schemas (Pose Data & AI Logs) ---
class PoseDataSchema(BaseModel):
    video_id: str
    athlete_id: str
    frames: List[Dict[str, Any]] = []
    keypoints: List[List[float]] = []
    skeleton: List[Any] = []

class AILogSchema(BaseModel):
    video_id: str
    model_name: str
    inference_time: float
    confidence: float
    output: Any
