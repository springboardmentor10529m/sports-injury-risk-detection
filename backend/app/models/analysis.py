"""Analysis, pose, kinematics, anomaly detection, and audit models."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from app.db.postgresql import Base


class RiskCategory(StrEnum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnomalySeverity(StrEnum):
    NORMAL = "NORMAL"
    MILD_DEVIATION = "MILD_DEVIATION"
    MODERATE_DEVIATION = "MODERATE_DEVIATION"
    HIGH_DEVIATION = "HIGH_DEVIATION"


class PoseSequence(Base):
    """15-keypoint landmark timeseries sequence extracted from a video session."""

    __tablename__ = "pose_sequences"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    video_session_id = Column(Uuid, ForeignKey("video_sessions.id"), unique=True, nullable=False)
    fps = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    frame_count = Column(Integer, nullable=False)
    smoothing_method = Column(String(50), default="SAVITZKY_GOLAY")
    frames = Column(JSON, nullable=False)  # List of {frame_index, timestamp_seconds, raw_landmarks, landmarks}
    created_at = Column(DateTime, default=datetime.utcnow)

    video_session = relationship("VideoSession", backref="pose_sequence")


class KinematicAssessment(Base):
    """Computed mathematical joint angles, velocities, accelerations, and asymmetries."""

    __tablename__ = "kinematic_assessments"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    video_session_id = Column(Uuid, ForeignKey("video_sessions.id"), unique=True, nullable=False)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), nullable=False)
    timestamps = Column(JSON, nullable=False)  # List of timestamps in seconds
    joint_angles = Column(JSON, nullable=False)  # Dict of angle curves over time
    angular_velocities = Column(JSON, nullable=False)  # First derivatives
    angular_accelerations = Column(JSON, nullable=False)  # Second derivatives
    asymmetry_metrics = Column(JSON, nullable=False)  # Bilateral asymmetry index statistics
    summary_metrics = Column(JSON, nullable=False)  # Min/Max/Mean/Range per joint
    created_at = Column(DateTime, default=datetime.utcnow)

    video_session = relationship("VideoSession", backref="kinematic_assessment")
    athlete = relationship("AthleteProfile")


class BiomechanicalAnomaly(Base):
    """Individual biomechanical movement deviation event."""

    __tablename__ = "biomechanical_anomalies"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    video_session_id = Column(Uuid, ForeignKey("video_sessions.id"), nullable=False, index=True)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False)
    timestamp_seconds = Column(Float, nullable=True)
    observed_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    deviation = Column(Float, nullable=False)
    z_score = Column(Float, nullable=True)
    severity = Column(String(50), nullable=False, default=AnomalySeverity.NORMAL.value)
    baseline_type = Column(String(100), default="Developmental baseline")
    description = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    video_session = relationship("VideoSession", backref="anomaly_events")
    athlete = relationship("AthleteProfile")


class AnomalyAssessment(Base):
    """Full session biomechanical anomaly and feature summary assessment."""

    __tablename__ = "anomaly_assessments"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    video_session_id = Column(Uuid, ForeignKey("video_sessions.id"), unique=True, nullable=False)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), nullable=False)
    overall_status = Column(String(50), nullable=False, default=AnomalySeverity.NORMAL.value)
    feature_summary = Column(JSON, nullable=False)  # Statistical summary per metric
    metric_deviations = Column(JSON, nullable=False)  # Baseline vs observed deviation maps
    anomalies = Column(JSON, nullable=False)  # Structured anomaly events list
    baseline_metadata = Column(JSON, nullable=False)  # Registry metadata and developmental disclaimer
    created_at = Column(DateTime, default=datetime.utcnow)

    video_session = relationship("VideoSession", backref="anomaly_assessment")
    athlete = relationship("AthleteProfile")


class RiskReport(Base):
    __tablename__ = "risk_reports"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), nullable=False)
    video_session_id = Column(Uuid, ForeignKey("video_sessions.id"), nullable=True)
    assessment_mongo_id = Column(String(24), nullable=True)
    composite_score = Column(Float)
    risk_category = Column(SAEnum(RiskCategory))
    component_scores = Column(JSON)
    generated_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(255))
    ip_address = Column(String(45))
    details = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
