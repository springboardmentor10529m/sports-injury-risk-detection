"""Tests for the health check endpoint."""

import pytest
from httpx import AsyncClient

from app.config import get_settings


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test the health check endpoint returns 200 OK and version."""
    settings = get_settings()
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": settings.VERSION}
