import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

# JWT settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super_secret_key_sports_injury_2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

def hash_password(password: str) -> str:
    """
    Secure PBKDF2-HMAC-SHA256 password hashing (Python standard library).
    Guarantees cross-platform compatibility without passlib version conflicts.
    """
    salt = os.urandom(16)
    pwd_bytes = password.encode('utf-8')[:72]  # Truncate to 72 bytes max for safety
    derived = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt, 100000)
    return f"pbkdf2_sha256${salt.hex()}${derived.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies plain password against stored hash (PBKDF2 or bcrypt fallback).
    """
    if not hashed_password:
        return False
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            parts = hashed_password.split("$")
            if len(parts) != 3:
                return False
            salt = bytes.fromhex(parts[1])
            expected_derived = bytes.fromhex(parts[2])
            pwd_bytes = plain_password.encode('utf-8')[:72]
            computed_derived = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt, 100000)
            return hmac.compare_digest(computed_derived, expected_derived)
        else:
            # Fallback to bcrypt if existing passlib hash
            import bcrypt
            pwd_bytes = plain_password.encode('utf-8')[:72]
            return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    token = jwt.encode(
        to_encode,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )
    return token

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
        return payload
    except Exception:
        return None