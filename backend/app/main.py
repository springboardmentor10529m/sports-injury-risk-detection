"""
Main FastAPI application for SafeMove Platform.
SafeMove API provides decision-support analytics for sports injury risk detection.
It is NOT a diagnostic tool.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import SafeMoveException
from app.db.postgresql import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema
    await init_db()
    yield
    # Shutdown: Close DB connections here


app = FastAPI(
    title=settings.APP_NAME,
    description="SafeMove API for AI-Powered Sports Injury Risk Detection (Decision Support Only - Not for Diagnosis)",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SafeMoveException)
async def safemove_exception_handler(request: Request, exc: SafeMoveException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail, "error_code": exc.__class__.__name__},
    )


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to ensure API is running."""
    return {"status": "ok", "version": settings.VERSION}


@app.get("/api/docs", include_in_schema=False)
async def api_docs_redirect():
    return RedirectResponse(url="/docs")


@app.get("/api/openapi.json", include_in_schema=False)
async def api_openapi_redirect():
    return RedirectResponse(url="/openapi.json")


app.include_router(api_router, prefix="/api/v1")
