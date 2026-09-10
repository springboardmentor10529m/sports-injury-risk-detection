from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password.encode("utf-8")) > 72:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub") if payload.get("purpose", "access") == "access" else None
    except jwt.InvalidTokenError:
        return None


def create_invitation(email: str, role: str) -> str:
    return jwt.encode({"sub": email.strip().lower(), "role": role, "purpose": "registration",
                       "exp": datetime.now(timezone.utc) + timedelta(days=2)},
                      settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_invitation(code: str, email: str, role: str) -> bool:
    try:
        payload = jwt.decode(code, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM],
                             options={"require": ["exp", "sub"]})
        return (payload.get("purpose") == "registration" and payload["sub"] == email.strip().lower()
                and payload.get("role") == role)
    except jwt.InvalidTokenError:
        return False
