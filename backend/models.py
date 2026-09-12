import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, Date, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    ATHLETE = "ATHLETE"
    COACH = "COACH"
    PHYSIOTHERAPIST = "PHYSIOTHERAPIST"
    SPORTS_SCIENTIST = "SPORTS_SCIENTIST"
    ADMIN = "ADMIN"

# 1. users
class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(Text, nullable=True)
    role = Column(String, default=UserRole.ATHLETE.value)
    phone = Column(String, nullable=True)
    profile_image = Column(Text, nullable=True)
    google_id = Column(String, nullable=True, index=True)
    auth_provider = Column(String, default="local")  # "local", "google"
    created_at = Column(DateTime, default=datetime.utcnow)

    athlete_profile = relationship("Athlete", back_populates="user", uselist=False, cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

# 2. athletes
class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, unique=True)
    sport = Column(String, nullable=True, default="General")
    position = Column(String, nullable=True, default="Athlete")
    age = Column(Integer, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    training_load = Column(Float, nullable=True, default=0.0)
    flexibility = Column(Float, nullable=True, default=0.0)
    strength = Column(Float, nullable=True, default=0.0)
    balance = Column(Float, nullable=True, default=0.0)
    endurance = Column(Float, nullable=True, default=0.0)
    coach_notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="athlete_profile")
    videos = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")
    injury_histories = relationship("InjuryHistory", back_populates="athlete", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="athlete", cascade="all, delete-orphan")
    reports = relationship("Report", foreign_keys="Report.athlete_id", back_populates="athlete", cascade="all, delete-orphan")
    performance_records = relationship("PerformanceRecord", back_populates="athlete", cascade="all, delete-orphan")

# 3. injury_history
class InjuryHistory(Base):
    __tablename__ = "injury_history"

    injury_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = Column(String, ForeignKey("athletes.athlete_id"), nullable=False)
    injury_type = Column(String, nullable=False)
    body_part = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    injury_date = Column(Date, nullable=True)
    recovery_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    athlete = relationship("Athlete", back_populates="injury_histories")

# 4. videos
class Video(Base):
    __tablename__ = "videos"

    video_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = Column(String, ForeignKey("athletes.athlete_id"), nullable=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    activity = Column(String, nullable=False, default="General Movement")
    video_url = Column(Text, nullable=False)
    filename = Column(String, nullable=False, default="video.mp4")
    duration = Column(Float, default=0.0)
    fps = Column(Integer, default=0)
    resolution = Column(String, default="0x0")
    quality_score = Column(Float, default=100.0)
    processing_status = Column(String, default="UPLOADED") # UPLOADED, PROCESSING, COMPLETED, FAILED
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Pose Video Processing Pipeline Fields
    processed_video_path = Column(String, nullable=True)
    processed_video_url = Column(String, nullable=True)
    pose_model = Column(String, default="RTMPose-M")
    pose_confidence = Column(Float, default=0.0)
    processed_frames = Column(Integer, default=0)
    valid_pose_frames = Column(Integer, default=0)
    tracked_frames = Column(Integer, default=0)
    analysis_fps = Column(Float, default=0.0)
    analysis_status = Column(String, default="UPLOADED") # UPLOADED, PROCESSING, POSE_DETECTING, POSE_TRACKING, GENERATING_VIDEO, VALIDATING_VIDEO, COMPLETE, FAILED
    pose_status = Column(String, default="PENDING")
    processing_error = Column(Text, nullable=True)
    analysis_completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="videos")
    athlete = relationship("Athlete", back_populates="videos")
    analysis_results = relationship("AnalysisResult", back_populates="video", cascade="all, delete-orphan")

