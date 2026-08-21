"""Athlete schemas."""
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.athlete import DominantSide, InjuryType, Severity

class AthleteProfileBase(BaseModel):
    sport: str
    position: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    dominant_side: Optional[DominantSide] = None
    date_of_birth: Optional[date] = None

class AthleteProfileCreate(AthleteProfileBase):
    user_id: UUID
    team_id: Optional[UUID] = None

class AthleteProfileUpdate(AthleteProfileBase):
    team_id: Optional[UUID] = None

class AthleteProfileResponse(AthleteProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    team_id: Optional[UUID] = None

class InjuryHistoryBase(BaseModel):
    injury_type: InjuryType
    body_region: str
    severity: Severity
    date_occurred: date
    recovery_duration_days: Optional[int] = None
    is_recurring: bool = False
    notes: Optional[str] = None

class InjuryHistoryCreate(InjuryHistoryBase):
    pass

class InjuryHistoryResponse(InjuryHistoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID

class TrainingLoadBase(BaseModel):
    date: date
    session_type: str
    duration_minutes: int
    intensity: int
    rpe: float
    notes: Optional[str] = None

class TrainingLoadCreate(TrainingLoadBase):
    pass

class TrainingLoadResponse(TrainingLoadBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    athlete_id: UUID

class TeamBase(BaseModel):
    name: str
    sport: str

class TeamCreate(TeamBase):
    coach_id: UUID

class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    coach_id: UUID
