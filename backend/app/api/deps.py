"""
Shared FastAPI dependencies for authentication, authorization, and database access.
"""

from fastapi import Depends, HTTPException, status

from app.core.rbac import UserRole, check_role
from app.core.security import get_current_user
from app.db.postgresql import get_db

__all__ = ["get_current_active_user", "require_roles", "get_db"]


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Ensure the authenticated user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return current_user


def require_roles(*roles: UserRole):
    """
    Factory that creates a FastAPI dependency checking the user's role.

    Usage:
        @router.get("/admin-only")
        async def endpoint(user=Depends(require_roles(UserRole.ADMIN))):
            ...

        # Or as a route dependency:
        @router.get("/staff", dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.COACH))])
        async def endpoint():
            ...
    """
    allowed = list(roles)

    async def _checker(current_user=Depends(get_current_active_user)):
        check_role(current_user, allowed)
        return current_user

    return _checker
