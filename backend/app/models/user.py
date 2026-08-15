import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    Uuid,
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

    user_id = Column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(Text, nullable=True)  # Stores secure password hash; nullable for OAuth-only users
    role = Column(
        SQLEnum(
            RoleEnum,
            name="user_role_enum",
            native_enum=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=RoleEnum.ATHLETE,
    )
    phone = Column(String(50), nullable=True)
    profile_image = Column(Text, nullable=True)

    # Preserved authentication & operational fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
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
        return f"<User user_id={self.user_id} email='{self.email}' role='{self.role}'>"
