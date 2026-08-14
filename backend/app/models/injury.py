from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class InjuryRecord(Base):
    __tablename__ = "injury_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    injury_type = Column(String(100), nullable=False)  # e.g., "ACL Tear", "Hamstring Strain"
    body_part = Column(String(100), nullable=False)    # e.g., "Knee", "Hamstring", "Ankle"
    side = Column(String(20), nullable=True)           # "Left", "Right", "Bilateral", "N/A"
    severity = Column(String(50), nullable=False)      # "Mild", "Moderate", "Severe", "Critical"
    
    date_occurred = Column(Date, nullable=False, index=True)
    expected_recovery_date = Column(Date, nullable=True)
    actual_return_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="Active")  # "Active", "Recovered", "Rehabilitation"

    diagnosis = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    mechanism_of_injury = Column(Text, nullable=True)  # Biomechanical context e.g. "Non-contact pivot during landing"

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
    athlete = relationship("AthleteProfile", back_populates="injuries")
    recorder = relationship(
        "User",
        back_populates="recorded_injuries",
        foreign_keys=[recorded_by_id],
    )

    def __repr__(self) -> str:
        return f"<InjuryRecord id={self.id} athlete_id={self.athlete_id} type='{self.injury_type}' status='{self.status}'>"
