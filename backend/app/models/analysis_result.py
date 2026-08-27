"""
app/models/analysis_result.py
------------------------------
SQLAlchemy model for analysis_results table.

Tracks the full analysis lifecycle:
  PENDING → PROCESSING → COMPLETED | FAILED

Video metadata captured during OpenCV processing (fps, frame_count, etc.)
is stored here alongside the per-frame pose data (in pose_landmarks).

Existing biomechanical score columns are preserved for future ML integration.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Analysis status constants ─────────────────────────────────────────────────
# Using plain strings (not a DB ENUM) for simplicity and easy extension.
ANALYSIS_STATUS_PENDING    = "PENDING"
ANALYSIS_STATUS_PROCESSING = "PROCESSING"
ANALYSIS_STATUS_COMPLETED  = "COMPLETED"
ANALYSIS_STATUS_FAILED     = "FAILED"


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

    # ── Analysis lifecycle ────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ANALYSIS_STATUS_PENDING,
        index=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ── Video metadata (populated during OpenCV processing) ───────────────────
    fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    frame_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frames_processed: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Biomechanical scores (reserved for future ML model) ───────────────────
    knee_valgus: Mapped[float | None] = mapped_column(Float)
    hip_stability: Mapped[float | None] = mapped_column(Float)
    trunk_lean: Mapped[float | None] = mapped_column(Float)
    stride_length: Mapped[float | None] = mapped_column(Float)
    joint_alignment: Mapped[float | None] = mapped_column(Float)
    symmetry_score: Mapped[float | None] = mapped_column(Float)
    fatigue_score: Mapped[float | None] = mapped_column(Float)
    movement_quality: Mapped[float | None] = mapped_column(Float)

    overall_risk_score: Mapped[float | None] = mapped_column(Float)
    risk_level: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # ── Relationship ──────────────────────────────────────────────────────────
    # Lazy-loaded to avoid pulling thousands of landmark rows on every query.
    pose_landmarks: Mapped[list["PoseLandmark"]] = relationship(  # noqa: F821
        "PoseLandmark",
        back_populates="analysis",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )