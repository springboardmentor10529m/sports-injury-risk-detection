"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful user registration."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "password": "securepass123",
        "full_name": "New User",
        "role": "ATHLETE"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "ATHLETE"
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user):
    """Test registration with duplicate email."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "athlete@test.com",
        "password": "securepass123",
        "full_name": "Another User",
        "role": "ATHLETE"
    })
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    """Test successful login."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "athlete@test.com",
        "password": "testpass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    """Test login with wrong password."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "athlete@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent user."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "nobody@test.com",
        "password": "somepassword"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, test_user):
    """Test getting current user profile."""
    from tests.conftest import auth_header
    response = await client.get("/api/v1/users/me", headers=auth_header(test_user))
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "athlete@test.com"
    assert data["role"] == "ATHLETE"


@pytest.mark.asyncio
async def test_get_me_no_auth(client: AsyncClient):
    """Test accessing protected route without auth."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_user):
    """Test token refresh."""
    from tests.conftest import auth_header
    response = await client.post("/api/v1/auth/refresh", headers=auth_header(test_user))
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
