"""
app/core/dependencies.py
------------------------
Reusable FastAPI dependencies for authentication and authorisation.

``get_current_user`` is the canonical way every protected endpoint obtains the
authenticated :class:`~app.models.user.User` object.  It:

1. Extracts the Bearer JWT from the ``Authorization`` header via FastAPI's
   built-in :class:`~fastapi.security.OAuth2PasswordBearer` scheme.
2. Verifies the token signature, algorithm, and expiry using
   :func:`~app.core.security.decode_access_token`.
3. Validates the ``sub`` claim is present and parseable as a UUID.
4. Fetches the corresponding :class:`~app.models.user.User` row from PostgreSQL.
5. Rejects missing or inactive users with ``HTTP 401``.

The database record is always authoritative: the caller always receives the
current role from PostgreSQL, never the (potentially stale) JWT ``role`` claim.

Role-Based Access Control (RBAC)
---------------------------------
``require_role`` and ``require_roles`` are *factory* functions that return
FastAPI dependency callables.  They build on top of ``get_current_user`` so
authentication always runs first.

HTTP semantics:
- Missing / invalid JWT            → 401 Unauthorized  (raised by get_current_user)
- Valid user, insufficient role    → 403 Forbidden      (raised by RBAC dependency)

Usage::

    # Single role
    @router.get("/coaches-only")
    def coaches(user: User = Depends(require_role(RoleEnum.COACH))):
        ...

    # Multiple allowed roles
    @router.get("/staff-only")
    def staff(user: User = Depends(require_roles(RoleEnum.COACH, RoleEnum.PHYSIOTHERAPIST))):
        ...
"""

import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import RoleEnum, User

# ---------------------------------------------------------------------------
# Bearer token extractor
# ---------------------------------------------------------------------------

# ``tokenUrl`` is the login endpoint – used exclusively by the Swagger UI
# "Authorize" dialog so it knows where to send credentials.
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# HTTP 401 factory
# ---------------------------------------------------------------------------

def _credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
    """Return a consistent 401 with ``WWW-Authenticate: Bearer`` header."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Primary dependency
# ---------------------------------------------------------------------------

def get_current_user(
    token: Annotated[str, Depends(_oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that resolves a Bearer JWT to the authenticated
    :class:`~app.models.user.User` database record.

    Raises ``HTTP 401`` for every authentication failure:
    - Missing / malformed Authorization header (handled by OAuth2PasswordBearer)
    - Invalid token signature or algorithm
    - Expired token
    - Missing or non-UUID ``sub`` claim
    - User does not exist in the database
    - User account is inactive

    The returned ``User`` object is sourced directly from PostgreSQL, so every
    field (including ``role``) reflects the current database state, *not* the
    JWT payload.

    Usage::

        @router.get("/protected")
        def protected_endpoint(current_user: User = Depends(get_current_user)):
            ...
    """
    # 1. Decode and verify the JWT (signature, algorithm, expiry)
    try:
        payload = decode_access_token(
            token=token,
            secret_key=settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
    except JWTError:
        raise _credentials_exception()

    # 2. Extract and validate the ``sub`` claim
    sub: str | None = payload.get("sub")
    if sub is None:
        raise _credentials_exception("Token is missing the 'sub' claim.")

    # 3. Convert ``sub`` to a UUID — reject malformed values
    try:
        user_id = uuid.UUID(sub)
    except (ValueError, AttributeError):
        raise _credentials_exception("Token 'sub' claim is not a valid UUID.")

    # 4. Fetch the user from the database (authoritative record)
    user: User | None = db.query(User).filter(User.user_id == user_id).first()

    if user is None:
        raise _credentials_exception("User not found.")

    # 5. Reject inactive accounts
    if not user.is_active:
        raise _credentials_exception("User account is inactive.")

    # 6. Return the database-authoritative User object
    return user


# ---------------------------------------------------------------------------
# RBAC dependency factories
# ---------------------------------------------------------------------------

def require_role(allowed_role: RoleEnum) -> Callable[..., User]:
    """
    Return a FastAPI dependency that enforces a single allowed role.

    The dependency first authenticates the request via ``get_current_user``
    (raising ``HTTP 401`` on any authentication failure), then checks whether
    the **database-sourced** ``user.role`` matches *allowed_role*.  If not,
    it raises ``HTTP 403 Forbidden``.

    Example::

        @router.get("/coaches-only")
        def coaches_endpoint(user: User = Depends(require_role(RoleEnum.COACH))):
            return {"message": f"Hello, Coach {user.name}"}
    """
    def _dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role != allowed_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role: '{allowed_role.value}'. "
                    f"Your role: '{current_user.role.value}'."
                ),
            )
        return current_user

    # Give the inner function a unique name so FastAPI's dependency cache
    # treats each require_role(X) call as a distinct dependency.
    _dependency.__name__ = f"require_role_{allowed_role.name}"
    return _dependency


def require_roles(*allowed_roles: RoleEnum) -> Callable[..., User]:
    """
    Return a FastAPI dependency that permits *any* of the specified roles.

    Raises ``HTTP 403 Forbidden`` when the authenticated user's
    database-sourced role is not in *allowed_roles*.

    Example::

        @router.get("/staff")
        def staff_endpoint(
            user: User = Depends(
                require_roles(RoleEnum.COACH, RoleEnum.PHYSIOTHERAPIST)
            )
        ):
            ...
    """
    if not allowed_roles:
        raise ValueError("require_roles() requires at least one RoleEnum value.")

    allowed_set = frozenset(allowed_roles)

    def _dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed_set:
            allowed_names = ", ".join(f"'{r.value}'" for r in sorted(allowed_roles, key=lambda r: r.value))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Allowed roles: [{allowed_names}]. "
                    f"Your role: '{current_user.role.value}'."
                ),
            )
        return current_user

    role_names = "_".join(r.name for r in allowed_roles)
    _dependency.__name__ = f"require_roles_{role_names}"
    return _dependency
