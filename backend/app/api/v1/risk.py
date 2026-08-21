"""Risk endpoints."""
from fastapi import APIRouter
from app.schemas.risk import RiskScoreResponse, RiskHistoryResponse, RiskBreakdownResponse

router = APIRouter()

@router.get("/athlete/{id}/current", response_model=RiskScoreResponse)
async def get_current_risk(id: str):
    """Get current risk score. Note: Risk scores are decision-support signals, not clinical diagnoses."""
    raise NotImplementedError("Phase 5 implementation")

@router.get("/athlete/{id}/history", response_model=RiskHistoryResponse)
async def get_risk_history(id: str):
    """Get historical risk trends for athlete."""
    raise NotImplementedError("Phase 5 implementation")

@router.get("/team/{team_id}")
async def get_team_risk_summary(team_id: str):
    """Get risk summary for all athletes in a team."""
    raise NotImplementedError("Phase 5 implementation")

@router.get("/athlete/{id}/breakdown", response_model=RiskBreakdownResponse)
async def get_risk_breakdown(id: str):
    """Get per-injury-category risk breakdown."""
    raise NotImplementedError("Phase 5 implementation")
