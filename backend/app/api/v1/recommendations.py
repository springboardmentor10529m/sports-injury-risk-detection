"""Recommendations endpoints."""
from fastapi import APIRouter
from app.schemas.recommendation import RecommendationResponse, RecommendationStatusUpdate

router = APIRouter()

@router.get("/athlete/{id}", response_model=list[RecommendationResponse])
async def get_recommendations(id: str):
    """Get recommendations for an athlete based on latest risk report."""
    raise NotImplementedError("Phase 6 implementation")

@router.put("/{id}/status", response_model=RecommendationResponse)
async def update_recommendation_status(id: str, status_in: RecommendationStatusUpdate):
    """Update status of a recommendation (e.g. COMPLETED, DISMISSED)."""
    raise NotImplementedError("Phase 6 implementation")
