import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ATHLETE = "athlete"
    COACH = "coach"
    PHYSIOTHERAPIST = "physiotherapist"
    SPORTS_SCIENTIST = "sports_scientist"
    ADMIN = "admin"


class VideoStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    EXTRACTING_FRAMES = "extracting_frames"
    RUNNING_POSE = "running_pose"
    ANALYZING_BIOMECHANICS = "analyzing_biomechanics"
    SCORING_RISK = "scoring_risk"
    GENERATING_RECOMMENDATIONS = "generating_recommendations"
    COMPLETED = "completed"
    FAILED = "failed"


class ActivityType(str, enum.Enum):
    RUNNING = "running"
    SPRINTING = "sprinting"
    JUMPING = "jumping"
    SQUATTING = "squatting"
    LANDING = "landing"
    CUTTING = "cutting"


class LinkType(str, enum.Enum):
    """What kind of professional relationship connects a staff user to an
    athlete. Access to an athlete's data for coach/physio/scientist routes is
    gated on a matching row existing here - not just on role."""
    COACH = "coach"
    PHYSIOTHERAPIST = "physiotherapist"
    SPORTS_SCIENTIST = "sports_scientist"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.ATHLETE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    athlete_profile: Mapped["AthleteProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    coach_profile: Mapped["CoachProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    physio_profile: Mapped["PhysiotherapistProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    scientist_profile: Mapped["SportsScientistProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class CoachProfile(Base):
    __tablename__ = "coach_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    sport: Mapped[str] = mapped_column(String, nullable=False)
    specialization: Mapped[str] = mapped_column(String, nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    organization: Mapped[str] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship(back_populates="coach_profile")


class PhysiotherapistProfile(Base):
    __tablename__ = "physiotherapist_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    qualification: Mapped[str] = mapped_column(String, nullable=True)
    specialization: Mapped[str] = mapped_column(String, nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    clinic: Mapped[str] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship(back_populates="physio_profile")


class SportsScientistProfile(Base):
    __tablename__ = "sports_scientist_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    institution: Mapped[str] = mapped_column(String, nullable=True)
    research_area: Mapped[str] = mapped_column(String, nullable=True)
    specialization: Mapped[str] = mapped_column(String, nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="scientist_profile")


class AthleteLink(Base):
    """Grants a coach/physio/scientist read access to one athlete's data.
    Created when that professional adds the athlete by email - this is the
    real access-control boundary enforced by every non-athlete router."""
    __tablename__ = "athlete_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    professional_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    athlete_id: Mapped[str] = mapped_column(ForeignKey("athlete_profiles.id"), nullable=False)
    link_type: Mapped[LinkType] = mapped_column(Enum(LinkType), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ClinicalNote(Base):
    """Real free-text rehab notes a physiotherapist logs against an athlete -
    used instead of a fabricated 'recovery %' that no pipeline computes."""
    __tablename__ = "clinical_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    physio_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    athlete_id: Mapped[str] = mapped_column(ForeignKey("athlete_profiles.id"), nullable=False)
    phase: Mapped[str] = mapped_column(String, nullable=False)  # mobility / strength / return_to_sport
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    sport: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[str] = mapped_column(String, nullable=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)

    # Historical injury factors - directly feeds the risk formula's 20% term.
    previous_injury_count: Mapped[int] = mapped_column(Integer, default=0)
    # Days since most recent injury; None = no prior injury.
    days_since_last_injury: Mapped[int] = mapped_column(Integer, nullable=True)
    current_pain_flag: Mapped[bool] = mapped_column(Boolean, default=False)

    # Training load factors - feeds the 15% term.
    weekly_training_hours: Mapped[float] = mapped_column(Float, default=0.0)
    # Acute:chronic workload ratio if the athlete/coach supplies it (1.0 = baseline).
    # Left null when unknown - the risk engine falls back to weekly_training_hours only.
    acute_chronic_ratio: Mapped[float] = mapped_column(Float, nullable=True)

    user: Mapped["User"] = relationship(back_populates="athlete_profile")
    videos: Mapped[list["VideoAnalysis"]] = relationship(back_populates="athlete", cascade="all, delete-orphan")


class VideoAnalysis(Base):
    __tablename__ = "video_analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    athlete_id: Mapped[str] = mapped_column(ForeignKey("athlete_profiles.id"), nullable=False)

    activity_type: Mapped[ActivityType] = mapped_column(Enum(ActivityType), nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    stored_path: Mapped[str] = mapped_column(String, nullable=False)

    status: Mapped[VideoStatus] = mapped_column(Enum(VideoStatus), default=VideoStatus.UPLOADED)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    fps_sampled: Mapped[float] = mapped_column(Float, nullable=True)
    frame_count_sampled: Mapped[int] = mapped_column(Integer, nullable=True)
    frames_with_pose_detected: Mapped[int] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Raw per-frame keypoints + derived biomechanics, stored as JSON so the
    # exact time series is always available for re-scoring/audit without
    # re-running pose estimation.
    pose_frames: Mapped[dict] = mapped_column(JSON, nullable=True)
    biomechanics: Mapped[dict] = mapped_column(JSON, nullable=True)
    risk_assessment: Mapped[dict] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[dict] = mapped_column(JSON, nullable=True)

    athlete: Mapped["AthleteProfile"] = relationship(back_populates="videos")
