import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Default to SQLite if DATABASE_URL is not set
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sports_injury.db")

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
    # Ping connection to ensure credentials/database are valid
    with engine.connect() as conn:
        pass
except Exception as e:
    # Graceful fallback to SQLite for zero-downtime local development
    print(f"[Database Warning] Failed to connect to '{SQLALCHEMY_DATABASE_URL}'. Falling back to local SQLite database.")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sports_injury.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