# 5. analysis_results
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String, ForeignKey("videos.video_id"), nullable=False)
    athlete_id = Column(String, ForeignKey("athletes.athlete_id"), nullable=False)
    knee_valgus = Column(Float, default=0.0)
    hip_stability = Column(Float, default=0.0)
    trunk_lean = Column(Float, default=0.0)
    stride_length = Column(Float, default=0.0)
    joint_alignment = Column(Float, default=0.0)
    symmetry_score = Column(Float, default=0.0)
    fatigue_score = Column(Float, default=0.0)
    movement_quality = Column(Float, default=0.0)
    overall_risk_score = Column(Float, default=0.0)
    risk_level = Column(String, default="LOW") # LOW, MODERATE, HIGH, CRITICAL
    confidence = Column(Float, default=0.95)
    bilateral_symmetry = Column(Float, default=0.0)
    biomechanical_summary = Column(Text, nullable=True)
    model_version = Column(String, default="2.0.0-weighted")
    dataset_version = Column(String, default="1.0.0-unified")
    pose_model = Column(String, default="RTMPose-M (ONNX)")
    pose_model_version = Column(String, default="1.0.0-simcc")
    feature_version = Column(String, default="2.0.0-kinematics")
    ml_model_version = Column(String, default="2.0.0-supervised")
    calibrated_ml_probability = Column(Float, default=0.0)
    screening_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="analysis_results")
    athlete = relationship("Athlete", back_populates="analysis_results")
    injury_prediction = relationship("InjuryPrediction", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    risk_factors = relationship("RiskFactor", back_populates="analysis", cascade="all, delete-orphan")

# 6. injury_predictions
class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analysis_results.analysis_id"), nullable=False, unique=True)
    acl_risk = Column(Float, default=0.0)
    hamstring_risk = Column(Float, default=0.0)
    ankle_risk = Column(Float, default=0.0)
    shoulder_risk = Column(Float, default=0.0)
    lower_back_risk = Column(Float, default=0.0)
    overuse_risk = Column(Float, default=0.0)
    calibrated_probability = Column(Float, default=0.0)
    ml_model_name = Column(String, default="Calibrated-XGBoost")

    analysis = relationship("AnalysisResult", back_populates="injury_prediction")
    recommendation = relationship("Recommendation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

# 7. recommendations
class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id = Column(String, ForeignKey("injury_predictions.prediction_id"), nullable=False, unique=True)
    exercise = Column(Text, nullable=True)
    mobility = Column(Text, nullable=True)
    strengthening = Column(Text, nullable=True)
    recovery = Column(Text, nullable=True)
    training_modification = Column(Text, nullable=True)
    detailed_json = Column(Text, nullable=True)

    prediction = relationship("InjuryPrediction", back_populates="recommendation")

# 8. notifications
class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="INFO") # INFO, ALERT, WARNING, SYSTEM
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

# 9. reports
class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = Column(String, ForeignKey("athletes.athlete_id"), nullable=False)
    report_type = Column(String, nullable=False, default="FULL_ASSESSMENT")
    generated_by = Column(String, ForeignKey("users.user_id"), nullable=False)
    file_path = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    athlete = relationship("Athlete", foreign_keys=[athlete_id], back_populates="reports")
    generator = relationship("User", foreign_keys=[generated_by])

# 10. performance_records
class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    record_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = Column(String, ForeignKey("athletes.athlete_id"), nullable=False)
    activity = Column(String, nullable=False)
    score = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    athlete = relationship("Athlete", back_populates="performance_records")

# 11. analysis_jobs
class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String, ForeignKey("videos.video_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    status = Column(String, default="queued") # queued, processing, pose_estimation, tracking, biomechanics, rendering, completed, failed
    progress = Column(Float, default=0.0)
    stage = Column(String, default="Queued")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    skeleton_video_url = Column(Text, nullable=True)

    video = relationship("Video")
    user = relationship("User")
    pose_frames = relationship("PoseFrame", back_populates="analysis", cascade="all, delete-orphan")
    biomechanics_frames = relationship("BiomechanicsFrame", back_populates="analysis", cascade="all, delete-orphan")
    movement_anomalies = relationship("MovementAnomaly", back_populates="analysis", cascade="all, delete-orphan")

# 12. pose_frames
class PoseFrame(Base):
    __tablename__ = "pose_frames"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analysis_jobs.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    person_id = Column(Integer, default=1)
    average_confidence = Column(Float, default=0.0)
    keypoints_json = Column(Text, nullable=False)
    smoothed_keypoints_json = Column(Text, nullable=False)

    analysis = relationship("AnalysisJob", back_populates="pose_frames")

# 13. biomechanics_frames
class BiomechanicsFrame(Base):
    __tablename__ = "biomechanics_frames"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analysis_jobs.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    joint_angles_json = Column(Text, nullable=False)
    kinematics_json = Column(Text, nullable=False)
    symmetry_json = Column(Text, nullable=False)

    analysis = relationship("AnalysisJob", back_populates="biomechanics_frames")

# 14. risk_factors
class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analysis_results.analysis_id"), nullable=False)
    factor = Column(String, nullable=False)
    body_region = Column(String, nullable=False)
    severity = Column(String, nullable=False) # LOW, MODERATE, HIGH, CRITICAL
    contribution = Column(Float, default=0.0)
    timestamp = Column(Float, nullable=True)
    frame = Column(Integer, nullable=True)

    analysis = relationship("AnalysisResult", back_populates="risk_factors")

# 15. movement_anomalies
class MovementAnomaly(Base):
    __tablename__ = "movement_anomalies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey("analysis_jobs.id"), nullable=False)
    frame = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    type = Column(String, nullable=False)
    score = Column(Float, default=0.0)
    severity = Column(String, nullable=False) # LOW, MODERATE, HIGH, CRITICAL
    body_region = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)

    analysis = relationship("AnalysisJob", back_populates="movement_anomalies")


