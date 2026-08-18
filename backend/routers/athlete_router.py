from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import database, models, schemas, auth

router = APIRouter(prefix="/api/athletes", tags=["Athletes"])

@router.get("/profile", response_model=schemas.AthleteOut)
def get_athlete_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        athlete = models.Athlete(user_id=current_user.user_id)
        db.add(athlete)
        db.commit()
        db.refresh(athlete)
    return athlete

@router.put("/profile", response_model=schemas.AthleteOut)
def update_athlete_profile(
    profile_data: schemas.AthleteCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        athlete = models.Athlete(user_id=current_user.user_id)
        db.add(athlete)

    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(athlete, field, value)

    db.commit()
    db.refresh(athlete)
    return athlete
