"""
tests/test_auth_me.py
---------------------
Phase 2 Step 3 – Test suite for:
  - GET /auth/me  (and /api/v1/auth/me)
  - get_current_user() dependency

Test matrix (10 scenarios):
  1. Valid token → 200 with full UserResponse
  2. Missing Authorization header → 401
  3. Malformed / non-JWT token string → 401
  4. Expired token → 401
  5. Invalid signature (wrong secret) → 401
  6. JWT missing 'sub' claim → 401
  7. JWT with non-UUID 'sub' claim → 401
  8. Non-existent user (UUID not in DB) → 401
  9. Inactive user → 401
  10. Response contains no password / password_hash / oauth_id;
      returned role reflects database, not JWT payload

All test users created here are cleaned up in teardown.
No database schema migrations are required.
"""

import uuid
from datetime import timedelta, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash, create_access_token

# ---------------------------------------------------------------------------
# Test Client
# ---------------------------------------------------------------------------

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TEST_PASSWORD = "TestPassword@Step3!"
_CLEANUP_EMAILS: list[str] = []


def _create_test_user(
    name: str,
    email: str,
    role: RoleEnum = RoleEnum.ATHLETE,
    is_active: bool = True,
) -> User:
    """
    Directly insert a test user via SQLAlchemy.
    Registers the email for teardown cleanup.
    """
    db = SessionLocal()
    try:
        user = User(
            user_id=uuid.uuid4(),
            name=name,
            email=email,
            password=get_password_hash(_TEST_PASSWORD),
            role=role,
            is_active=is_active,
            is_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _CLEANUP_EMAILS.append(email)
        return user
    finally:
        db.close()


def _make_token(
    subject: str,
    *,
    secret: str = settings.SECRET_KEY,
    algorithm: str = settings.ALGORITHM,
    expires_delta: timedelta = timedelta(minutes=30),
    extra_claims: dict | None = None,
) -> str:
    """Build a signed JWT for testing."""
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": subject,
        "role": "Athlete",
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, secret, algorithm=algorithm)


def _make_token_without_sub(
    *,
    secret: str = settings.SECRET_KEY,
    algorithm: str = settings.ALGORITHM,
) -> str:
    """Build a valid JWT that deliberately omits the 'sub' claim."""
    now = datetime.now(timezone.utc)
    payload: dict = {
        "role": "Athlete",
        "iat": now,
        "exp": now + timedelta(minutes=30),
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


# ---------------------------------------------------------------------------
# Teardown – run after all tests in this module
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True, scope="module")
def cleanup_test_users():
    """
    Module-scoped fixture that deletes every test user created during the
    test session.  Runs as a teardown (yield-based).
    """
    yield  # all tests run here
    db = SessionLocal()
    try:
        if _CLEANUP_EMAILS:
            db.query(User).filter(User.email.in_(_CLEANUP_EMAILS)).delete(
                synchronize_session=False
            )
            db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetMe:
    """Tests for GET /auth/me"""

    def test_valid_token_returns_200_with_user_profile(self):
        """Test 1: Valid Bearer JWT → 200 with full UserResponse."""
        user = _create_test_user(
            name="Me Endpoint User",
            email="me.valid@test.invalid",
            role=RoleEnum.COACH,
        )
        token = _make_token(str(user.user_id))

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(user.user_id)
        assert data["email"] == user.email
        assert data["name"] == user.name
        assert data["role"] == RoleEnum.COACH.value
        assert data["is_active"] is True

    def test_missing_authorization_header_returns_401(self):
        """Test 2: No Authorization header → 401."""
        response = client.get("/auth/me")
        assert response.status_code == 401
        assert "WWW-Authenticate" in response.headers
        assert response.headers["WWW-Authenticate"].startswith("Bearer")

    def test_malformed_token_returns_401(self):
        """Test 3: Garbled / non-JWT string → 401."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer this.is.not.a.jwt"},
        )
        assert response.status_code == 401

    def test_expired_token_returns_401(self):
        """Test 4: Expired JWT → 401."""
        user = _create_test_user(
            name="Expired Token User",
            email="me.expired@test.invalid",
        )
        expired_token = _make_token(
            str(user.user_id),
            expires_delta=timedelta(seconds=-1),  # already expired
        )
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    def test_invalid_signature_returns_401(self):
        """Test 5: Token signed with a different secret → 401."""
        user = _create_test_user(
            name="Bad Sig User",
            email="me.badsig@test.invalid",
        )
        bad_token = _make_token(
            str(user.user_id),
            secret="totally-wrong-secret-key-that-is-long-enough",
        )
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert response.status_code == 401

    def test_missing_sub_claim_returns_401(self):
        """Test 6: JWT without 'sub' claim → 401."""
        no_sub_token = _make_token_without_sub()
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {no_sub_token}"},
        )
        assert response.status_code == 401

    def test_non_uuid_sub_claim_returns_401(self):
        """Test 7: JWT where 'sub' is not a valid UUID → 401."""
        bad_sub_token = _make_token("not-a-uuid-string")
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {bad_sub_token}"},
        )
        assert response.status_code == 401

    def test_nonexistent_user_returns_401(self):
        """Test 8: Valid JWT but UUID has no corresponding user row → 401."""
        ghost_id = str(uuid.uuid4())  # random UUID, guaranteed not in DB
        token = _make_token(ghost_id)
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    def test_inactive_user_returns_401(self):
        """Test 9: Valid JWT for an account marked is_active=False → 401."""
        inactive_user = _create_test_user(
            name="Inactive Me User",
            email="me.inactive@test.invalid",
            is_active=False,
        )
        token = _make_token(str(inactive_user.user_id))
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    def test_response_excludes_sensitive_fields(self):
        """Test 10a: Response must not contain password, oauth_id, or raw secrets."""
        user = _create_test_user(
            name="Sensitive Fields User",
            email="me.sensitive@test.invalid",
        )
        token = _make_token(str(user.user_id))
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "password" not in data, "Password hash must not appear in response"
        assert "hashed_password" not in data
        assert "oauth_id" not in data, "oauth_id must not appear in response"

    def test_role_comes_from_database_not_jwt(self):
        """
        Test 10b: The 'role' in the response must reflect the *database* value,
        not the JWT payload.  We mint a token claiming ADMINISTRATOR but verify
        the response returns the actual stored role (ATHLETE).
        """
        user = _create_test_user(
            name="Role DB Check User",
            email="me.rolecheck@test.invalid",
            role=RoleEnum.ATHLETE,
        )
        # Forge a token that lies about the role
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.user_id),
            "role": "Administrator",  # intentionally wrong / elevated
            "iat": now,
            "exp": now + timedelta(minutes=30),
        }
        lying_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {lying_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        # Must reflect what PostgreSQL says, not the JWT claim
        assert data["role"] == RoleEnum.ATHLETE.value, (
            f"Expected role '{RoleEnum.ATHLETE.value}' from database, "
            f"got '{data['role']}' from JWT claim instead"
        )

    def test_v1_prefix_also_works(self):
        """Bonus: /api/v1/auth/me must also return 200 (both prefixes are registered)."""
        user = _create_test_user(
            name="V1 Prefix User",
            email="me.v1prefix@test.invalid",
        )
        token = _make_token(str(user.user_id))
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == user.email
