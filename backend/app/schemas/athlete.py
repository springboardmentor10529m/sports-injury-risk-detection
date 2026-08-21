"""Athlete schemas."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.athlete import DominantSide, InjuryType, Severity


class AthleteProfileBase(BaseModel):
    sport: str
    position: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    dominant_side: DominantSide | None = None
    date_of_birth: date | None = None


class AthleteProfileCreate(AthleteProfileBase):
    user_id: UUID
    team_id: UUID | None = None


class AthleteProfileUpdate(AthleteProfileBase):
    team_id: UUID | None = None


class AthleteProfileResponse(AthleteProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    team_id: UUID | None = None


class InjuryHistoryBase(BaseModel):
    injury_type: InjuryType
    body_region: str
    severity: Severity
    date_occurred: date
    recovery_duration_days: int | None = None
    is_recurring: bool = False
    notes: str | None = None


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
    notes: str | None = None


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
