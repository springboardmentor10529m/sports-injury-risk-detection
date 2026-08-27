"""
tests/test_login_regression.py
-------------------------------
Regression tests for the login failure bug (existing-user login returning 401).

Test matrix:
  1. Existing user (inserted directly like old users) can login with correct password.
  2. Login succeeds when email submitted with different capitalisation (case-insensitive lookup).
  3. Wrong password returns 401 with generic message.
  4. Nonexistent email returns 401 with generic message.
  5. Inactive user returns 403.
  6. New registration followed by immediate login succeeds.

All test users are cleaned up after each test via the module-scoped fixture.
"""

import uuid

# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

# ---------------------------------------------------------------------------
# Constants & Helpers
# ---------------------------------------------------------------------------

client = TestClient(app)

_TEST_EMAIL_BASE = "login.regression"
_TEST_PASSWORD = "RegTest@2026!"
_CLEANUP_EMAILS: list[str] = []


def _make_email(suffix: str) -> str:
    return f"{_TEST_EMAIL_BASE}.{suffix}@example.com"


def _insert_user(
    email: str,
    password: str = _TEST_PASSWORD,
    role: RoleEnum = RoleEnum.ATHLETE,
    is_active: bool = True,
) -> User:
    """
    Insert a user directly via SQLAlchemy (simulating an old user created
    without going through the registration endpoint).
    """
    db = SessionLocal()
    try:
        user = User(
            user_id=uuid.uuid4(),
            name="Regression Test User",
            email=email,
            password=get_password_hash(password),
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


def _login(email: str, password: str):
    """Post to /auth/login with form-encoded body; return Response."""
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


# ---------------------------------------------------------------------------
# Module-scoped teardown
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True, scope="module")
def cleanup():
    yield
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

class TestLoginRegression:
    """Regression tests for the existing-user login failure."""

    def test_existing_user_can_login(self):
        """
        Test 1: A user inserted directly into the DB (simulating an old user)
        can log in with their correct password via the login endpoint.
        This is the core regression case: old users must not get a 401.
        """
        email = _make_email("existing")
        _insert_user(email)

        resp = _login(email, _TEST_PASSWORD)

        assert resp.status_code == 200, (
            f"Existing user login failed with {resp.status_code}: {resp.json()}"
        )
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_is_case_insensitive_on_email(self):
        """
        Test 2: Login with a mixed-case version of the stored (lowercase) email
        must still succeed. This guards against users who type SHREYA@gmail.com
        when their stored email is shreya@gmail.com.
        """
        stored_email = _make_email("casetest")
        _insert_user(stored_email)

        mixed_case_email = stored_email.upper()

        resp = _login(mixed_case_email, _TEST_PASSWORD)

        assert resp.status_code == 200, (
            f"Case-insensitive login failed with {resp.status_code}: {resp.json()}"
        )

    def test_login_with_leading_trailing_whitespace_in_email(self):
        """
        Test 2b: Email submitted with surrounding whitespace is normalised and
        finds the stored lowercase row.
        """
        stored_email = _make_email("wstest")
        _insert_user(stored_email)

        resp = _login(f"  {stored_email}  ", _TEST_PASSWORD)

        assert resp.status_code == 200, (
            f"Whitespace-trimmed login failed: {resp.json()}"
        )

    def test_wrong_password_returns_401(self):
        """
        Test 3: Correct email, wrong password returns 401 with generic message.
        The exact detail must not hint at whether the email exists.
        """
        email = _make_email("wrongpw")
        _insert_user(email)

        resp = _login(email, "completely_wrong_password!")

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect email or password."
        assert "WWW-Authenticate" in resp.headers

    def test_nonexistent_email_returns_401(self):
        """
        Test 4: An email that was never registered returns 401 with the same
        generic message (prevents user-enumeration).
        """
        resp = _login("ghost.that.never.existed@example.com", "anypassword")

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Incorrect email or password."

    def test_inactive_user_returns_403(self):
        """
        Test 5: An account with is_active=False must be rejected with 403 Forbidden
        after a successful password check.
        """
        email = _make_email("inactive")
        _insert_user(email, is_active=False)

        resp = _login(email, _TEST_PASSWORD)

        assert resp.status_code == 403
        assert "deactivated" in resp.json()["detail"].lower()

    def test_new_registration_followed_by_login(self):
        """
        Test 6: Register a fresh account through the endpoint then immediately
        login -- must return 200 with a token.
        """
        email = _make_email("freshregister")
        _CLEANUP_EMAILS.append(email)

        reg_resp = client.post(
            "/auth/register",
            json={
                "name": "Fresh Register User",
                "email": email,
                "password": _TEST_PASSWORD,
                "role": "Athlete",
            },
        )
        assert reg_resp.status_code == 201, (
            f"Registration failed: {reg_resp.json()}"
        )

        login_resp = _login(email, _TEST_PASSWORD)

        assert login_resp.status_code == 200, (
            f"Login after registration failed: {login_resp.json()}"
        )
        assert "access_token" in login_resp.json()

    def test_registration_then_login_with_uppercase_email_input(self):
        """
        Test 6b: Register with uppercase email, confirm email is stored lowercase,
        and that login with the original uppercase input still works.
        """
        lower_email = _make_email("upregister")
        upper_email = lower_email.upper()
        _CLEANUP_EMAILS.append(lower_email)

        reg_resp = client.post(
            "/auth/register",
            json={
                "name": "Upper Register User",
                "email": upper_email,
                "password": _TEST_PASSWORD,
                "role": "Athlete",
            },
        )
        assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.json()}"

        assert reg_resp.json()["email"] == lower_email

        login_resp = _login(upper_email, _TEST_PASSWORD)
        assert login_resp.status_code == 200, (
            f"Login with original uppercase email failed: {login_resp.json()}"
        )
