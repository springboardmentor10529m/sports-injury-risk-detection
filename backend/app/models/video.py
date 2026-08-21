"""Video session model."""
import uuid
from datetime import datetime
import enum
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Enum as SAEnum, Uuid
from sqlalchemy.orm import relationship
from app.db.postgresql import Base


class VideoStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PREPROCESSING = "PREPROCESSING"
    PROCESSING = "PROCESSING"
    ANALYZED = "ANALYZED"
    FAILED = "FAILED"


class VideoSession(Base):
    __tablename__ = "video_sessions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), nullable=False)
    uploaded_by = Column(Uuid, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    storage_path = Column(String(1024), nullable=True)
    storage_url = Column(String(1024), nullable=True)
    content_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    status = Column(SAEnum(VideoStatus), default=VideoStatus.UPLOADED)
    sport_type = Column(String(100), nullable=True)
    fps = Column(Float, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    resolution = Column(String(20), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="video_sessions")
    uploader = relationship("User")
