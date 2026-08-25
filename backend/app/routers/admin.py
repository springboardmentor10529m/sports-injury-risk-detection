from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.models import User, UserRole, VideoAnalysis, VideoStatus
from app.routers.deps import require_admin
from app.schemas import AdminCreateUserRequest, AdminUserOut, AdminUserUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def platform_stats(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users_by_role = dict(db.query(User.role, func.count(User.id)).group_by(User.role).all())
    total_users = sum(users_by_role.values())

    videos_by_status = dict(db.query(VideoAnalysis.status, func.count(VideoAnalysis.id)).group_by(VideoAnalysis.status).all())
    total_videos = sum(videos_by_status.values())

    completed = db.query(VideoAnalysis).filter(VideoAnalysis.status == VideoStatus.COMPLETED).all()
    avg_risk = None
    if completed:
        scores = [v.risk_assessment["overall_risk_score"] for v in completed if v.risk_assessment]
        if scores:
            avg_risk = round(sum(scores) / len(scores), 2)

    return {
        "total_users": total_users,
        "users_by_role": {r.value if hasattr(r, "value") else r: c for r, c in users_by_role.items()},
        "total_videos_processed": total_videos,
        "videos_by_status": {s.value if hasattr(s, "value") else s: c for s, c in videos_by_status.items()},
        "avg_risk_score_platform_wide": avg_risk,
        "active_users": db.query(User).filter(User.is_active == True).count(),  # noqa: E712
        "deactivated_users": db.query(User).filter(User.is_active == False).count(),  # noqa: E712
    }


@router.get("/users", response_model=list[AdminUserOut])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def update_user(user_id: str, payload: AdminUserUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == current_user.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.post("/users", response_model=AdminUserOut, status_code=201)
def create_user(payload: AdminCreateUserRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """The spec-compliant channel for creating additional admin (or any
    role's) accounts without a full profile - profile-less staff accounts.
    For athlete/coach/physio/scientist accounts with full profiles, use the
    normal /api/auth/register* endpoints instead."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password),
        full_name=payload.full_name, role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
