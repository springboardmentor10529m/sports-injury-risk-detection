import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class RoleEnum(str, enum.Enum):
    ATHLETE = "Athlete"
    COACH = "Coach"
    PHYSIOTHERAPIST = "Physiotherapist"
    SPORTS_SCIENTIST = "Sports Scientist"
    ADMINISTRATOR = "Administrator"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth-only users
    full_name = Column(String(255), nullable=False)
    role = Column(
        SQLEnum(RoleEnum, name="user_role_enum", native_enum=False),
        nullable=False,
        default=RoleEnum.ATHLETE,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # OAuth Provider Tracking
    oauth_provider = Column(String(50), nullable=True)  # e.g., 'google', 'local'
    oauth_id = Column(String(255), nullable=True, index=True)

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
    athlete_profile = relationship(
        "AthleteProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    recorded_injuries = relationship(
        "InjuryRecord",
        back_populates="recorder",
        foreign_keys="[InjuryRecord.recorded_by_id]",
    )
    recorded_assessments = relationship(
        "PhysicalAssessment",
        back_populates="assessor",
        foreign_keys="[PhysicalAssessment.assessor_id]",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
