from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import ActivityType, UserRole, VideoStatus

# ---------- Auth ----------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str

    sport: str
    position: str | None = None
    age: int = Field(gt=0, lt=120)
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    previous_injury_count: int = 0
    days_since_last_injury: int | None = None
    current_pain_flag: bool = False
    weekly_training_hours: float = 0.0
    acute_chronic_ratio: float | None = None


class RegisterCoachRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    sport: str
    specialization: str | None = None
    years_experience: int = 0
    organization: str | None = None


class RegisterPhysioRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    qualification: str | None = None
    specialization: str | None = None
    years_experience: int = 0
    clinic: str | None = None


class RegisterScientistRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    institution: str | None = None
    research_area: str | None = None
    specialization: str | None = None
    years_experience: int = 0


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AthleteProfileOut(BaseModel):
    id: str
    sport: str
    position: str | None
    age: int
    height_cm: float
    weight_kg: float
    previous_injury_count: int
    days_since_last_injury: int | None
    current_pain_flag: bool
    weekly_training_hours: float
    acute_chronic_ratio: float | None

    class Config:
        from_attributes = True


class CoachProfileOut(BaseModel):
    id: str
    sport: str
    specialization: str | None
    years_experience: int
    organization: str | None

    class Config:
        from_attributes = True


class PhysioProfileOut(BaseModel):
    id: str
    qualification: str | None
    specialization: str | None
    years_experience: int
    clinic: str | None

    class Config:
        from_attributes = True


class ScientistProfileOut(BaseModel):
    id: str
    institution: str | None
    research_area: str | None
    specialization: str | None
    years_experience: int

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool = True
    athlete_profile: AthleteProfileOut | None = None
    coach_profile: CoachProfileOut | None = None
    physio_profile: PhysioProfileOut | None = None
    scientist_profile: ScientistProfileOut | None = None

    class Config:
        from_attributes = True


class AthleteProfileUpdate(BaseModel):
    sport: str | None = None
    position: str | None = None
    age: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    previous_injury_count: int | None = None
    days_since_last_injury: int | None = None
    current_pain_flag: bool | None = None
    weekly_training_hours: float | None = None
    acute_chronic_ratio: float | None = None


# ---------- Video / Analysis ----------


class VideoAnalysisOut(BaseModel):
    id: str
    activity_type: ActivityType
    original_filename: str
    status: VideoStatus
    error_message: str | None
    fps_sampled: float | None
    frame_count_sampled: int | None
    frames_with_pose_detected: int | None
    created_at: datetime
    completed_at: datetime | None
    biomechanics: dict | None
    risk_assessment: dict | None
    recommendations: dict | None

    class Config:
        from_attributes = True


class VideoAnalysisListItem(BaseModel):
    id: str
    activity_type: ActivityType
    original_filename: str
    status: VideoStatus
    created_at: datetime
    overall_risk_score: float | None = None
    risk_category: str | None = None

    class Config:
        from_attributes = True


# ---------- Coach / Physio / Scientist roster ----------


class RosterAthleteOut(BaseModel):
    athlete_id: str
    full_name: str
    email: str
    sport: str
    position: str | None
    latest_risk_score: float | None = None
    latest_risk_category: str | None = None
    latest_analysis_date: datetime | None = None
    total_analyses: int = 0


class AddAthleteRequest(BaseModel):
    athlete_email: EmailStr


# ---------- Clinical notes (physio) ----------


class ClinicalNoteCreate(BaseModel):
    phase: str = Field(pattern="^(mobility|strength|return_to_sport)$")
    note: str = Field(min_length=1)


class ClinicalNoteOut(BaseModel):
    id: str
    phase: str
    note: str
    created_at: datetime
    physio_name: str | None = None

    class Config:
        from_attributes = True


# ---------- Admin ----------


class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: UserRole
