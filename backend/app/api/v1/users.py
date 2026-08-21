"""User management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.rbac import UserRole
from app.core.security import get_current_user
from app.db.postgresql import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile. Cannot change own role."""
    # Prevent self role change
    if user_in.role is not None:
        user_in.role = None
    service = UserService(db)
    return await service.update_user(current_user.id, user_in)


@router.get("/", response_model=list[UserResponse])
async def list_users(
    admin=Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: UserRole | None = None,
):
    """Admin: List all users with optional role filter and pagination."""
    service = UserService(db)
    users, total = await service.list_users(skip=skip, limit=limit, role=role)
    return users


@router.put("/{user_id}/role", response_model=UserResponse)
async def change_user_role(
    user_id: UUID,
    role: UserRole,
    admin=Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin: Change a user's role."""
    service = UserService(db)
    return await service.change_role(user_id, role)
