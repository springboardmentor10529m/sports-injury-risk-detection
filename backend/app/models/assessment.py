from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    Date,
    DateTime,
    JSON,
    Uuid,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class PhysicalAssessment(Base):
    __tablename__ = "physical_assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessor_id = Column(
        Uuid,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    assessment_date = Column(Date, nullable=False, index=True)
    assessment_type = Column(
        String(100),
        nullable=False,
        default="Biomechanical Screening",
    )  # e.g., "Pre-Season Baseline", "Return to Play", "Functional Movement"
    
    mobility_score = Column(Float, nullable=True)     # 0.0 - 100.0
    strength_score = Column(Float, nullable=True)     # 0.0 - 100.0
    balance_symmetry = Column(Float, nullable=True)   # 0.0 - 100.0 (Left vs Right symmetry ratio/score)
    
    movement_notes = Column(Text, nullable=True)
    assessment_data = Column(JSON, nullable=True)      # Extensible metrics (joint angles, jump landing deviations, FMS scores)
    recommendations = Column(Text, nullable=True)

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

    # Relationships
    athlete = relationship("AthleteProfile", back_populates="assessments")
    assessor = relationship(
        "User",
        back_populates="recorded_assessments",
        foreign_keys=[assessor_id],
    )

    def __repr__(self) -> str:
        return f"<PhysicalAssessment id={self.id} athlete_id={self.athlete_id} date='{self.assessment_date}' type='{self.assessment_type}'>"
