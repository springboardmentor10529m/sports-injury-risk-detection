from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, VideoAnalysis, VideoStatus
from app.routers.deps import require_athlete

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


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
