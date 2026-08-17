import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Video(Base):
    __tablename__ = "videos"

    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    athlete_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id"),
        nullable=False
    )

    activity: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    video_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    duration: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    fps: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    resolution: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    quality_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    processing_status: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )