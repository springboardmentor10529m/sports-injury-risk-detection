from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class TrainingLoad(Base):
    __tablename__ = "training_loads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    session_date = Column(Date, nullable=False, index=True)
    activity_type = Column(String(100), nullable=False)  # e.g. "Match", "Tactical", "Strength & Conditioning", "Cardio"
    duration_minutes = Column(Integer, nullable=False)
    rpe_score = Column(Integer, nullable=False)          # Rate of Perceived Exertion (1 - 10)
    calculated_load = Column(Float, nullable=False)      # Session RPE * Duration (Arbitrary Units AU)

    heart_rate_avg = Column(Integer, nullable=True)
    heart_rate_max = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("rpe_score >= 1 AND rpe_score <= 10", name="chk_rpe_score_range"),
        CheckConstraint("duration_minutes > 0", name="chk_duration_positive"),
    )

    # Relationships
    athlete = relationship("AthleteProfile", back_populates="training_loads")

    def __repr__(self) -> str:
        return f"<TrainingLoad id={self.id} athlete_id={self.athlete_id} date='{self.session_date}' load={self.calculated_load}>"
