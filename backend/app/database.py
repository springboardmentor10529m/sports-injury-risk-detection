from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        import psycopg2
    elif not DATABASE_URL:
        DATABASE_URL = "sqlite:///./sql_app.db"
except Exception:
    DATABASE_URL = "sqlite:///./sql_app.db"

connect_args = {"check_same_thread": False} if (not DATABASE_URL or DATABASE_URL.startswith("sqlite")) else {}

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args
    )
except Exception:
    DATABASE_URL = "sqlite:///./sql_app.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()