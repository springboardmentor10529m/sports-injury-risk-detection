"""Athlete and team related models."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Uuid,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from app.db.postgresql import Base


class DominantSide(StrEnum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    AMBIDEXTROUS = "AMBIDEXTROUS"


class InjuryType(StrEnum):
    ACL = "ACL"
    HAMSTRING = "HAMSTRING"
    ANKLE_SPRAIN = "ANKLE_SPRAIN"
    SHOULDER = "SHOULDER"
    LOWER_BACK = "LOWER_BACK"
    OVERUSE = "OVERUSE"


class Severity(StrEnum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"


class Team(Base):
    __tablename__ = "teams"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    sport = Column(String(100))
    coach_id = Column(Uuid, ForeignKey("users.id"))


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), unique=True)
    sport = Column(String(100))
    position = Column(String(100))
    team_id = Column(Uuid, ForeignKey("teams.id"), nullable=True)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    dominant_side = Column(SAEnum(DominantSide))
    date_of_birth = Column(Date)

    user = relationship("User", back_populates="athlete_profile")
    team = relationship("Team")
    injury_history = relationship("InjuryHistory", back_populates="athlete")
    training_loads = relationship("TrainingLoad", back_populates="athlete")
    video_sessions = relationship("VideoSession", back_populates="athlete")


class TeamMembership(Base):
    __tablename__ = "team_memberships"
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"), primary_key=True)
    team_id = Column(Uuid, ForeignKey("teams.id"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.utcnow)


class InjuryHistory(Base):
    __tablename__ = "injury_histories"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"))
    injury_type = Column(SAEnum(InjuryType))
    body_region = Column(String(100))
    severity = Column(SAEnum(Severity))
    date_occurred = Column(Date)
    recovery_duration_days = Column(Integer)
    is_recurring = Column(Boolean, default=False)
    notes = Column(String)

    athlete = relationship("AthleteProfile", back_populates="injury_history")


class TrainingLoad(Base):
    __tablename__ = "training_loads"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    athlete_id = Column(Uuid, ForeignKey("athlete_profiles.id"))
    date = Column(Date)
    session_type = Column(String(100))
    duration_minutes = Column(Integer)
    intensity = Column(Integer)  # 1-10
    rpe = Column(Float)
    notes = Column(String)

    athlete = relationship("AthleteProfile", back_populates="training_loads")
