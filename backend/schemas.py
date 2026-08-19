import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


INDIAN_MOBILE_PATTERN = re.compile(r"^[6789]\d{9}$")


class PerformanceRecordCreate(BaseModel):
    athlete_id: str
    activity: str = Field(..., min_length=1, max_length=120)
    score: float = Field(..., ge=0, le=100)
    remarks: Optional[str] = Field(None, max_length=2000)

    @field_validator("activity")
    @classmethod
    def validate_activity(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Activity is required.")
        return cleaned


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="athlete", min_length=1, max_length=50)
    phone: str = Field(..., min_length=10, max_length=15)
    profile_image: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters.")
        if not re.search(r"[A-Za-z]", cleaned):
            raise ValueError("Name must contain at least one letter.")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if value.isdigit():
            raise ValueError("Password cannot be numeric only.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value.strip())
        if not INDIAN_MOBILE_PATTERN.match(digits):
            raise ValueError(
                "Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
            )
        return digits


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AthleteCreate(BaseModel):
    user_id: str
    sport: str = Field(..., min_length=1, max_length=80)
    position: Optional[str] = Field(None, max_length=80)
    age: Optional[int] = Field(None, ge=5, le=100)
    height: Optional[float] = Field(None, gt=0, le=300)
    weight: Optional[float] = Field(None, gt=0, le=500)
    training_load: Optional[float] = Field(None, ge=0, le=100)
    flexibility: Optional[float] = Field(None, ge=0, le=100)
    strength: Optional[float] = Field(None, ge=0, le=100)
    balance: Optional[float] = Field(None, ge=0, le=100)
    endurance: Optional[float] = Field(None, ge=0, le=100)
    coach_notes: Optional[str] = Field(None, max_length=5000)

    @field_validator("sport", "position")
    @classmethod
    def strip_text_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned or None

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Sport is required.")
        return value.strip()
