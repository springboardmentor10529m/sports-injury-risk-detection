from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
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

@router.get("/list", response_model=List[schemas.AthleteDetailedResponse])
def list_athletes(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["coach", "physiotherapist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, and admins can view athlete lists"
        )
    return db.query(models.Athlete).all()

@router.get("/{athlete_id}/videos", response_model=List[schemas.VideoResponse])
def get_athlete_videos(athlete_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["coach", "physiotherapist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, and admins can view athlete videos"
        )
    return db.query(models.Video).filter(models.Video.athlete_id == athlete_id).all()

@router.put("/{athlete_id}/notes", response_model=schemas.AthleteResponse)
def update_coach_notes(athlete_id: str, notes_data: schemas.CoachNotesUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["coach", "physiotherapist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, and admins can update notes"
        )
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found"
        )
    athlete.coach_notes = notes_data.coach_notes
    db.commit()
    db.refresh(athlete)
    return athlete

