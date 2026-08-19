from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.athlete import Athlete
from app.models.user import User
from app.models.video import VideoAnalysis

router = APIRouter(prefix="/athletes", tags=["Athletes"])


class AthleteProfileUpdate(BaseModel):
    phone: Optional[str] = ""
    sport: Optional[str] = ""
    position: Optional[str] = ""
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    training_load: Optional[float] = None
    flexibility: Optional[float] = None
    strength: Optional[float] = None
    balance: Optional[float] = None
    endurance: Optional[float] = None
    coach_notes: Optional[str] = ""


def get_email_from_token(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer bearer-token-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token.",
        )
    return authorization.replace("Bearer bearer-token-", "")


@router.get("/all")
def get_all_athletes(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
):
    """Retrieve all athletes for Coach and Physio dashboards."""
    email = get_email_from_token(authorization)
    current_user = db.query(User).filter(User.email == email).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch all users with athlete role
    athlete_users = db.query(User).filter(User.role.ilike("athlete")).all()
    results = []

    for u in athlete_users:
        athlete = db.query(Athlete).filter(Athlete.user_id == u.user_id).first()
        latest_video = (
            db.query(VideoAnalysis)
            .filter(VideoAnalysis.user_id == u.user_id)
            .order_by(VideoAnalysis.created_at.desc())
            .first()
        )

        results.append({
            "id": str(u.user_id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone or "",
            "sport": athlete.sport if athlete and athlete.sport != "Not Specified" else "",
            "position": athlete.position if athlete and athlete.position != "N/A" else "",
            "age": athlete.age if athlete else 0,
            "height": athlete.height if athlete else 0,
            "weight": athlete.weight if athlete else 0,
            "trainingLoad": athlete.training_load if athlete else 0,
            "flexibility": athlete.flexibility if athlete else 0,
            "strength": athlete.strength if athlete else 0,
            "balance": athlete.balance if athlete else 0,
            "endurance": athlete.endurance if athlete else 0,
            "coachNotes": athlete.coach_notes if athlete else "",
            "riskScore": latest_video.risk_score if latest_video else 0,
            "riskStatus": latest_video.risk_status if latest_video else "Not Screened",
            "lastAssessment": latest_video.created_at.strftime("%Y-%m-%d %H:%M") if latest_video and latest_video.created_at else "Never",
        })

    return results


@router.get("/me")
def get_my_profile(
    authorization: Optional[str] = Header(None), db: Session = Depends(get_db)
):
    email = get_email_from_token(authorization)

    # 1. Fetch user account from database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    # 2. Fetch athlete metrics row linked to user_id
    athlete = db.query(Athlete).filter(Athlete.user_id == user.user_id).first()

    # 3. Create initial default athlete metrics if not present yet
    if not athlete:
        athlete = Athlete(
            user_id=user.user_id,
            sport="",
            position="",
            age=0,
            height=0.0,
            weight=0.0,
            training_load=0.0,
            flexibility=0.0,
            strength=0.0,
            balance=0.0,
            endurance=0.0,
            coach_notes="",
        )
        db.add(athlete)
        db.commit()
        db.refresh(athlete)

    # 4. Fetch latest video assessment if any
    latest_video = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.user_id == user.user_id)
        .order_by(VideoAnalysis.created_at.desc())
        .first()
    )

    # Return unified payload for React frontend
    return {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone or "",
        "sport": athlete.sport if athlete.sport != "Not Specified" else "",
        "position": athlete.position if athlete.position != "N/A" else "",
        "age": athlete.age or 0,
        "height": athlete.height or 0,
        "weight": athlete.weight or 0,
        "training_load": athlete.training_load or 0,
        "flexibility": athlete.flexibility or 0,
        "strength": athlete.strength or 0,
        "balance": athlete.balance or 0,
        "endurance": athlete.endurance or 0,
        "coach_notes": athlete.coach_notes or "",
        "riskScore": latest_video.risk_score if latest_video else 0,
        "riskStatus": latest_video.risk_status if latest_video else "Not Screened",
        "lastAssessment": latest_video.created_at.strftime("%Y-%m-%d %H:%M") if latest_video and latest_video.created_at else "Never",
    }


@router.put("/me")
def update_my_profile(
    profile: AthleteProfileUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    email = get_email_from_token(authorization)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    athlete = db.query(Athlete).filter(Athlete.user_id == user.user_id).first()
    if not athlete:
        athlete = Athlete(user_id=user.user_id)
        db.add(athlete)

    # Update user phone if sent
    if profile.phone is not None:
        user.phone = profile.phone

    # Update athlete metric columns in Supabase
    update_data = profile.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key != "phone" and hasattr(athlete, key):
            setattr(athlete, key, value)

    db.commit()
    db.refresh(athlete)
    db.refresh(user)

    latest_video = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.user_id == user.user_id)
        .order_by(VideoAnalysis.created_at.desc())
        .first()
    )

    return {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone or "",
        "sport": athlete.sport or "",
        "position": athlete.position or "",
        "age": athlete.age or 0,
        "height": athlete.height or 0,
        "weight": athlete.weight or 0,
        "training_load": athlete.training_load or 0,
        "flexibility": athlete.flexibility or 0,
        "strength": athlete.strength or 0,
        "balance": athlete.balance or 0,
        "endurance": athlete.endurance or 0,
        "coach_notes": athlete.coach_notes or "",
        "riskScore": latest_video.risk_score if latest_video else 0,
        "riskStatus": latest_video.risk_status if latest_video else "Not Screened",
        "lastAssessment": latest_video.created_at.strftime("%Y-%m-%d %H:%M") if latest_video and latest_video.created_at else "Never",
    }
