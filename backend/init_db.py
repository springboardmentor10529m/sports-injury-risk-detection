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
    InjuryHistory,
)
from database import Base


def init_database() -> None:
    Base.metadata.create_all(bind=engine)
    # Ensure newly added columns exist in PostgreSQL
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS training_level VARCHAR(50);"))
            conn.execute(text("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS gender VARCHAR(50);"))
            conn.commit()
        except Exception as e:
            print(f"Column check note: {e}")
    print("Database tables and columns initialized successfully.")


if __name__ == "__main__":
    init_database()
