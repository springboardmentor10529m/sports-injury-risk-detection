import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(Text, nullable=False)
    role = Column(String(50), nullable=False)  # athlete, coach, physiotherapist, admin
    phone = Column(String(50), nullable=True)
    profile_image = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    athlete_profile = relationship("Athlete", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.user_id"), unique=True, nullable=False)
    sport = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    training_load = Column(Float, nullable=True, default=0.0)
    flexibility = Column(Float, nullable=True)
    strength = Column(Float, nullable=True)
    balance = Column(Float, nullable=True)
    endurance = Column(Float, nullable=True)
    coach_notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="athlete_profile")
    videos = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")
    injury_predictions = relationship("InjuryPrediction", back_populates="athlete", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    video_id = Column(String(36), primary_key=True, default=generate_uuid)
    athlete_id = Column(String(36), ForeignKey("athletes.athlete_id"), nullable=False)
    activity = Column(String(100), nullable=True)  # e.g., Squat, Jump
    video_url = Column(Text, nullable=False)       # Path/URL where file is stored
    duration = Column(Float, nullable=True)
    fps = Column(Integer, nullable=True)
    resolution = Column(String(50), nullable=True)
    quality_score = Column(Float, nullable=True)
    processing_status = Column(String(50), default="Uploaded")  # Uploaded, Validated, Preprocessed, Failed
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    athlete = relationship("Athlete", back_populates="videos")
    analysis = relationship("BiomechanicsAnalysis", back_populates="video", uselist=False, cascade="all, delete-orphan")
    injury_prediction = relationship("InjuryPrediction", back_populates="video", uselist=False, cascade="all, delete-orphan")

class BiomechanicsAnalysis(Base):
    __tablename__ = "biomechanics_analyses"

    analysis_id = Column(String(36), primary_key=True, default=generate_uuid)
    video_id = Column(String(36), ForeignKey("videos.video_id"), unique=True, nullable=False)
    
    # Biomechanical Aggregated Metrics
    joint_angles = Column(Text, nullable=True)          # JSON string containing max/min/average joint angles
    range_of_motion = Column(Text, nullable=True)       # JSON string containing ROM per joint
    symmetry_score = Column(Float, nullable=True)        # Left/Right symmetry score (0-100)
    trunk_lean = Column(Float, nullable=True)            # Max trunk lean angle in degrees
    knee_valgus_detected = Column(String(50), nullable=True) # "Yes", "No", "Borderline"
    balance_score = Column(Float, nullable=True)        # Lateral body stability score (0-10)
    movement_quality_score = Column(Float, nullable=True) # Overall movement quality score (0-10)
    risk_level = Column(String(50), nullable=True)      # "Low", "Moderate", "High", "Critical"
    
    feedback = Column(Text, nullable=True)              # Automated corrective suggestions
    annotated_video_url = Column(Text, nullable=True)   # Relative path to annotated video file
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    video = relationship("Video", back_populates="analysis")


class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id = Column(String(36), primary_key=True, default=generate_uuid)
    athlete_id = Column(String(36), ForeignKey("athletes.athlete_id"), nullable=False)
    video_id = Column(String(36), ForeignKey("videos.video_id"), unique=True, nullable=False)

    # Predicted risks (probabilities)
    acl_risk_prob = Column(Float, nullable=False)
    hamstring_risk_prob = Column(Float, nullable=False)
    ankle_risk_prob = Column(Float, nullable=False)
    shoulder_risk_prob = Column(Float, nullable=False)
    back_risk_prob = Column(Float, nullable=False)

    # Weighted scoring results
    overall_risk_score = Column(Float, nullable=False)
    risk_category = Column(String(50), nullable=False)  # "Low", "Moderate", "High", "Critical"
    anomaly_score = Column(Float, nullable=False)        # Anomaly dev score (0.0 - 1.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    athlete = relationship("Athlete", back_populates="injury_predictions")
    video = relationship("Video", back_populates="injury_prediction")


