from sqlalchemy import Column, String, Float, Text, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from database import Base


# -------------------------
# USER MODEL
# -------------------------

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    role = Column(String, nullable=False)
    phone = Column(String)
    profile_image = Column(Text)
    created_at = Column(DateTime)


# -------------------------
# ATHLETE MODEL
# -------------------------

class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)

    sport = Column(String, nullable=False)
    position = Column(String, nullable=False)

    age = Column(Integer)
    height = Column(Float)
    weight = Column(Float)

    training_load = Column(Float)
    flexibility = Column(Float)
    strength = Column(Float)
    balance = Column(Float)
    endurance = Column(Float)

    coach_notes = Column(Text)


# -------------------------
# PERFORMANCE RECORD MODEL
# -------------------------

class PerformanceRecord(Base):
    __tablename__ = "performance_records"

    record_id = Column(UUID(as_uuid=True), primary_key=True)
    athlete_id = Column(UUID(as_uuid=True), nullable=False)

    activity = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    remarks = Column(Text)

    recorded_at = Column(DateTime)


# -------------------------
# VIDEO MODEL
# -------------------------

class Video(Base):
    __tablename__ = "videos"

    video_id = Column(UUID(as_uuid=True), primary_key=True)
    athlete_id = Column(UUID(as_uuid=True), nullable=False)

    activity = Column(String, nullable=False)
    video_url = Column(Text)

    duration = Column(Float)
    fps = Column(Integer)
    resolution = Column(String)

    quality_score = Column(Float)
    processing_status = Column(String)

    uploaded_at = Column(DateTime)


    # -------------------------
# ANALYSIS RESULT MODEL
# -------------------------

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id = Column(UUID(as_uuid=True), primary_key=True)

    video_id = Column(UUID(as_uuid=True), nullable=False)
    athlete_id = Column(UUID(as_uuid=True), nullable=False)

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

    created_at = Column(DateTime)

    # -------------------------
# RECOMMENDATION MODEL
# -------------------------

class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id = Column(UUID(as_uuid=True), primary_key=True)

    prediction_id = Column(UUID(as_uuid=True), nullable=False)

    exercise = Column(Text)
    mobility = Column(Text)
    strengthening = Column(Text)
    recovery = Column(Text)
    training_modification = Column(Text)
    # -------------------------
# INJURY PREDICTION MODEL
# -------------------------

class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id = Column(UUID(as_uuid=True), primary_key=True)

    analysis_id = Column(UUID(as_uuid=True), nullable=False)

    acl_risk = Column(Float)
    hamstring_risk = Column(Float)
    ankle_risk = Column(Float)
    shoulder_risk = Column(Float)
    lower_back_risk = Column(Float)
    overuse_risk = Column(Float)