"""
Redis connection setup.
Uses lazy initialization so the module can be imported without a live Redis instance.
"""
from typing import Optional
from app.config import get_settings

_redis_client = None


def get_redis_client():
    """Get or create the async Redis client (lazy singleton)."""
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as aioredis
        settings = get_settings()
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def get_redis():
    """FastAPI dependency to get Redis client."""
    return get_redis_client()
