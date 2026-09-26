import os

# Ensure the SQLite DB path points consistently to sports_injury.db in backend
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "sports_injury.db")

class Settings:
    PROJECT_NAME: str = "Sports Injury Risk Detection Platform"
    
    # Database Configuration
    # Defaults to SQLite if DATABASE_URL is not set.
    # To use PostgreSQL, set DATABASE_URL="postgresql://username:password@localhost/dbname"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "8c12a76f2d93ee8a49c9ad64fa3bfe7e8e50b1de57fbcd8c1605e5d1be8b7b25")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Video Upload Directory
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
