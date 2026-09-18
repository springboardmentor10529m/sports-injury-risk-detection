# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# --- User Schemas ---
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("athlete", description="athlete, coach, physiotherapist, sports_scientist, admin")
    phone: Optional[str] = None
    profile_image: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None

# --- Athlete Schemas ---
class AthleteCreate(BaseModel):
    sport: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = 0.0
    flexibility: Optional[float] = None
    strength: Optional[float] = None
    balance: Optional[float] = None
    endurance: Optional[float] = None
    coach_notes: Optional[str] = None

class AthleteResponse(BaseModel):
    athlete_id: str
    user_id: str
    sport: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = 0.0
    flexibility: Optional[float] = None
    strength: Optional[float] = None
    balance: Optional[float] = None
    endurance: Optional[float] = None
    coach_notes: Optional[str] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class CoachNotesUpdate(BaseModel):
    coach_notes: str

class AthleteDetailedResponse(BaseModel):
    athlete_id: str
    user_id: str
    sport: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = 0.0
    flexibility: Optional[float] = None
    strength: Optional[float] = None
    balance: Optional[float] = None
    endurance: Optional[float] = None
    coach_notes: Optional[str] = None
    user: UserResponse
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    valgus_angle: Optional[str] = None
    asymmetry: Optional[str] = None
    status: Optional[str] = None
    acwr: Optional[float] = None
    last_assessment: Optional[str] = None

    class Config:
        from_attributes = True

# --- Biomechanics Analysis Schemas ---
class BiomechanicsAnalysisResponse(BaseModel):
    analysis_id: str
    video_id: str
    joint_angles: Optional[str] = None
    range_of_motion: Optional[str] = None
    symmetry_score: Optional[float] = None
    trunk_lean: Optional[float] = None
    knee_valgus_detected: Optional[str] = None
    balance_score: Optional[float] = None
    movement_quality_score: Optional[float] = None
    risk_level: Optional[str] = None
    feedback: Optional[str] = None
    annotated_video_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Injury Prediction Schemas ---
class InjuryPredictionResponse(BaseModel):
    prediction_id: str
    athlete_id: str
    video_id: str
    acl_risk_prob: float
    hamstring_risk_prob: float
    ankle_risk_prob: float
    shoulder_risk_prob: float
    back_risk_prob: float
    overall_risk_score: float
    risk_category: str
    anomaly_score: float
    rf_risk_prob: Optional[float] = None
    xgb_risk_prob: Optional[float] = None
    factor_kinematics: Optional[float] = None
    factor_load: Optional[float] = None
    factor_asymmetry: Optional[float] = None
    factor_velocity: Optional[float] = None
    factor_prior_injury: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Video Schemas ---
class VideoResponse(BaseModel):
    video_id: str
    athlete_id: str
    activity: Optional[str] = None
    video_url: str
    duration: Optional[float] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None
    quality_score: Optional[float] = None
    processing_status: str
    uploaded_at: datetime
    analysis: Optional[BiomechanicsAnalysisResponse] = None
    injury_prediction: Optional[InjuryPredictionResponse] = None

    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: Optional[str] = "system"
    severity: Optional[str] = "info"

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    severity: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Corrective Recommendation Schemas ---
class CorrectiveRecommendationCreate(BaseModel):
    target_injury_risk: str
    title: str
    category: Optional[str] = "Mobility"
    sets_reps: Optional[str] = "3 sets x 10 reps"
    frequency: Optional[str] = "3x per week"
    description: str

class CorrectiveRecommendationResponse(BaseModel):
    recommendation_id: str
    athlete_id: str
    video_id: Optional[str] = None
    target_injury_risk: str
    title: str
    category: str
    sets_reps: str
    frequency: str
    description: str
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Admin & Analytics Schemas ---
class RoleUpdateRequest(BaseModel):
    role: str

class SystemMetricsResponse(BaseModel):
    total_users: int
    total_athletes: int
    total_videos: int
    total_analyses: int
    total_predictions: int
    risk_distribution: dict
    role_distribution: dict

