# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, status
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import text

from app.config import settings
from app.database import get_db
from app.api.auth import router as auth_router
from app.api.athletes import router as athletes_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Authentication Routes under both /api/v1 and root
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(auth_router)

# Include Athlete Routes under both /api/v1 and root
app.include_router(athletes_router, prefix=settings.API_V1_STR)
app.include_router(athletes_router)

@app.get("/", tags=["Root"])
def read_root():
    """
    Root endpoint providing basic API health and metadata.
    """
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "status": "online",
    }


@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint verifying application status and database connectivity.
    """
    db_status = "healthy"
    try:
        # Execute lightweight ping query
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
    }
