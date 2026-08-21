"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.core.rbac import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.ATHLETE


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    email: EmailStr | None = None
    full_name: str | None = None
    role: UserRole | None = None


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token payload."""

    user_id: str | None = None
    role: UserRole | None = None


class PaginatedUserResponse(BaseModel):
    """Paginated list of users."""

    items: list[UserResponse]
    total: int
    page: int
    per_page: int
