from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.athlete import Athlete
from app.models.user import User

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
            sport="Not Specified",
            position="N/A",
            age=0,
            height=0.0,
            weight=0.0,
            training_load=0.0,
            flexibility=0.0,
            strength=0.0,
            balance=0.0,
            endurance=0.0,
            coach_notes="No notes available.",
        )
        db.add(athlete)
        db.commit()
        db.refresh(athlete)

    # Return unified payload for React frontend
    return {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone or "+91 0000000000",
        "sport": athlete.sport,
        "position": athlete.position,
        "age": athlete.age,
        "height": athlete.height,
        "weight": athlete.weight,
        "training_load": athlete.training_load,
        "flexibility": athlete.flexibility,
        "strength": athlete.strength,
        "balance": athlete.balance,
        "endurance": athlete.endurance,
        "coach_notes": athlete.coach_notes,
        "riskScore": 0,
        "riskStatus": "Low Risk",
        "lastAssessment": "N/A",
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
    if profile.phone:
        user.phone = profile.phone

    # Update athlete metric columns in Supabase
    update_data = profile.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key != "phone" and hasattr(athlete, key):
            setattr(athlete, key, value)

    db.commit()
    db.refresh(athlete)
    db.refresh(user)

    return {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "sport": athlete.sport,
        "position": athlete.position,
        "age": athlete.age,
        "height": athlete.height,
        "weight": athlete.weight,
        "training_load": athlete.training_load,
        "flexibility": athlete.flexibility,
        "strength": athlete.strength,
        "balance": athlete.balance,
        "endurance": athlete.endurance,
        "coach_notes": athlete.coach_notes,
        "riskScore": 0,
        "riskStatus": "Low Risk",
        "lastAssessment": "N/A",
    }
