from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/athlete",
    tags=["Athlete Profile"]
)

@router.get("/profile", response_model=schemas.AthleteResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "athlete":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only athletes have profiles"
        )
        
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete profile does not exist"
        )
    return athlete

@router.post("/profile", response_model=schemas.AthleteResponse)
def save_profile(profile_data: schemas.AthleteCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "athlete":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only athletes have profiles"
        )
        
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if athlete:
        # Update existing profile
        for key, value in profile_data.model_dump(exclude_unset=True).items():
            setattr(athlete, key, value)
    else:
        # Create new profile
        athlete = models.Athlete(
            user_id=current_user.user_id,
            **profile_data.model_dump()
        )
        db.add(athlete)
        
    db.commit()
    db.refresh(athlete)
    return athlete
