from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    Uuid,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Uuid,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    athlete_code = Column(String(50), unique=True, index=True, nullable=False)
    sport_type = Column(String(100), nullable=False)
    position = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    dominant_side = Column(String(20), nullable=True)  # 'Left', 'Right', 'Ambidextrous'
    status = Column(String(50), nullable=False, default="Active")  # 'Active', 'Injured', 'Rehabilitation'
    emergency_contact = Column(String(255), nullable=True)

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
    user = relationship("User", back_populates="athlete_profile")
    injuries = relationship(
        "InjuryRecord",
        back_populates="athlete",
        cascade="all, delete-orphan",
        order_by="desc(InjuryRecord.date_occurred)",
    )
    training_loads = relationship(
        "TrainingLoad",
        back_populates="athlete",
        cascade="all, delete-orphan",
        order_by="desc(TrainingLoad.session_date)",
    )
    assessments = relationship(
        "PhysicalAssessment",
        back_populates="athlete",
        cascade="all, delete-orphan",
        order_by="desc(PhysicalAssessment.assessment_date)",
    )

    def __repr__(self) -> str:
        return f"<AthleteProfile id={self.id} code='{self.athlete_code}' sport='{self.sport_type}'>"
