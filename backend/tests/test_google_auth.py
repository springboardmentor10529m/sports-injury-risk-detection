import pytest
import uuid
from fastapi.testclient import TestClient
import main
import models
import auth
from database import SessionLocal

client = TestClient(main.app)


def test_google_auth_config_endpoint():
    """Test retrieving public Google OAuth client configuration."""
    response = client.get("/api/auth/google/config")
    assert response.status_code == 200
    data = response.json()
    assert "client_id" in data
    assert "is_configured" in data
    assert isinstance(data["is_configured"], bool)


def test_google_auth_missing_credential():
    """Test that missing credential fails validation."""
    response = client.post("/api/auth/google", json={"credential": ""})
    assert response.status_code in [400, 401, 422]


def test_google_auth_invalid_credential():
    """Test that an invalid non-mock credential token is rejected."""
    response = client.post("/api/auth/google", json={"credential": "invalid_random_jwt_token_xyz"})
    assert response.status_code == 401
    assert "verification failed" in response.json().get("detail", "").lower()


def test_google_auth_new_user_signup():
    """Test complete registration and login flow for a new user via Google OAuth."""
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"google_athlete_{unique_suffix}@gmail.com"
    test_name = f"Google User {unique_suffix}"
    test_sub = f"sub_{unique_suffix}"
    mock_token = f"mock_google_token_:{test_email}:{test_name}:{test_sub}"

    response = client.post("/api/auth/google", json={
        "credential": mock_token,
        "role": "ATHLETE"
    })

    assert response.status_code == 200
    res_data = response.json()
    assert "access_token" in res_data
    assert res_data["token_type"] == "bearer"
    assert res_data["user"]["email"] == test_email
    assert res_data["user"]["name"] == test_name
    assert res_data["user"]["role"] == "ATHLETE"
    assert res_data["user"]["auth_provider"] == "google"

    # Verify user can access protected /api/auth/me endpoint
    token = res_data["access_token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == test_email
    assert me_data["auth_provider"] == "google"

    # Verify athlete profile was automatically created
    user_record = db.query(models.User).filter(models.User.email == test_email).first()
    assert user_record is not None
    assert user_record.google_id == test_sub
    athlete_record = db.query(models.Athlete).filter(models.Athlete.user_id == user_record.user_id).first()
    assert athlete_record is not None
    assert athlete_record.user.name == test_name
    db.close()


def test_google_auth_existing_user_login():
    """Test that an existing user can log in via Google OAuth and their record is updated."""
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:8]
    existing_email = f"existing_{unique_suffix}@example.com"
    existing_name = f"Existing User {unique_suffix}"

    # First register locally
    reg_resp = client.post("/api/auth/register", json={
        "name": existing_name,
        "email": existing_email,
        "password": "ExistingPassword123!",
        "role": "COACH"
    })
    assert reg_resp.status_code in [200, 201]

    # Now sign in with Google using matching email
    test_sub = f"sub_google_{unique_suffix}"
    mock_token = f"mock_google_token_:{existing_email}:{existing_name}:{test_sub}"

    google_resp = client.post("/api/auth/google", json={
        "credential": mock_token
    })
    assert google_resp.status_code == 200
    res_data = google_resp.json()
    assert res_data["user"]["email"] == existing_email
    assert res_data["user"]["role"] == "COACH"  # Preserved original role

    # Verify google_id is linked in DB
    user_record = db.query(models.User).filter(models.User.email == existing_email).first()
    assert user_record.google_id == test_sub
    db.close()
