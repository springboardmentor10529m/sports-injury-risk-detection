from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/injury",
    tags=["Injury Prediction"]
)

@router.get("/predictions/athlete/{athlete_id}", response_model=List[schemas.InjuryPredictionResponse])
def get_athlete_predictions(
    athlete_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical injury predictions for a specific athlete."""
    # Authorization checks
    if current_user.role == "athlete":
        athlete_profile = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete_profile or athlete_profile.athlete_id != athlete_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this athlete's data."
            )
    elif current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    predictions = db.query(models.InjuryPrediction)\
        .filter(models.InjuryPrediction.athlete_id == athlete_id)\
        .order_by(models.InjuryPrediction.created_at.desc())\
        .all()
    return predictions

@router.get("/prediction/video/{video_id}", response_model=schemas.InjuryPredictionResponse)
def get_video_prediction(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve injury risk prediction for a specific video assessment."""
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.video_id == video_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No injury risk predictions found for this video assessment."
        )

    # Authorization checks
    if current_user.role == "athlete":
        athlete_profile = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete_profile or athlete_profile.athlete_id != prediction.athlete_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied."
            )
    elif current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    return prediction

@router.get("/predictions/team", response_model=List[schemas.InjuryPredictionResponse])
def get_team_predictions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the latest injury risk prediction for all athletes."""
    if current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    # Fetch the most recent prediction per athlete
    subquery = db.query(
        models.InjuryPrediction.athlete_id,
        models.InjuryPrediction.prediction_id
    ).distinct(models.InjuryPrediction.athlete_id)\
     .order_by(models.InjuryPrediction.athlete_id, models.InjuryPrediction.created_at.desc())\
     .subquery()

    predictions = db.query(models.InjuryPrediction)\
        .join(subquery, models.InjuryPrediction.prediction_id == subquery.c.prediction_id)\
        .all()

    return predictions
