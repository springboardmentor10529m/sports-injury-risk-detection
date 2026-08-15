from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from jose import jwt, JWTError  # python-jose[cryptography]

# ---------------------------------------------------------------------------
# Argon2 Password Hashing
# ---------------------------------------------------------------------------

# Configure Argon2 Password Hasher with OWASP recommended parameters:
# memory_cost=65536 (64 MB), time_cost=3 iterations, parallelism=4 threads
_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def get_password_hash(password: str) -> str:
    """
    Hash a plaintext password using Argon2id algorithm.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    return _password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored Argon2 hash.
    Returns True if the password matches, False otherwise.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return _password_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ---------------------------------------------------------------------------
# JWT Token Utilities
# ---------------------------------------------------------------------------

# Claims that must never appear inside a JWT payload
_FORBIDDEN_JWT_CLAIMS = frozenset(
    {"password", "hashed_password", "phone", "profile_image"}
)


def create_access_token(
    subject: str,
    role: str,
    secret_key: str,
    algorithm: str,
    expires_delta: timedelta,
    additional_claims: Optional[dict[str, Any]] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject:          The user's UUID string stored in the ``sub`` claim.
        role:             The user's role stored in the ``role`` claim.
        secret_key:       HMAC secret loaded from application settings.
        algorithm:        JWT signing algorithm (e.g. ``"HS256"``).
        expires_delta:    How long the token should remain valid.
        additional_claims: Optional extra non-sensitive claims to merge.

    Returns:
        A signed, encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": expire,
    }

    if additional_claims:
        for key, value in additional_claims.items():
            if key not in _FORBIDDEN_JWT_CLAIMS:
                payload[key] = value

    return jwt.encode(payload, secret_key, algorithm=algorithm)


def decode_access_token(
    token: str,
    secret_key: str,
    algorithm: str,
) -> dict[str, Any]:
    """
    Decode and verify a signed JWT access token.

    Raises:
        jose.JWTError: if the token is invalid, expired, or tampered with.

    Returns:
        The decoded payload dictionary.
    """
    return jwt.decode(token, secret_key, algorithms=[algorithm])
