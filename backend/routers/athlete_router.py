from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
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

@router.get("/all")
def get_all_athletes(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Returns all registered athletes with their profiles, user information, video counts,
    and latest biomechanical screening results for coach overview.
    """
    athletes = db.query(models.Athlete).join(models.User).order_by(models.User.name.asc()).all()
    
    results = []
    for ath in athletes:
        user = ath.user
        if not user:
            continue
            
        video_count = db.query(models.Video).filter(models.Video.user_id == user.user_id).count()
        
        # Latest completed analysis result if any
        latest_res = db.query(models.AnalysisResult).filter(
            models.AnalysisResult.athlete_id == ath.athlete_id
        ).order_by(models.AnalysisResult.created_at.desc()).first()
        
        latest_risk = None
        if latest_res:
            latest_risk = {
                "overall_score": round(latest_res.overall_risk_score, 1),
                "risk_level": latest_res.risk_level,
                "valgus": round(latest_res.joint_alignment or 8.5, 1),
                "symmetry": round(latest_res.symmetry_score or 12.0, 1),
                "analysis_id": latest_res.analysis_id,
                "screened_at": str(latest_res.created_at)[:10] if latest_res.created_at else None
            }
            
        results.append({
            "athlete_id": ath.athlete_id,
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "sport": ath.sport or "General Sports",
            "position": ath.position or "Athlete",
            "age": ath.age or 21,
            "height": ath.height or 180.0,
            "weight": ath.weight or 75.0,
            "training_load": ath.training_load or 50.0,
            "flexibility": ath.flexibility or 70.0,
            "strength": ath.strength or 75.0,
            "balance": ath.balance or 80.0,
            "endurance": ath.endurance or 70.0,
            "coach_notes": ath.coach_notes or "",
            "video_count": video_count,
            "injury_count": len(ath.injury_histories),
            "previous_injuries": [f"{h.body_part} ({h.injury_type})" for h in ath.injury_histories],
            "latest_risk": latest_risk
        })
    return results

@router.put("/{athlete_id}/notes")
def update_athlete_coach_notes(
    athlete_id: str,
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    athlete.coach_notes = payload.get("coach_notes", "")
    db.commit()
    db.refresh(athlete)
    return {"message": "Coach notes updated successfully", "athlete_id": athlete_id, "coach_notes": athlete.coach_notes}

@router.get("/injuries", response_model=List[schemas.InjuryHistoryOut])
def get_athlete_injuries(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Returns all logged previous injuries for the authenticated athlete.
    """
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        return []
    return db.query(models.InjuryHistory).filter(models.InjuryHistory.athlete_id == athlete.athlete_id).order_by(models.InjuryHistory.injury_date.desc().nullslast()).all()

@router.post("/injuries", response_model=schemas.InjuryHistoryOut)
def add_athlete_injury(
    injury_data: schemas.InjuryHistoryCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Logs a past medical/musculoskeletal injury for the authenticated athlete.
    This directly informs the 20% Injury History Factor in the Biomechanical Risk Engine.
    """
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        athlete = models.Athlete(user_id=current_user.user_id)
        db.add(athlete)
        db.commit()
        db.refresh(athlete)

    new_injury = models.InjuryHistory(
        athlete_id=athlete.athlete_id,
        injury_type=injury_data.injury_type,
        body_part=injury_data.body_part,
        severity=injury_data.severity or "MODERATE",
        injury_date=injury_data.injury_date,
        recovery_date=injury_data.recovery_date,
        remarks=injury_data.remarks
    )
    db.add(new_injury)
    db.commit()
    db.refresh(new_injury)
    return new_injury

@router.delete("/injuries/{injury_id}")
def delete_athlete_injury(
    injury_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Deletes an injury history record belonging to the authenticated athlete.
    """
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    injury = db.query(models.InjuryHistory).filter(
        models.InjuryHistory.injury_id == injury_id,
        models.InjuryHistory.athlete_id == athlete.athlete_id
    ).first()

    if not injury:
        raise HTTPException(status_code=404, detail="Injury record not found or access denied")

    db.delete(injury)
    db.commit()
    return {"message": "Injury record deleted successfully", "injury_id": injury_id}

