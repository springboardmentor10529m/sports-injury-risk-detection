"""
PostgreSQL / SQLite connection setup via SQLAlchemy.
Supports automatic local SQLite fallback for seamless developer onboarding
when a live PostgreSQL server is not running on localhost:5432.
"""
import logging
from typing import Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from sqlalchemy.orm import declarative_base

from app.config import get_settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

_engine: Optional[AsyncEngine] = None
_async_session_factory: Optional[async_sessionmaker] = None


async def init_db() -> None:
    """Initialize database connection and auto-create tables on startup."""
    global _engine, _async_session_factory

    # Import models to ensure registration with Base.metadata
    import app.models.user  # noqa: F401
    import app.models.athlete  # noqa: F401
    import app.models.video  # noqa: F401
    import app.models.analysis  # noqa: F401
    import app.models.recommendation  # noqa: F401
    import app.models.risk  # noqa: F401

    settings = get_settings()

    try:
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _engine = engine
        _async_session_factory = async_sessionmaker(
            _engine, expire_on_commit=False, class_=AsyncSession
        )
        logger.info(f"Connected to primary database: {settings.DATABASE_URL}")
    except Exception as e:
        logger.warning(
            f"Primary database ({settings.DATABASE_URL}) unreachable: {e}. "
            "Falling back to local SQLite database (safemove.db) for local execution."
        )
        _engine = create_async_engine("sqlite+aiosqlite:///./safemove.db", echo=False)
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _async_session_factory = async_sessionmaker(
            _engine, expire_on_commit=False, class_=AsyncSession
        )
        logger.info("Local SQLite database initialized successfully at ./safemove.db")


def get_engine() -> AsyncEngine:
    """Get or create the async SQLAlchemy engine (lazy singleton)."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
    return _engine


def get_session_factory() -> async_sessionmaker:
    """Get or create the async session factory (lazy singleton)."""
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            get_engine(), expire_on_commit=False, class_=AsyncSession
        )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session
