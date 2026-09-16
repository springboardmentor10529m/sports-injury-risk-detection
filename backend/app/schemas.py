from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field

from app.models import ActivityType, UserRole, VideoStatus

# ---------- Auth ----------


def password_byte_limit(value):
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return value


Password = Annotated[str, Field(min_length=8, max_length=72), AfterValidator(password_byte_limit)]


class RegistrationBase(BaseModel):
    invitation_code: str = Field(default="", max_length=2048)


class RegisterRequest(RegistrationBase):
    email: EmailStr
    password: Password
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


class RegisterCoachRequest(RegistrationBase):
    email: EmailStr
    password: Password
    full_name: str
    sport: str
    specialization: str | None = None
    years_experience: int = 0
    organization: str | None = None


class RegisterPhysioRequest(RegistrationBase):
    email: EmailStr
    password: Password
    full_name: str
    qualification: str | None = None
    specialization: str | None = None
    years_experience: int = 0
    clinic: str | None = None


class RegisterScientistRequest(RegistrationBase):
    email: EmailStr
    password: Password
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


class InjuryContext(BaseModel):
    """Optional self-reported context; not additional scoring inputs."""
    body_area: str = Field(default="", max_length=100)
    side: Literal["unknown", "left", "right", "both", "not_applicable"] = "unknown"
    injury_type: str = Field(default="", max_length=150)
    timeframe: str = Field(default="", max_length=100)
    recovery_status: Literal["unknown", "recovered", "recovering", "ongoing"] = "unknown"
    limitations: str = Field(default="", max_length=1000)
    pain_location: str = Field(default="", max_length=100)
    pain_severity: int | None = Field(default=None, ge=0, le=10)
    clinician_restrictions: str = Field(default="", max_length=1000)


class AthleteProfileOut(BaseModel):
    injury_context: InjuryContext | None = None
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
    injury_context: InjuryContext | None = None
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
    pose_frames: dict | None
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
    password: Password
    full_name: str
    role: UserRole


# ---------- Notifications ----------


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
