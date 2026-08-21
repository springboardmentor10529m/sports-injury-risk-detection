"""
User service — handles user registration, authentication, and management.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.core.rbac import UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Concrete user service with PostgreSQL persistence."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(self, user_in: UserCreate) -> User:
        """Register a new user. Raises ValidationError if email already exists."""
        # Check for duplicate email
        result = await self.db.execute(select(User).where(User.email == user_in.email))
        if result.scalar_one_or_none():
            raise ValidationError(f"Email '{user_in.email}' is already registered")

        user = User(
            email=user_in.email,
            password_hash=hash_password(user_in.password),
            full_name=user_in.full_name,
            role=user_in.role,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        """Verify credentials. Returns User or None."""
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.password_hash):
            return None
        return user

    async def get_user(self, user_id: UUID) -> User:
        """Get user by ID. Raises NotFoundError if not found."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError(f"User '{user_id}' not found")
        return user

    async def get_user_by_email(self, email: str) -> User | None:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def update_user(self, user_id: UUID, user_update: UserUpdate) -> User:
        """Update user profile fields."""
        user = await self.get_user(user_id)
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def list_users(self, skip: int = 0, limit: int = 50, role: UserRole | None = None) -> tuple[list[User], int]:
        """List users with pagination. Returns (users, total_count)."""
        query = select(User)
        count_query = select(func.count()).select_from(User)

        if role:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        total = (await self.db.execute(count_query)).scalar()
        result = await self.db.execute(query.offset(skip).limit(limit).order_by(User.created_at.desc()))
        return result.scalars().all(), total

    async def change_role(self, user_id: UUID, new_role: UserRole) -> User:
        """Change a user's role. Admin only."""
        user = await self.get_user(user_id)
        user.role = new_role
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def deactivate_user(self, user_id: UUID) -> User:
        """Deactivate a user account."""
        user = await self.get_user(user_id)
        user.is_active = False
        await self.db.commit()
        await self.db.refresh(user)
        return user

    @staticmethod
    def create_tokens(user: User) -> dict:
        """Generate access and refresh tokens for a user."""
        token_data = {"sub": str(user.id), "role": user.role.value}
        return {
            "access_token": create_access_token(token_data),
            "refresh_token": create_refresh_token(token_data),
            "token_type": "bearer",
        }
