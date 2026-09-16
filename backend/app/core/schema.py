"""Explicit, additive schema initialization. Run before API/worker deployment."""
from sqlalchemy import text, inspect
from app.core.database import Base, engine
from app import models  # noqa: F401: register all tables


def initialize_schema():
    Base.metadata.create_all(bind=engine)
    if "injury_context" not in {c["name"] for c in inspect(engine).get_columns("athlete_profiles")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE athlete_profiles ADD COLUMN injury_context JSON"))
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(text("ALTER TYPE videostatus ADD VALUE IF NOT EXISTS 'INSUFFICIENT_DATA'"))


if __name__ == "__main__":
    initialize_schema()
