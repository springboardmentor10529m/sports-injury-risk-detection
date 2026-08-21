"""Central APIRouter for v1."""

from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analysis,
    analytics,
    athletes,
    auth,
    recommendations,
    risk,
    users,
    videos,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(athletes.router, prefix="/athletes", tags=["Athletes"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
