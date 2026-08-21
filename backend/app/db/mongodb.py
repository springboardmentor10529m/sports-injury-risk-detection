"""
MongoDB connection setup using Motor.
Uses lazy initialization so the module can be imported without a live MongoDB instance.
"""

from app.config import get_settings

_client = None
_database = None


def get_mongo_client():
    """Get or create the Motor async client (lazy singleton)."""
    global _client
    if _client is None:
        from motor.motor_asyncio import AsyncIOMotorClient

        settings = get_settings()
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
    return _client


def get_mongo_database():
    """Get the default MongoDB database."""
    global _database
    if _database is None:
        _database = get_mongo_client().get_default_database("safemove")
    return _database


async def get_mongodb():
    """FastAPI dependency to get MongoDB database instance."""
    return get_mongo_database()
