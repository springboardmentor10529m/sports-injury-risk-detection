from typing import Generator
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# Database Engine Configuration for PostgreSQL
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,  # Proactively test connection liveliness before checkout
    pool_size=10,        # Base connection pool size
    max_overflow=20,     # Max overflow connections during high load
    echo=settings.DEBUG,
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

# Declarative Base
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request,
    ensuring cleanup and connection return to pool on completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
