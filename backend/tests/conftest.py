"""Test configuration and fixtures."""

import asyncio
from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import app.models.analysis  # noqa: F401

# Import all models to register them with Base.metadata
import app.models.athlete  # noqa: F401
import app.models.recommendation  # noqa: F401
import app.models.video  # noqa: F401
from app.core.rbac import UserRole
from app.core.security import create_access_token, hash_password
from app.db.postgresql import Base, get_db
from app.main import app as fastapi_app
from app.models.user import User

# Use SQLite for tests (no PostgreSQL needed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    """Create and drop tables for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Get an async test client with DB override."""

    async def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://testserver") as ac:
        yield ac

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test athlete user."""
    user = User(
        id=uuid4(),
        email="athlete@test.com",
        password_hash=hash_password("testpass123"),
        full_name="Test Athlete",
        role=UserRole.ATHLETE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=uuid4(),
        email="admin@test.com",
        password_hash=hash_password("adminpass123"),
        full_name="Test Admin",
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def coach_user(db_session: AsyncSession) -> User:
    """Create a test coach user."""
    user = User(
        id=uuid4(),
        email="coach@test.com",
        password_hash=hash_password("coachpass123"),
        full_name="Test Coach",
        role=UserRole.COACH,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def physio_user(db_session: AsyncSession) -> User:
    """Create a test physiotherapist user."""
    user = User(
        id=uuid4(),
        email="physio@test.com",
        password_hash=hash_password("physiopass123"),
        full_name="Test Physio",
        role=UserRole.PHYSIOTHERAPIST,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


def auth_header(user: User) -> dict:
    """Generate auth header for a user."""
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}
