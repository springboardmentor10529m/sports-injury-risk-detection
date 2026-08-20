import uuid
import enum

from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Integer, Float, JSON, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ATHLETE = "athlete"
    COACH = "coach"
    PHYSIOTHERAPIST = "physiotherapist"
    SPORTS_SCIENTIST = "sports_scientist"
    ADMINISTRATOR = "administrator"


class User(Base):
    __tablename__ = "users"

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String)
    profile_image = Column(Text)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    athlete_profile = relationship("Athlete", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    sport = Column(String, nullable=False)
    position = Column(String)
    age = Column(Integer)
    height = Column(Float)  # in cm
    weight = Column(Float)  # in kg
    training_load = Column(Float, default=0.0)
    flexibility = Column(Float, default=0.0)
    strength = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    endurance = Column(Float, default=0.0)
    coach_notes = Column(Text)

    # Relationships
    user = relationship("User", back_populates="athlete_profile")
    injury_history = relationship("InjuryHistory", back_populates="athlete", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="athlete", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="athlete", cascade="all, delete-orphan")
    performance_records = relationship("PerformanceRecord", back_populates="athlete", cascade="all, delete-orphan")


class InjuryHistory(Base):
    __tablename__ = "injury_history"

    injury_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    injury_type = Column(String, nullable=False)
    body_part = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # Low, Moderate, High
    injury_date = Column(Date, nullable=False)
    recovery_date = Column(Date)
    remarks = Column(Text)

    # Relationships
    athlete = relationship("Athlete", back_populates="injury_history")


class Video(Base):
    __tablename__ = "videos"

    video_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    activity = Column(String)
    video_url = Column(Text, nullable=False)  # stores filepath
    duration = Column(Float)
    fps = Column(Integer)
    resolution = Column(String)
    quality_score = Column(Float)
    processing_status = Column(String, default="processing")  # processing, completed, failed
    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    athlete = relationship("Athlete", back_populates="videos")
    analysis_result = relationship("AnalysisResult", back_populates="video", uselist=False, cascade="all, delete-orphan")
    pose_data = relationship("PoseData", back_populates="video", uselist=False, cascade="all, delete-orphan")
    ai_logs = relationship("AiLog", back_populates="video", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    knee_valgus = Column(Float)
    hip_stability = Column(Float)
    trunk_lean = Column(Float)
    stride_length = Column(Float)
    joint_alignment = Column(Float)
    symmetry_score = Column(Float)
    fatigue_score = Column(Float)
    movement_quality = Column(Float)
    overall_risk_score = Column(Float)
    risk_level = Column(String)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    video = relationship("Video", back_populates="analysis_result")
    athlete = relationship("Athlete", back_populates="analysis_results")
    injury_prediction = relationship("InjuryPrediction", back_populates="analysis_result", uselist=False, cascade="all, delete-orphan")


class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analysis_results.analysis_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    acl_risk = Column(Float)
    hamstring_risk = Column(Float)
    ankle_risk = Column(Float)
    shoulder_risk = Column(Float)
    lower_back_risk = Column(Float)
    overuse_risk = Column(Float)

    # Relationships
    analysis_result = relationship("AnalysisResult", back_populates="injury_prediction")
    recommendation = relationship("Recommendation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    prediction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("injury_predictions.prediction_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    exercise = Column(Text)
    mobility = Column(Text)
    strengthening = Column(Text)
    recovery = Column(Text)
    training_modification = Column(Text)

    # Relationships
    prediction = relationship("InjuryPrediction", back_populates="recommendation")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="notifications")


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    report_type = Column(String, nullable=False)
    generated_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL")
    )
    file_path = Column(Text, nullable=False)
    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    athlete = relationship("Athlete", back_populates="reports")


class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    record_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    activity = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    remarks = Column(Text)
    recorded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    athlete = relationship("Athlete", back_populates="performance_records")


class PoseData(Base):
    __tablename__ = "pose_data"

    pose_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    athlete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id", ondelete="CASCADE"),
        nullable=False
    )
    frames = Column(JSON, nullable=False)
    keypoints = Column(JSON, nullable=False)
    skeleton = Column(JSON, nullable=False)

    # Relationships
    video = relationship("Video", back_populates="pose_data")


class AiLog(Base):
    __tablename__ = "ai_logs"

    log_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False
    )
    model_name = Column(String, nullable=False)
    inference_time = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    output = Column(Text)

    # Relationships
    video = relationship("Video", back_populates="ai_logs")


class MovementAnomaly(Base):
    __tablename__ = "movement_anomalies"

    anomaly_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analysis_results.analysis_id", ondelete="CASCADE"),
        nullable=False
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False
    )
    timestamp_start = Column(Float, nullable=False)
    timestamp_end = Column(Float, nullable=False)
    issue_type = Column(String, nullable=False)  # e.g., Knee Valgus Collapse, Trunk Overlean, Asymmetric Dip
    severity = Column(String, nullable=False)  # Low, Moderate, High, Critical
    confidence = Column(Float, nullable=False, default=0.85)
    affected_joints = Column(String)  # e.g., "Left Knee, Right Hip"
    description = Column(Text)


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    job_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False
    )
    status = Column(String, nullable=False, default="QUEUED")  # QUEUED, PROCESSING, COMPLETED, FAILED
    progress = Column(Float, default=0.0)
    current_step = Column(String, default="QUEUED")
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL")
    )
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String)
    ip_address = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())