from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.routers.deps import require_athlete
from app.schemas import AthleteProfileOut, AthleteProfileUpdate

router = APIRouter(prefix="/api/athlete", tags=["athlete"])


@router.get("/profile", response_model=AthleteProfileOut)
def get_profile(current_user: User = Depends(require_athlete)):
    return current_user.athlete_profile


@router.patch("/profile", response_model=AthleteProfileOut)
def update_profile(
    payload: AthleteProfileUpdate,
    current_user: User = Depends(require_athlete),
    db: Session = Depends(get_db),
):
    profile = current_user.athlete_profile
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
