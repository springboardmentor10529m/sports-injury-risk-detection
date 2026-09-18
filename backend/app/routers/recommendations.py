import json
from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/recommendations",
    tags=["Corrective Recommendations"]
)

# Comprehensive sports medicine corrective exercise database
EXERCISE_LIBRARY = [
    {
        "target_injury_risk": "ACL Injury Risk",
        "title": "Banded Spanish Squats & Hip External Rotations",
        "category": "Strengthening",
        "sets_reps": "3 sets x 12 reps",
        "frequency": "4x per week",
        "description": "Anchor resistance band behind knees. Perform controlled squats to isolate quadriceps without anterior shear. Follow with clamshells to strengthen gluteus medius and prevent medial knee collapse."
    },
    {
        "target_injury_risk": "ACL Injury Risk",
        "title": "Single-Leg Deceleration Landings",
        "category": "Technique",
        "sets_reps": "3 sets x 8 reps per leg",
        "frequency": "3x per week",
        "description": "Step off a 6-inch box and land softly on one foot, absorbing shock through ankle dorsiflexion and deep knee/hip flexion without knee caving inward."
    },
    {
        "target_injury_risk": "Hamstring Strain",
        "title": "Nordic Hamstring Curls (Eccentric)",
        "category": "Strengthening",
        "sets_reps": "3 sets x 6 reps",
        "frequency": "2-3x per week",
        "description": "Kneel with ankles secured. Lower torso forward under strict control for 4-5 seconds. Push back up using hands. Maximizes eccentric knee flexor strength."
    },
    {
        "target_injury_risk": "Hamstring Strain",
        "title": "Single-Leg Romanian Deadlift (RDL)",
        "category": "Mobility",
        "sets_reps": "3 sets x 10 reps per leg",
        "frequency": "3x per week",
        "description": "Hinge at the hip keeping back neutral and rear leg extended. Reach toward opposite foot to build hamstring tension and pelvic stability."
    },
    {
        "target_injury_risk": "Ankle Sprain",
        "title": "Proprioceptive Single-Leg Balance on Foam Pad",
        "category": "Recovery",
        "sets_reps": "4 sets x 30s per leg",
        "frequency": "Daily",
        "description": "Stand barefoot on an unstable balance pad or folded towel. Perform gentle head turns to train subtalar joint neuromuscular stabilization."
    },
    {
        "target_injury_risk": "Ankle Sprain",
        "title": "Weighted Ankle Dorsiflexion Band Drills",
        "category": "Mobility",
        "sets_reps": "3 sets x 15 reps",
        "frequency": "4x per week",
        "description": "Loop thick resistance band around ankle talus while lunging knee forward over toes to restore restricted closed-chain dorsiflexion."
    },
    {
        "target_injury_risk": "Lower Back Strain",
        "title": "McGill Big 3 (Bird-Dog, Side Plank, Curl-Up)",
        "category": "Technique",
        "sets_reps": "3 sets x 8 reps (hold 5s)",
        "frequency": "Daily",
        "description": "Targeted core endurance complex building 360-degree spinal stiffness without spine flexion loads, correcting excessive trunk forward tilt."
    },
    {
        "target_injury_risk": "Shoulder Impingement",
        "title": "Prone Y-T-W Scapular Retractions",
        "category": "Strengthening",
        "sets_reps": "3 sets x 10 reps each",
        "frequency": "3x per week",
        "description": "Lie prone and lift arms in Y, T, and W shapes with thumbs pointed up. Engages lower trapezius and serratus anterior for overhead stabilization."
    },
    {
        "target_injury_risk": "Knee Valgus",
        "title": "Lateral Band Walks with Monster Steps",
        "category": "Strengthening",
        "sets_reps": "3 sets x 20 steps each direction",
        "frequency": "4x per week",
        "description": "Place resistance band around ankles or mid-feet. In quarter-squat stance, take controlled lateral steps keeping feet pointed straight ahead."
    }
]

@router.get("/library")
def get_exercise_library():
    """Return the pre-configured sports medicine corrective exercise database."""
    return EXERCISE_LIBRARY

