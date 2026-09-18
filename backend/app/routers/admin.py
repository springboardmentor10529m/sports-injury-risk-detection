from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/admin",
    tags=["Administration & Platform Management"]
)

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all registered users across all roles."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@router.put("/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: str,
    payload: schemas.RoleUpdateRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to reassign a user's role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    valid_roles = ["athlete", "coach", "physiotherapist", "sports_scientist", "admin"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role must be one of: {', '.join(valid_roles)}")

    target_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)
    return target_user

@router.get("/metrics", response_model=schemas.SystemMetricsResponse)
def get_system_metrics(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Return platform operational throughput, health stats, and risk distributions."""
    if current_user.role not in ["admin", "sports_scientist"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    total_users = db.query(models.User).count()
    total_athletes = db.query(models.Athlete).count()
    total_videos = db.query(models.Video).count()
    total_analyses = db.query(models.BiomechanicsAnalysis).count()
    total_predictions = db.query(models.InjuryPrediction).count()

    predictions = db.query(models.InjuryPrediction).all()
    risk_dist = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
    for p in predictions:
        cat = p.risk_category or "Low"
        risk_dist[cat] = risk_dist.get(cat, 0) + 1

    users = db.query(models.User).all()
    role_dist = {}
    for u in users:
        r = u.role or "athlete"
        role_dist[r] = role_dist.get(r, 0) + 1

    return {
        "total_users": total_users,
        "total_athletes": total_athletes,
        "total_videos": total_videos,
        "total_analyses": total_analyses,
        "total_predictions": total_predictions,
        "risk_distribution": risk_dist,
        "role_distribution": role_dist
    }
