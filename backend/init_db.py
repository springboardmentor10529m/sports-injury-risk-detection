"""
Initialize PostgreSQL tables from existing SQLAlchemy models.
Run once after configuring DATABASE_URL in .env:

    python init_db.py
"""

from database import engine
from models import (  # noqa: F401 — register all models with Base
    User,
    Athlete,
    PerformanceRecord,
    Video,
    AnalysisResult,
    InjuryPrediction,
    Recommendation,
)
from database import Base


def init_database() -> None:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully (existing tables are left unchanged).")


if __name__ == "__main__":
    init_database()