@router.get("/athlete/{athlete_id}", response_model=List[schemas.CorrectiveRecommendationResponse])
def get_athlete_recommendations(
    athlete_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve corrective recommendations assigned to an athlete."""
    if current_user.role == "athlete":
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete or athlete.athlete_id != athlete_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    recs = db.query(models.CorrectiveRecommendation)\
        .filter(models.CorrectiveRecommendation.athlete_id == athlete_id)\
        .order_by(models.CorrectiveRecommendation.created_at.desc())\
        .all()
    
    # If no recommendations exist yet, automatically initialize based on library
    if not recs:
        initial_recs = []
        for template in EXERCISE_LIBRARY[:4]:
            rec = models.CorrectiveRecommendation(
                athlete_id=athlete_id,
                target_injury_risk=template["target_injury_risk"],
                title=template["title"],
                category=template["category"],
                sets_reps=template["sets_reps"],
                frequency=template["frequency"],
                description=template["description"],
                completed=False
            )
            db.add(rec)
            initial_recs.append(rec)
        db.commit()
        for r in initial_recs:
            db.refresh(r)
        return initial_recs

    return recs

@router.post("/athlete/{athlete_id}/generate", response_model=List[schemas.CorrectiveRecommendationResponse])
def generate_recommendations_for_athlete(
    athlete_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Dynamically generate tailored corrective recommendations based on latest biomechanics and predictions."""
    if current_user.role == "athlete":
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete or athlete.athlete_id != athlete_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    latest_pred = db.query(models.InjuryPrediction)\
        .filter(models.InjuryPrediction.athlete_id == athlete_id)\
        .order_by(models.InjuryPrediction.created_at.desc())\
        .first()

    matched_templates = []
    
    if latest_pred:
        # Check risks and match corresponding corrective drills
        if latest_pred.acl_risk_prob > 35.0:
            matched_templates.extend([e for e in EXERCISE_LIBRARY if e["target_injury_risk"] == "ACL Injury Risk"])
        if latest_pred.hamstring_risk_prob > 30.0:
            matched_templates.extend([e for e in EXERCISE_LIBRARY if e["target_injury_risk"] == "Hamstring Strain"])
        if latest_pred.ankle_risk_prob > 30.0:
            matched_templates.extend([e for e in EXERCISE_LIBRARY if e["target_injury_risk"] == "Ankle Sprain"])
        if latest_pred.back_risk_prob > 30.0:
            matched_templates.extend([e for e in EXERCISE_LIBRARY if e["target_injury_risk"] == "Lower Back Strain"])
        if latest_pred.shoulder_risk_prob > 25.0:
            matched_templates.extend([e for e in EXERCISE_LIBRARY if e["target_injury_risk"] == "Shoulder Impingement"])

    # Fallback to general foundation templates if no high risk identified
    if not matched_templates:
        matched_templates = EXERCISE_LIBRARY[:3]

    created = []
    for template in matched_templates[:5]:
        # Check if already exists for this athlete
        existing = db.query(models.CorrectiveRecommendation)\
            .filter(
                models.CorrectiveRecommendation.athlete_id == athlete_id,
                models.CorrectiveRecommendation.title == template["title"]
            ).first()
        if not existing:
            rec = models.CorrectiveRecommendation(
                athlete_id=athlete_id,
                video_id=latest_pred.video_id if latest_pred else None,
                target_injury_risk=template["target_injury_risk"],
                title=template["title"],
                category=template["category"],
                sets_reps=template["sets_reps"],
                frequency=template["frequency"],
                description=template["description"],
                completed=False
            )
            db.add(rec)
            created.append(rec)

    db.commit()
    for r in created:
        db.refresh(r)

    return db.query(models.CorrectiveRecommendation)\
        .filter(models.CorrectiveRecommendation.athlete_id == athlete_id)\
        .order_by(models.CorrectiveRecommendation.created_at.desc())\
        .all()

@router.put("/{recommendation_id}/toggle", response_model=schemas.CorrectiveRecommendationResponse)
def toggle_recommendation_completed(
    recommendation_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle completed status for a corrective recommendation drill."""
    rec = db.query(models.CorrectiveRecommendation)\
        .filter(models.CorrectiveRecommendation.recommendation_id == recommendation_id)\
        .first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.completed = not rec.completed
    db.commit()
    db.refresh(rec)
    return rec
