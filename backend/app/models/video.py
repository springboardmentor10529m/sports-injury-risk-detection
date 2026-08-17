import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class VideoAnalysis(Base):
    __tablename__ = "video_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    risk_score = Column(Float, nullable=True)  # e.g., 0 to 100%
    risk_status = Column(String(50), nullable=True)  # Low, Moderate, High
    created_at = Column(DateTime(timezone=True), server_default=func.now())
