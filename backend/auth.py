import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List, Callable
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import database, models

ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
SECRET_KEY = os.getenv("JWT_SECRET")

# Enforce mandatory secret in production
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("FATAL: JWT_SECRET environment variable must be set in production mode.")
    SECRET_KEY = "sports_injury_super_secret_jwt_key_2026_capstone"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days expiration

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_from_header_or_query(
    token_header: Optional[str] = Depends(oauth2_scheme_optional),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(database.get_db)
) -> models.User:
    token = token_header or token_query
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (via Bearer token or token query parameter)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*allowed_roles: str) -> Callable:
    """
    Reusable RBAC dependency ensuring the requesting user has one of the specified roles.
    ADMIN has universal access.
    """
    roles_set = {r.upper() for r in allowed_roles}
    roles_set.add(models.UserRole.ADMIN.value)

    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        user_role = (current_user.role or "").upper()
        if user_role not in roles_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Allowed roles: {', '.join(allowed_roles)}. User role: {user_role}."
            )
        return current_user

    return role_checker
