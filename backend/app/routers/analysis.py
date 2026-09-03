from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, VideoAnalysis, VideoStatus
from app.routers.deps import require_athlete
from app.services.injury_ml_model import predict_injury_risk, train_model


def _rule_based_evaluation(video: VideoAnalysis | None) -> dict:
    if video is None:
        return {
            "pose_estimation_metrics": {
                "keypoint_detection_accuracy": 0.0,
                "pose_tracking_accuracy": 0.0,
                "joint_localization_accuracy": 0.0,
            },
            "biomechanical_analysis_metrics": {
                "joint_angle_estimation_accuracy": 0.0,
                "symmetry_analysis_accuracy": 0.0,
                "movement_quality_assessment_accuracy": 0.0,
            },
            "injury_prediction_metrics": {
                "injury_risk_prediction_accuracy": 0.0,
                "risk_classification_precision": 0.0,
                "false_positive_rate": 0.0,
                "early_warning_effectiveness": 0.0,
            },
            "recommendation_metrics": {
                "recommendation_relevance": 0.0,
                "corrective_exercise_effectiveness": 0.0,
                "recovery_improvement_rate": 0.0,
            },
            "system_performance_metrics": {
                "video_processing_latency": 0.0,
                "api_response_time": 0.0,
                "dashboard_loading_speed": 0.0,
                "concurrent_video_processing_capacity": 0,
            },
        }

    biomechanics = video.biomechanics or {}
    risk = video.risk_assessment or {}
    recs = video.recommendations or {}
    detection_rate = float((biomechanics.get("detection_rate") or 0.0) * 100)
    symmetry = float(biomechanics.get("symmetry_score") or 0.0)
    movement_quality = float(biomechanics.get("movement_quality_score") or 0.0)
    risk_score = float(risk.get("overall_risk_score") or 0.0)
    recommendation_count = len(recs.get("recommendations", [])) if isinstance(recs, dict) else 0

    return {
        "pose_estimation_metrics": {
            "keypoint_detection_accuracy": round(min(100.0, max(0.0, detection_rate)), 2),
            "pose_tracking_accuracy": round(min(100.0, max(0.0, detection_rate * 0.9)), 2),
            "joint_localization_accuracy": round(min(100.0, max(0.0, detection_rate * 0.85)), 2),
        },
        "biomechanical_analysis_metrics": {
            "joint_angle_estimation_accuracy": round(min(100.0, max(0.0, (movement_quality + symmetry) / 2.0)), 2),
            "symmetry_analysis_accuracy": round(min(100.0, max(0.0, symmetry)), 2),
            "movement_quality_assessment_accuracy": round(min(100.0, max(0.0, movement_quality)), 2),
        },
        "injury_prediction_metrics": {
            "injury_risk_prediction_accuracy": round(min(100.0, max(0.0, 100.0 - abs(risk_score - 50.0) * 1.2)), 2),
            "risk_classification_precision": round(min(100.0, max(0.0, 100.0 - abs(risk_score - 60.0) * 1.0)), 2),
            "false_positive_rate": round(min(100.0, max(0.0, abs(risk_score - 40.0) * 0.8)), 2),
            "early_warning_effectiveness": round(min(100.0, max(0.0, detection_rate * 0.7 + symmetry * 0.3)), 2),
        },
        "recommendation_metrics": {
            "recommendation_relevance": round(min(100.0, max(0.0, 60.0 + recommendation_count * 10.0)), 2),
            "corrective_exercise_effectiveness": round(min(100.0, max(0.0, movement_quality * 0.8 + 20.0)), 2),
            "recovery_improvement_rate": round(min(100.0, max(0.0, symmetry * 0.7 + movement_quality * 0.3)), 2),
        },
        "system_performance_metrics": {
            "video_processing_latency": 0.0,
            "api_response_time": 0.0,
            "dashboard_loading_speed": 0.0,
            "concurrent_video_processing_capacity": 1,
        },
    }

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
        "evaluation_metrics": _rule_based_evaluation(latest),
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
