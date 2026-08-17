import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("videos.video_id"),
        nullable=False
    )

    athlete_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("athletes.athlete_id"),
        nullable=False
    )

    knee_valgus: Mapped[float | None] = mapped_column(Float)
    hip_stability: Mapped[float | None] = mapped_column(Float)
    trunk_lean: Mapped[float | None] = mapped_column(Float)
    stride_length: Mapped[float | None] = mapped_column(Float)
    joint_alignment: Mapped[float | None] = mapped_column(Float)
    symmetry_score: Mapped[float | None] = mapped_column(Float)
    fatigue_score: Mapped[float | None] = mapped_column(Float)
    movement_quality: Mapped[float | None] = mapped_column(Float)

    overall_risk_score: Mapped[float | None] = mapped_column(
        Float
    )

    risk_level: Mapped[str | None] = mapped_column(
        String
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )