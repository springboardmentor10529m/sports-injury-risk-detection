from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AthleteCreate(BaseModel):
    """
    Schema for creating an athlete profile.
    """

    sport: Optional[str] = Field(
        default=None,
        max_length=100,
        examples=["Football"],
    )

    position: Optional[str] = Field(
        default=None,
        max_length=100,
        examples=["Midfielder"],
    )

    age: Optional[int] = Field(
        default=None,
        ge=0,
        le=120,
    )

    height: Optional[float] = Field(
        default=None,
        gt=0,
        le=300,
        description="Height in centimeters",
    )

    weight: Optional[float] = Field(
        default=None,
        gt=0,
        le=500,
        description="Weight in kilograms",
    )

    training_load: Optional[float] = Field(
        default=None,
        ge=0,
    )

    flexibility: Optional[float] = Field(
        default=None,
        ge=0,
    )

    strength: Optional[float] = Field(
        default=None,
        ge=0,
    )

    balance: Optional[float] = Field(
        default=None,
        ge=0,
    )

    endurance: Optional[float] = Field(
        default=None,
        ge=0,
    )

    coach_notes: Optional[str] = None

    @field_validator("sport", "position", "coach_notes")
    @classmethod
    def strip_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        return cleaned

class AthleteSelfCreate(BaseModel):
    """
    Schema for an Athlete creating their own profile.

    user_id is intentionally excluded because it is obtained
    from the authenticated user's JWT.
    """

    sport: Optional[str] = Field(
        default=None,
        max_length=100,
        examples=["Football"],
    )

    position: Optional[str] = Field(
        default=None,
        max_length=100,
        examples=["Midfielder"],
    )

    age: Optional[int] = Field(
        default=None,
        ge=0,
        le=120,
    )

    height: Optional[float] = Field(
        default=None,
        gt=0,
        le=300,
        description="Height in centimeters",
    )

    weight: Optional[float] = Field(
        default=None,
        gt=0,
        le=500,
        description="Weight in kilograms",
    )

    @field_validator("sport", "position")
    @classmethod
    def strip_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        return cleaned


class AthleteUpdate(BaseModel):
    """
    Schema for partially updating an athlete profile.
    """

    sport: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    position: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    age: Optional[int] = Field(
        default=None,
        ge=0,
        le=120,
    )

    height: Optional[float] = Field(
        default=None,
        gt=0,
        le=300,
    )

    weight: Optional[float] = Field(
        default=None,
        gt=0,
        le=500,
    )

    training_load: Optional[float] = Field(
        default=None,
        ge=0,
    )

    flexibility: Optional[float] = Field(
        default=None,
        ge=0,
    )

    strength: Optional[float] = Field(
        default=None,
        ge=0,
    )

    balance: Optional[float] = Field(
        default=None,
        ge=0,
    )

    endurance: Optional[float] = Field(
        default=None,
        ge=0,
    )

    coach_notes: Optional[str] = None

    @field_validator("sport", "position", "coach_notes")
    @classmethod
    def strip_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        return cleaned


class AthleteResponse(BaseModel):
    """
    Response schema for an athlete profile.
    """

    athlete_id: UUID
    user_id: UUID

    sport: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = None
    flexibility: Optional[float] = None
    strength: Optional[float] = None
    balance: Optional[float] = None
    endurance: Optional[float] = None
    coach_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)