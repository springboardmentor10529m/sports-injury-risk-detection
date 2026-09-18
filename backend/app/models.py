import uuid
from datetime import datetime, timezone
from typing import Optional, List
# pyrefly: ignore [missing-import]
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Boolean
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # athlete, coach, physiotherapist, sports_scientist, admin
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    profile_image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    athlete_profile: Mapped[Optional["Athlete"]] = relationship("Athlete", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.user_id"), unique=True, nullable=False)
    sport: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    training_load: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    flexibility: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    balance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    endurance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    coach_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="athlete_profile")
    videos: Mapped[List["Video"]] = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")
    injury_predictions: Mapped[List["InjuryPrediction"]] = relationship("InjuryPrediction", back_populates="athlete", cascade="all, delete-orphan")
    recommendations: Mapped[List["CorrectiveRecommendation"]] = relationship("CorrectiveRecommendation", back_populates="athlete", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    video_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    athlete_id: Mapped[str] = mapped_column(String(36), ForeignKey("athletes.athlete_id"), nullable=False)
    activity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., Squat, Jump
    video_url: Mapped[str] = mapped_column(Text, nullable=False)       # Path/URL where file is stored
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(50), default="Uploaded")  # Uploaded, Validated, Preprocessed, Failed
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    athlete: Mapped[Optional["Athlete"]] = relationship("Athlete", back_populates="videos")
    analysis: Mapped[Optional["BiomechanicsAnalysis"]] = relationship("BiomechanicsAnalysis", back_populates="video", uselist=False, cascade="all, delete-orphan")
    injury_prediction: Mapped[Optional["InjuryPrediction"]] = relationship("InjuryPrediction", back_populates="video", uselist=False, cascade="all, delete-orphan")

class BiomechanicsAnalysis(Base):
    __tablename__ = "biomechanics_analyses"

    analysis_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.video_id"), unique=True, nullable=False)
    
    # Biomechanical Aggregated Metrics
    joint_angles: Mapped[Optional[str]] = mapped_column(Text, nullable=True)          # JSON string containing max/min/average joint angles
    range_of_motion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)       # JSON string containing ROM per joint
    symmetry_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)        # Left/Right symmetry score (0-100)
    trunk_lean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)            # Max trunk lean angle in degrees
    knee_valgus_detected: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # "Yes", "No", "Borderline"
    balance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)        # Lateral body stability score (0-10)
    movement_quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # Overall movement quality score (0-10)
    risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)      # "Low", "Moderate", "High", "Critical"
    
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)              # Automated corrective suggestions
    annotated_video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # Relative path to annotated video file
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    video: Mapped[Optional["Video"]] = relationship("Video", back_populates="analysis")


class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    athlete_id: Mapped[str] = mapped_column(String(36), ForeignKey("athletes.athlete_id"), nullable=False)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.video_id"), unique=True, nullable=False)

    # Predicted risks (probabilities)
    acl_risk_prob: Mapped[float] = mapped_column(Float, nullable=False)
    hamstring_risk_prob: Mapped[float] = mapped_column(Float, nullable=False)
    ankle_risk_prob: Mapped[float] = mapped_column(Float, nullable=False)
    shoulder_risk_prob: Mapped[float] = mapped_column(Float, nullable=False)
    back_risk_prob: Mapped[float] = mapped_column(Float, nullable=False)

    # Weighted scoring results
    overall_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_category: Mapped[str] = mapped_column(String(50), nullable=False)  # "Low", "Moderate", "High", "Critical"
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)        # Anomaly dev score (0.0 - 1.0)

    # ML Classifier Probabilities & 5-Factor Risk Decomposition
    rf_risk_prob: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    xgb_risk_prob: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    factor_kinematics: Mapped[Optional[float]] = mapped_column(Float, nullable=True)     # Max 30 pts
    factor_load: Mapped[Optional[float]] = mapped_column(Float, nullable=True)           # Max 25 pts
    factor_asymmetry: Mapped[Optional[float]] = mapped_column(Float, nullable=True)      # Max 20 pts
    factor_velocity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)       # Max 15 pts
    factor_prior_injury: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # Max 10 pts

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    athlete: Mapped[Optional["Athlete"]] = relationship("Athlete", back_populates="injury_predictions")
    video: Mapped[Optional["Video"]] = relationship("Video", back_populates="injury_prediction")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.user_id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="system")  # high_risk, training_load, recovery, assessment_complete, system
    severity: Mapped[str] = mapped_column(String(50), default="info") # info, warning, critical
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="notifications")


class CorrectiveRecommendation(Base):
    __tablename__ = "corrective_recommendations"

    recommendation_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    athlete_id: Mapped[str] = mapped_column(String(36), ForeignKey("athletes.athlete_id"), nullable=False)
    video_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("videos.video_id"), nullable=True)
    target_injury_risk: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "ACL Injury Risk", "Knee Valgus", "Hamstring Strain"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Mobility") # Mobility, Strengthening, Recovery, Technique
    sets_reps: Mapped[str] = mapped_column(String(100), default="3 sets x 10 reps")
    frequency: Mapped[str] = mapped_column(String(100), default="3x per week")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    # Relationships
    athlete: Mapped[Optional["Athlete"]] = relationship("Athlete", back_populates="recommendations")
