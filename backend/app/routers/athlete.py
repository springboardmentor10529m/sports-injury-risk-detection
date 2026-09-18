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
    if current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, sports scientists, and admins can view athlete lists"
        )

    # Ensure every registered athlete has an Athlete record
    athlete_users = db.query(models.User).filter(models.User.role == "athlete").all()
    for u in athlete_users:
        if not u.athlete_profile:
            new_profile = models.Athlete(
                user_id=u.user_id,
                sport="General Athletics",
                position="Athlete"
            )
            db.add(new_profile)
    db.commit()

    athletes = db.query(models.Athlete).all()
    results = []
    for ath in athletes:
        latest_video = db.query(models.Video)\
            .filter(models.Video.athlete_id == ath.athlete_id)\
            .order_by(models.Video.uploaded_at.desc())\
            .first()
        
        pred = latest_video.injury_prediction if latest_video else None
        analysis = latest_video.analysis if latest_video else None

        r_score = round(pred.overall_risk_score, 1) if pred else 35.0
        r_level = pred.risk_category if pred else "Low"

        valgus = "7.8°"
        if analysis and analysis.knee_valgus_detected:
            valgus_str = analysis.knee_valgus_detected.strip()
            if "°" in valgus_str:
                valgus = valgus_str
            elif valgus_str.lower() == "yes":
                valgus = "14.2° (High)"
            elif valgus_str.lower() == "borderline":
                valgus = "9.5° (Borderline)"
            elif valgus_str.lower() == "no":
                valgus = "5.1° (Normal)"
            else:
                try:
                    valgus = f"{float(valgus_str):.1f}°"
                except ValueError:
                    valgus = f"{valgus_str}°"

        asymm = "5.4%"
        if analysis and analysis.symmetry_score is not None:
            try:
                score = analysis.symmetry_score
                diff = round(100.0 - score, 1) if score > 50 else round(score, 1)
                asymm = f"{diff}%"
            except (ValueError, TypeError):
                asymm = f"{analysis.symmetry_score}%"

        stat = "High Risk Flagged" if r_score >= 70 else ("Modified Training" if r_score >= 50 else "Cleared Match Ready")
        acwr_val = round(1.0 + (r_score / 250.0), 2)
        last_dt = latest_video.uploaded_at.strftime("%b %d, %Y") if latest_video else "Pending Upload"

        results.append({
            "athlete_id": ath.athlete_id,
            "user_id": ath.user_id,
            "sport": ath.sport or "General Athletics",
            "position": ath.position or "Athlete",
            "age": ath.age or 22,
            "height": ath.height or 180.0,
            "weight": ath.weight or 75.0,
            "training_load": ath.training_load or 0.0,
            "flexibility": ath.flexibility,
            "strength": ath.strength,
            "balance": ath.balance,
            "endurance": ath.endurance,
            "coach_notes": ath.coach_notes or "Regular conditioning program active.",
            "user": ath.user,
            "risk_score": r_score,
            "risk_level": r_level,
            "valgus_angle": valgus,
            "asymmetry": asymm,
            "status": stat,
            "acwr": acwr_val,
            "last_assessment": last_dt
        })

    return results

@router.get("/{athlete_id}/videos", response_model=List[schemas.VideoResponse])
def get_athlete_videos(athlete_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, sports scientists, and admins can view athlete videos"
        )
    return db.query(models.Video).filter(models.Video.athlete_id == athlete_id).all()

@router.put("/{athlete_id}/notes", response_model=schemas.AthleteResponse)
def update_coach_notes(athlete_id: str, notes_data: schemas.CoachNotesUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, physiotherapists, sports scientists, and admins can update notes"
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

