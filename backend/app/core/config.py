from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True)

    DATABASE_URL: str = "sqlite:///./injury_guard.db"
    DATABASE_HOST: str = ""
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = ""
    DATABASE_NAME: str = "injury_guard"

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENVIRONMENT: Literal["development", "production"] = "development"
    PROCESSING_MODE: Literal["local", "worker"] = "local"
    REGISTRATION_EMAILS: str = ""

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = Field(default=50, ge=1, le=300)
    MAX_VIDEO_SECONDS: int = Field(default=30, ge=1, le=120)
    MAX_SAMPLED_FRAMES: int = Field(default=300, ge=10, le=1200)
    MAX_PENDING_PER_ATHLETE: int = Field(default=2, ge=1)
    MAX_PENDING_VIDEOS: int = Field(default=10, ge=1)
    MAX_UPLOAD_STORAGE_MB: int = Field(default=2048, ge=100)
    JOB_TIMEOUT_SECONDS: int = Field(default=600, ge=30)
    DELETE_PROCESSED_UPLOADS: bool = False

    POSE_SAMPLE_FPS: int = 10
    POSE_MODEL_PATH: str = "./app/ml_models/pose_landmarker_full.task"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @model_validator(mode="after")
    def validate_production(self):
        if self.ENVIRONMENT == "production":
            if len(self.JWT_SECRET_KEY) < 32 or "change-me" in self.JWT_SECRET_KEY:
                raise ValueError("Production requires a random JWT_SECRET_KEY of at least 32 characters")
            if self.PROCESSING_MODE != "worker":
                raise ValueError("Production requires PROCESSING_MODE=worker")
            if not self.DATABASE_HOST and not self.DATABASE_URL.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL")
            if not self.cors_origins_list or any(not o.startswith("https://") for o in self.cors_origins_list):
                raise ValueError("Production requires explicit HTTPS CORS_ORIGINS")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
