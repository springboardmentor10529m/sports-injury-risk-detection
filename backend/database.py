import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "sports_injury.db")

# Default to SQLite if DATABASE_URL is not set
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")

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
    print(f"[Database Warning] Failed to connect to '{SQLALCHEMY_DATABASE_URL}'. Falling back to local SQLite database at {SQLITE_DB_PATH}.")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def sync_database_schema(target_engine):
    """
    Safely adds any missing columns to existing database tables
    to guarantee schema parity without dropping existing records.
    """
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(target_engine)
        table_names = inspector.get_table_names()

        with target_engine.connect() as conn:
            if "analysis_results" in table_names:
                existing_cols = {col["name"] for col in inspector.get_columns("analysis_results")}
                needed = [
                    ("dataset_version", "VARCHAR DEFAULT '1.0.0-unified'"),
                    ("pose_model", "VARCHAR DEFAULT 'RTMPose-M (ONNX)'"),
                    ("pose_model_version", "VARCHAR DEFAULT '1.0.0-simcc'"),
                    ("feature_version", "VARCHAR DEFAULT '2.0.0-kinematics'"),
                    ("ml_model_version", "VARCHAR DEFAULT '2.0.0-supervised'"),
                    ("calibrated_ml_probability", "FLOAT DEFAULT 0.0"),
                    ("screening_risk_score", "FLOAT DEFAULT 0.0"),
                ]
                for col_name, col_def in needed:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE analysis_results ADD COLUMN {col_name} {col_def}"))

            if "injury_predictions" in table_names:
                existing_cols = {col["name"] for col in inspector.get_columns("injury_predictions")}
                needed = [
                    ("calibrated_probability", "FLOAT DEFAULT 0.0"),
                    ("ml_model_name", "VARCHAR DEFAULT 'Calibrated-XGBoost'"),
                ]
                for col_name, col_def in needed:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE injury_predictions ADD COLUMN {col_name} {col_def}"))

            if "users" in table_names:
                existing_cols = {col["name"] for col in inspector.get_columns("users")}
                needed = [
                    ("google_id", "VARCHAR NULL"),
                    ("auth_provider", "VARCHAR DEFAULT 'local'"),
                ]
                for col_name, col_def in needed:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))

            conn.commit()
    except Exception as e:
        print(f"[Schema Sync] Info: {e}")


# Run schema synchronization
sync_database_schema(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
