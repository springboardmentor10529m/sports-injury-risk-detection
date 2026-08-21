"""Tests for RBAC enforcement."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin_user):
    """Admin can access admin-only endpoints."""
    response = await client.get("/api/v1/users/", headers=auth_header(admin_user))
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_athlete_cannot_list_users(client: AsyncClient, test_user):
    """Athlete cannot access admin-only endpoints."""
    response = await client.get("/api/v1/users/", headers=auth_header(test_user))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_coach_cannot_list_users(client: AsyncClient, coach_user):
    """Coach cannot access admin-only endpoints."""
    response = await client.get("/api/v1/users/", headers=auth_header(coach_user))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_change_role(client: AsyncClient, admin_user, test_user):
    """Admin can change another user's role."""
    response = await client.put(
        f"/api/v1/users/{test_user.id}/role",
        params={"role": "COACH"},
        headers=auth_header(admin_user),
    )
    assert response.status_code == 200
    assert response.json()["role"] == "COACH"


@pytest.mark.asyncio
async def test_athlete_cannot_change_role(client: AsyncClient, test_user):
    """Athlete cannot change roles."""
    response = await client.put(
        f"/api/v1/users/{test_user.id}/role",
        params={"role": "ADMIN"},
        headers=auth_header(test_user),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_coach_can_list_athletes(client: AsyncClient, coach_user):
    """Coach can access athlete list."""
    response = await client.get("/api/v1/athletes/", headers=auth_header(coach_user))
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_athlete_cannot_list_athletes(client: AsyncClient, test_user):
    """Athlete cannot access athlete list (only their own profile)."""
    response = await client.get("/api/v1/athletes/", headers=auth_header(test_user))
    assert response.status_code == 403
