from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, VideoAnalysis, VideoStatus
from app.routers.deps import require_athlete
from app.services.injury_ml_model import predict_injury_risk, train_model

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class InjuryRiskFeatures(BaseModel):
    weekly_training_hours: float = Field(..., ge=0)
    acute_chronic_ratio: float | None = Field(default=None)
    previous_injury_count: int = Field(default=0, ge=0)
    days_since_last_injury: int | None = Field(default=None, ge=0)
    current_pain_flag: bool = Field(default=False)
    fatigue_score: float = Field(default=0.0, ge=0, le=100)
    symmetry_score: float = Field(default=100.0, ge=0, le=100)
    knee_valgus_avg_pct: float = Field(default=0.0, ge=0, le=100)
    trunk_lean_avg_deg: float = Field(default=0.0, ge=0, le=100)


@router.get("/dashboard-summary")
def dashboard_summary(current_user: User = Depends(require_athlete), db: Session = Depends(get_db)):
    videos = (
        db.query(VideoAnalysis)
        .filter(
            VideoAnalysis.athlete_id == current_user.athlete_profile.id,
            VideoAnalysis.status == VideoStatus.COMPLETED,
        )
        .order_by(VideoAnalysis.completed_at.desc())
        .all()
    )

    if not videos:
        return {
            "has_data": False,
            "message": "No completed analyses yet. Upload a movement video to get your first risk assessment.",
        }

    latest = videos[0]
    previous = videos[1] if len(videos) > 1 else None

    latest_risk = latest.risk_assessment["overall_risk_score"]
    delta = None
    if previous:
        delta = round(latest_risk - previous.risk_assessment["overall_risk_score"], 2)

    return {
        "has_data": True,
        "latest_video_id": latest.id,
        "current_risk_score": latest_risk,
        "current_risk_category": latest.risk_assessment["risk_category"],
        "risk_change_from_previous": delta,
        "movement_quality_score": latest.biomechanics.get("movement_quality_score"),
        "symmetry_score": latest.biomechanics.get("symmetry_score"),
        "fatigue_score": latest.biomechanics.get("fatigue_score"),
        "hip_stability_score": latest.biomechanics.get("hip_stability_score"),
        "recommendations": latest.recommendations,
        "total_analyses": len(videos),
    }


@router.get("/risk-history")
def risk_history(current_user: User = Depends(require_athlete), db: Session = Depends(get_db)):
    videos = (
        db.query(VideoAnalysis)
        .filter(
            VideoAnalysis.athlete_id == current_user.athlete_profile.id,
            VideoAnalysis.status == VideoStatus.COMPLETED,
        )
        .order_by(VideoAnalysis.completed_at.asc())
        .all()
    )
    return [
        {
            "video_id": v.id,
            "date": v.completed_at,
            "activity_type": v.activity_type,
            "overall_risk_score": v.risk_assessment["overall_risk_score"],
            "risk_category": v.risk_assessment["risk_category"],
        }
        for v in videos
    ]


@router.post("/ml/train")
def train_ml_model():
    metrics = train_model()
    return {
        "message": "ML training complete",
        "metrics": metrics,
        "model_path": "/app/app/ml_models/injury_risk_model.joblib",
    }


@router.post("/ml/predict")
def predict_ml_risk(payload: InjuryRiskFeatures):
    features = payload.model_dump()
    return predict_injury_risk(features)
