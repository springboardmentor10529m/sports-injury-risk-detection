from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sports Injury Risk Detection"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "SUPER_SECRET_KEY_DEVELOPMENT_ONLY"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 Hours

    # Database URL loaded from .env file
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/sports_injury_db"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
