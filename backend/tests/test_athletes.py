"""Tests for athlete management endpoints."""
import pytest
from uuid import uuid4
from datetime import date
from httpx import AsyncClient
from tests.conftest import auth_header
from app.core.rbac import UserRole


@pytest.mark.asyncio
async def test_create_athlete_profile(client: AsyncClient, test_user):
    """Test creating an athlete profile."""
    response = await client.post("/api/v1/athletes/profile", json={
        "user_id": str(test_user.id),
        "sport": "Soccer",
        "position": "Forward",
        "height_cm": 180.0,
        "weight_kg": 75.0,
        "dominant_side": "RIGHT"
    }, headers=auth_header(test_user))
    assert response.status_code == 201
    data = response.json()
    assert data["sport"] == "Soccer"
    assert data["position"] == "Forward"


@pytest.mark.asyncio
async def test_add_injury_record(client: AsyncClient, test_user, physio_user, db_session):
    """Test adding an injury record to an athlete."""
    from app.models.athlete import AthleteProfile
    # Create athlete profile first
    profile = AthleteProfile(
        id=uuid4(), user_id=test_user.id,
        sport="Soccer", position="Forward"
    )
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    
    response = await client.post(
        f"/api/v1/athletes/{profile.id}/injury-history",
        json={
            "injury_type": "ACL",
            "body_region": "Left Knee",
            "severity": "SEVERE",
            "date_occurred": "2024-06-15",
            "recovery_duration_days": 180,
            "is_recurring": False
        },
        headers=auth_header(physio_user)
    )
    assert response.status_code == 201
    data = response.json()
    assert data["injury_type"] == "ACL"
    assert data["severity"] == "SEVERE"


@pytest.mark.asyncio
async def test_log_training(client: AsyncClient, test_user, db_session):
    """Test logging a training session."""
    from app.models.athlete import AthleteProfile
    profile = AthleteProfile(
        id=uuid4(), user_id=test_user.id,
        sport="Soccer"
    )
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    
    response = await client.post(
        f"/api/v1/athletes/{profile.id}/training-load",
        json={
            "date": "2024-08-15",
            "session_type": "Match",
            "duration_minutes": 90,
            "intensity": 8,
            "rpe": 7.5
        },
        headers=auth_header(test_user)
    )
    assert response.status_code == 201
    data = response.json()
    assert data["session_type"] == "Match"
    assert data["intensity"] == 8


@pytest.mark.asyncio
async def test_full_flow(client: AsyncClient):
    """Integration test: register -> login -> create profile -> log training."""
    # Register
    reg = await client.post("/api/v1/auth/register", json={
        "email": "flowtest@test.com",
        "password": "testpass123",
        "full_name": "Flow Test",
        "role": "ATHLETE"
    })
    assert reg.status_code == 201
    user_id = reg.json()["id"]
    
    # Login
    login = await client.post("/api/v1/auth/login", data={
        "username": "flowtest@test.com",
        "password": "testpass123"
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get own profile
    me = await client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "flowtest@test.com"
    
    # Create athlete profile
    profile = await client.post("/api/v1/athletes/profile", json={
        "user_id": user_id,
        "sport": "Basketball",
        "position": "Guard"
    }, headers=headers)
    assert profile.status_code == 201
    athlete_id = profile.json()["id"]
    
    # Log training
    training = await client.post(
        f"/api/v1/athletes/{athlete_id}/training-load",
        json={
            "date": "2024-08-18",
            "session_type": "Practice",
            "duration_minutes": 120,
            "intensity": 6,
            "rpe": 5.0
        },
        headers=headers
    )
    assert training.status_code == 201
