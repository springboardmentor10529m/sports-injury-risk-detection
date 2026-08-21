"""
Configuration management using Pydantic Settings.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SafeMove API"
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    # DB Connections
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/safemove"
    MONGODB_URL: str = "mongodb://localhost:27017/safemove"
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT Auth
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Storage Configuration (Local & MinIO)
    VIDEO_STORAGE_PATH: str = "./storage/videos"
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_VIDEO_EXTENSIONS: list[str] = [".mp4", ".mov", ".webm", ".avi"]
    ALLOWED_VIDEO_MIME_TYPES: list[str] = [
        "video/mp4",
        "video/quicktime",
        "video/webm",
        "video/x-msvideo",
        "video/avi",
        "application/octet-stream",
    ]
    S3_BUCKET: str = "safemove-videos"
    S3_ENDPOINT: str = "http://localhost:9000"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
