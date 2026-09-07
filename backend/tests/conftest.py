# tests/conftest.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.database as database_module
from app.models import Base

# Proactively configure SQLite fallback if PostgreSQL is not available locally
try:
    with database_module.engine.connect() as conn:
        pass
except Exception:
    test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_suite.db"))
    test_sqlite_engine = create_engine(
        f"sqlite:///{test_db_path}",
        connect_args={"check_same_thread": False},
    )
    database_module.engine = test_sqlite_engine
    database_module.SessionLocal.configure(bind=test_sqlite_engine)
    Base.metadata.create_all(bind=test_sqlite_engine)
