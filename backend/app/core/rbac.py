"""
Role-Based Access Control (RBAC).

RBAC Matrix:
- ADMIN: Full access to all endpoints.
- SPORTS_SCIENTIST: Access to analytics, athlete risk trends, ML insights.
- PHYSIOTHERAPIST: Access to assigned athletes, injury histories, risk reports.
- COACH: Access to team dashboards, roster, risk summaries.
- ATHLETE: Access to own profile, own videos, own reports.
"""

from enum import StrEnum

from fastapi import HTTPException, status


class UserRole(StrEnum):
    ATHLETE = "ATHLETE"
    COACH = "COACH"
    PHYSIOTHERAPIST = "PHYSIOTHERAPIST"
    SPORTS_SCIENTIST = "SPORTS_SCIENTIST"
    ADMIN = "ADMIN"


def check_role(user, allowed_roles: list[UserRole]) -> None:
    """Raise 403 if user's role is not in allowed_roles."""
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied. Role '{user.role.value}' is not authorized. "
                f"Required: {[r.value for r in allowed_roles]}"
            ),
        )
