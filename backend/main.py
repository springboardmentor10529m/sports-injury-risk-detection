from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    User,
    Athlete,
    PerformanceRecord,
    Video,
    AnalysisResult,
    InjuryPrediction,
    Recommendation,
    InjuryHistory
)
from schemas import (
    UserCreate,
    AthleteCreate,
    PerformanceRecordCreate,
    InjuryHistoryCreate
)
from typing import Optional, List, Dict, Any

import uuid
import os
import re
import shutil
from datetime import datetime

from pose_engine import extract_pose_landmarks_from_video
from biomechanics import analyze_biomechanics_from_frames
from risk_rules import calculate_injury_predictions
from dataset_loader import get_datasets_summary, get_population_benchmarks
from feature_engineering import detect_biomechanical_anomalies, build_engineered_feature_vector
from recommendation_engine import generate_targeted_recommendations
from ml_pipeline import ml_interface
from init_db import init_database

app = FastAPI(title="Sports Injury Risk Detection API")

@app.on_event("startup")
def on_startup():
    try:
        init_database()
    except Exception as e:
        print(f"Database initialization note on startup: {e}")
    try:
        train_stats = ml_interface.train_baseline_model()
        print(f"SportShield ML baseline model trained on Project-Injury-Dataset.csv at startup: {train_stats}")
    except Exception as e:
        print(f"ML baseline training note: {e}")

import hashlib

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5177",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

cors_env = os.getenv("CORS_ORIGINS", "")
if cors_env.strip():
    cors_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
else:
    cors_origins = DEFAULT_CORS_ORIGINS

if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}
ALLOWED_VIDEO_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
}


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"pbkdf2_sha256${salt}${pwd_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if not hashed_password.startswith("pbkdf2_sha256$"):
        return plain_password == hashed_password
    parts = hashed_password.split("$")
    if len(parts) != 3:
        return False
    salt = parts[1]
    stored_hash = parts[2]
    pwd_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return pwd_hash == stored_hash


def parse_uuid(value: str, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format."
        ) from exc

# Static file serving for uploaded videos
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Sports Injury Risk Detection API is running!",
        "database": "PostgreSQL connected"
    }


# =========================================================
# REGISTER USER
# =========================================================

@app.post("/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # Check if email is already registered
    normalized_email = user.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists. Please sign in."
        )

    new_user = User(
        user_id=uuid.uuid4(),
        name=user.name,
        email=normalized_email,
        password=hash_password(user.password),
        role=user.role,
        phone=user.phone,
        profile_image=user.profile_image,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(new_user.user_id)
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    email = email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Account not found with this email."
        )

    if not verify_password(password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid password. Please try again."
        )

    return {
        "message": "Login successful",
        "user_id": str(user.user_id),
        "name": user.name,
        "role": user.role
    }


# =========================================================
# CREATE / UPDATE ATHLETE PROFILE
# =========================================================

@app.post("/athlete")
def create_or_update_athlete(
    athlete: AthleteCreate,
    db: Session = Depends(get_db)
):
    user_uuid = parse_uuid(athlete.user_id, "user_id")

    existing_athlete = db.query(Athlete).filter(Athlete.user_id == user_uuid).first()
    if existing_athlete:
        existing_athlete.sport = athlete.sport
        existing_athlete.position = athlete.position
        existing_athlete.age = athlete.age
        existing_athlete.height = athlete.height
        existing_athlete.weight = athlete.weight
        existing_athlete.training_load = athlete.training_load
        existing_athlete.flexibility = athlete.flexibility
        existing_athlete.strength = athlete.strength
        existing_athlete.balance = athlete.balance
        existing_athlete.endurance = athlete.endurance
        existing_athlete.training_level = athlete.training_level
        existing_athlete.gender = athlete.gender
        existing_athlete.coach_notes = athlete.coach_notes

        db.commit()
        db.refresh(existing_athlete)

        return {
            "message": "Athlete profile updated successfully",
            "athlete_id": str(existing_athlete.athlete_id)
        }

    new_athlete = Athlete(
        athlete_id=uuid.uuid4(),
        user_id=user_uuid,
        sport=athlete.sport,
        position=athlete.position,
        age=athlete.age,
        height=athlete.height,
        weight=athlete.weight,
        training_load=athlete.training_load,
        flexibility=athlete.flexibility,
        strength=athlete.strength,
        balance=athlete.balance,
        endurance=athlete.endurance,
        training_level=athlete.training_level,
        gender=athlete.gender,
        coach_notes=athlete.coach_notes
    )

    db.add(new_athlete)
    db.commit()
    db.refresh(new_athlete)

    return {
        "message": "Athlete created successfully",
        "athlete_id": str(new_athlete.athlete_id)
    }


# =========================================================
# CREATE PERFORMANCE
# =========================================================

@app.post("/performance")
def create_performance(
    record: PerformanceRecordCreate,
    db: Session = Depends(get_db)
):

    new_record = PerformanceRecord(
        record_id=uuid.uuid4(),
        athlete_id=uuid.UUID(record.athlete_id),
        activity=record.activity,
        score=record.score,
        remarks=record.remarks,
        recorded_at=datetime.utcnow()
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "message": "Performance record added successfully",
        "record_id": str(new_record.record_id)
    }


# =========================================================
# VIDEO UPLOAD
# =========================================================

@app.post("/video/upload")
def upload_video(
    athlete_id: str = Form(...),
    activity: str = Form(...),
    video: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    athlete_uuid = parse_uuid(athlete_id, "athlete_id")
    activity = activity.strip()
    if not activity:
        raise HTTPException(status_code=400, detail="Activity is required.")

    if not video.filename:
        raise HTTPException(status_code=400, detail="Video file is required.")

    file_extension = os.path.splitext(video.filename)[1].lower()
    if file_extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video format. Use MP4, MOV, WEBM, or MKV."
        )

    if video.content_type and video.content_type not in ALLOWED_VIDEO_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video content type."
        )

    video_id = uuid.uuid4()
    upload_folder = "uploads"

    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    file_name = f"{video_id}{file_extension}"
    file_path = os.path.join(upload_folder, file_name)

    total_size = 0
    with open(file_path, "wb") as buffer:
        while True:
            chunk = video.file.read(1024 * 1024)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_VIDEO_SIZE_BYTES:
                buffer.close()
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail="Video file exceeds the 50 MB upload limit."
                )
            buffer.write(chunk)

    new_video = Video(
        video_id=video_id,
        athlete_id=athlete_uuid,
        activity=activity,
        video_url=file_path,
        processing_status="uploaded",
        uploaded_at=datetime.utcnow()
    )

    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    return {
        "message": "Video uploaded successfully",
        "video_id": str(new_video.video_id),
        "video_url": f"/uploads/{file_name}",
        "processing_status": new_video.processing_status
    }


# =========================================================
# REAL POSE & BIOMECHANICAL ANALYSIS
# =========================================================

@app.post("/analysis")
def create_analysis(
    video_id: str = Form(...),
    athlete_id: str = Form(...),
    db: Session = Depends(get_db)
):
    video_uuid = parse_uuid(video_id, "video_id")
    athlete_uuid = parse_uuid(athlete_id, "athlete_id")

    video_record = db.query(Video).filter(Video.video_id == video_uuid).first()
    if not video_record:
        raise HTTPException(status_code=404, detail="Video record not found.")

    athlete_record = db.query(Athlete).filter(Athlete.athlete_id == athlete_uuid).first()

    # Determine local video file path
    local_video_path = video_record.video_url
    if not os.path.exists(local_video_path) and local_video_path.startswith("/uploads/"):
        local_video_path = os.path.join("uploads", os.path.basename(local_video_path))

    # 1. Run Pose Estimation Engine on real video
    try:
        pose_output = extract_pose_landmarks_from_video(local_video_path)
        frames_data = pose_output.get("frames_data", [])
        video_info = pose_output.get("video_info", {})
        video_record.fps = int(video_info.get("fps", 30))
        video_record.resolution = video_info.get("resolution", "")
        video_record.duration = video_info.get("duration_sec", 0.0)
    except Exception as err:
        print(f"Pose estimation error: {err}")
        frames_data = []

    # 2. Run Biomechanical Feature Calculations
    biomechanics = analyze_biomechanics_from_frames(frames_data)

    # 3. Look up athlete prior injury history
    try:
        athlete_injuries = db.query(InjuryHistory).filter(InjuryHistory.athlete_id == athlete_uuid).all()
        prior_injuries_list = [
            {
                "body_part": inj.body_part,
                "injury_type": inj.injury_type,
                "severity": inj.severity,
                "months_ago": inj.months_ago,
                "fully_recovered": inj.fully_recovered
            }
            for inj in athlete_injuries
        ]
    except Exception as err:
        print(f"Defensive warning: error querying athlete injury history: {err}")
        prior_injuries_list = []

    # 4. Run Rule-Based Risk Calculations incorporating athlete position & physical metrics & prior injuries
    position = athlete_record.position if athlete_record else ""
    t_load = athlete_record.training_load if (athlete_record and athlete_record.training_load is not None) else 70.0
    flex = athlete_record.flexibility if (athlete_record and athlete_record.flexibility is not None) else 75.0
    strength = athlete_record.strength if (athlete_record and athlete_record.strength is not None) else 80.0
    balance = athlete_record.balance if (athlete_record and athlete_record.balance is not None) else 82.0

    risk_eval = calculate_injury_predictions(
        biomechanics=biomechanics,
        athlete_position=position,
        training_load=t_load,
        flexibility=flex,
        strength=strength,
        balance=balance,
        prior_injuries=prior_injuries_list
    )

    # 5. Detect Biomechanical Anomalies against population benchmarks
    detected_activity = biomechanics.get("detected_activity", video_record.activity)
    anomalies = detect_biomechanical_anomalies(biomechanics, activity_type=detected_activity)

    # 6. Execute Supervised Machine Learning Risk Prediction (Random Forest)
    rpe_fatigue = (biomechanics.get("fatigue_score", 20.0) / 10.0) if biomechanics.get("fatigue_score") else 5.0
    ml_eval = None
    try:
        ml_eval = ml_interface.predict_risk(
            features={
                "knee_valgus_angle_deg": biomechanics.get("knee_valgus", 12.0),
                "hip_stability_score": biomechanics.get("hip_stability", 80.0),
                "trunk_lateral_flexion_deg": biomechanics.get("trunk_lean", 8.0),
                "range_of_motion_deg": biomechanics.get("range_of_motion_deg", 105.0),
                "bilateral_symmetry_pct": biomechanics.get("symmetry_score", 85.0),
                "movement_smoothness_score": biomechanics.get("movement_quality", 80.0),
                "rpe_fatigue_score": rpe_fatigue,
            }
        )
    except Exception as ml_err:
        print(f"ML evaluation note in /analysis: {ml_err}")

    final_risk_level = ml_eval["risk_level"].capitalize() if ml_eval and ml_eval.get("risk_level") else risk_eval["risk_level"]
    final_risk_score = int(round(ml_eval["predicted_risk_score"])) if ml_eval and ml_eval.get("predicted_risk_score") is not None else int(round(risk_eval["overall_risk_score"]))

    analysis_id = uuid.uuid4()

    new_analysis = AnalysisResult(
        analysis_id=analysis_id,
        video_id=video_uuid,
        athlete_id=athlete_uuid,
        knee_valgus=biomechanics["knee_valgus"],
        hip_stability=biomechanics["hip_stability"],
        trunk_lean=biomechanics["trunk_lean"],
        stride_length=biomechanics["stride_length"],
        joint_alignment=biomechanics["joint_alignment"],
        symmetry_score=biomechanics["symmetry_score"],
        fatigue_score=biomechanics["fatigue_score"],
        movement_quality=biomechanics["movement_quality"],
        overall_risk_score=final_risk_score,
        risk_level=final_risk_level,
        created_at=datetime.utcnow()
    )

    video_record.processing_status = "completed"
    video_record.quality_score = biomechanics["movement_quality"]
    if biomechanics.get("detected_activity"):
        video_record.activity = biomechanics["detected_activity"]

    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)

    return {
        "message": "Real video pose estimation and biomechanical analysis completed successfully",
        "analysis_id": str(new_analysis.analysis_id),
        "detected_activity": detected_activity,
        "overall_risk_score": new_analysis.overall_risk_score,
        "risk_level": new_analysis.risk_level,
        "knee_valgus": new_analysis.knee_valgus,
        "hip_stability": new_analysis.hip_stability,
        "trunk_lean": new_analysis.trunk_lean,
        "stride_length": new_analysis.stride_length,
        "joint_alignment": new_analysis.joint_alignment,
        "symmetry_score": new_analysis.symmetry_score,
        "fatigue_score": new_analysis.fatigue_score,
        "movement_quality": new_analysis.movement_quality,
        "sampled_frames_count": len(frames_data),
        "biomechanical_details": biomechanics.get("biomechanical_details", []),
        "position_applied_msg": risk_eval.get("position_applied_msg", ""),
        "rules_triggered": risk_eval.get("rules_triggered", []),
        "anomalies": anomalies,
        "history_notes": risk_eval.get("history_notes", []),
        "feature_contributions": risk_eval.get("feature_contributions", {})
    }


# =========================================================
# RULE-BASED INJURY PREDICTION
# =========================================================

@app.post("/prediction")
def create_prediction(
    analysis_id: str = Form(...),
    db: Session = Depends(get_db)
):
    analysis_uuid = parse_uuid(analysis_id, "analysis_id")

    analysis_record = db.query(AnalysisResult).filter(AnalysisResult.analysis_id == analysis_uuid).first()
    if not analysis_record:
        raise HTTPException(status_code=404, detail="Analysis result record not found.")

    athlete_record = db.query(Athlete).filter(Athlete.athlete_id == analysis_record.athlete_id).first()

    try:
        athlete_injuries = db.query(InjuryHistory).filter(InjuryHistory.athlete_id == analysis_record.athlete_id).all()
        prior_injuries_list = [
            {
                "body_part": inj.body_part,
                "injury_type": inj.injury_type,
                "severity": inj.severity,
                "months_ago": inj.months_ago,
                "fully_recovered": inj.fully_recovered
            }
            for inj in athlete_injuries
        ]
    except Exception as err:
        print(f"Defensive warning: error querying athlete injury history in prediction: {err}")
        prior_injuries_list = []

    biomechanics = {
        "knee_valgus": analysis_record.knee_valgus or 12.0,
        "trunk_lean": analysis_record.trunk_lean or 8.0,
        "symmetry_score": analysis_record.symmetry_score or 85.0,
        "hip_stability": analysis_record.hip_stability or 80.0,
        "fatigue_score": analysis_record.fatigue_score or 20.0,
        "movement_quality": analysis_record.movement_quality or 84.0,
        "range_of_motion_deg": 65.0
    }

    position = athlete_record.position if athlete_record else ""
    t_load = athlete_record.training_load if (athlete_record and athlete_record.training_load is not None) else 70.0
    flex = athlete_record.flexibility if (athlete_record and athlete_record.flexibility is not None) else 75.0
    strength = athlete_record.strength if (athlete_record and athlete_record.strength is not None) else 80.0
    balance = athlete_record.balance if (athlete_record and athlete_record.balance is not None) else 82.0

    risk_eval = calculate_injury_predictions(
        biomechanics=biomechanics,
        athlete_position=position,
        training_load=t_load,
        flexibility=flex,
        strength=strength,
        balance=balance,
        prior_injuries=prior_injuries_list
    )

    anomalies = detect_biomechanical_anomalies(biomechanics)

    prediction_id = uuid.uuid4()

    new_prediction = InjuryPrediction(
        prediction_id=prediction_id,
        analysis_id=analysis_uuid,
        acl_risk=risk_eval["acl_risk"],
        hamstring_risk=risk_eval["hamstring_risk"],
        ankle_risk=risk_eval["ankle_risk"],
        shoulder_risk=risk_eval["shoulder_risk"],
        lower_back_risk=risk_eval["lower_back_risk"],
        overuse_risk=risk_eval["overuse_risk"]
    )
    db.add(new_prediction)

    # Auto-generate targeted recommendations across 5 categories
    recs_data = generate_targeted_recommendations(
        biomechanics=biomechanics,
        risk_prediction=risk_eval,
        anomalies=anomalies,
        training_load=t_load,
        rpe_score=analysis_record.fatigue_score / 10.0 if analysis_record.fatigue_score else 5.0
    )

    auto_rec = Recommendation(
        recommendation_id=uuid.uuid4(),
        prediction_id=prediction_id,
        exercise=recs_data["summary_strings"]["exercise"],
        mobility=recs_data["summary_strings"]["mobility"],
        strengthening=recs_data["summary_strings"]["strengthening"],
        recovery=recs_data["summary_strings"]["recovery"],
        training_modification=recs_data["summary_strings"]["training_modification"]
    )
    db.add(auto_rec)
    db.commit()
    db.refresh(new_prediction)

    # Compute ML Model inference from trained Random Forest model
    rpe_fatigue = (analysis_record.fatigue_score / 10.0) if analysis_record.fatigue_score else 5.0
    ml_eval = None
    try:
        ml_eval = ml_interface.predict_risk(
            features={
                "knee_valgus_angle_deg": biomechanics.get("knee_valgus", 12.0),
                "hip_stability_score": biomechanics.get("hip_stability", 80.0),
                "trunk_lateral_flexion_deg": biomechanics.get("trunk_lean", 8.0),
                "range_of_motion_deg": biomechanics.get("range_of_motion_deg", 105.0),
                "bilateral_symmetry_pct": biomechanics.get("symmetry_score", 85.0),
                "movement_smoothness_score": biomechanics.get("movement_quality", 80.0),
                "rpe_fatigue_score": rpe_fatigue,
            }
        )
    except Exception as ml_err:
        print(f"ML evaluation note: {ml_err}")

    final_risk_level = ml_eval["risk_level"].capitalize() if ml_eval and ml_eval.get("risk_level") else risk_eval["risk_level"]
    final_risk_score = int(round(ml_eval["predicted_risk_score"])) if ml_eval and ml_eval.get("predicted_risk_score") is not None else int(round(risk_eval["overall_risk_score"]))

    # Update analysis record overall risk score and level to match ML model prediction
    analysis_record.overall_risk_score = final_risk_score
    analysis_record.risk_level = final_risk_level
    db.commit()

    return {
        "message": "Movement risk analysis and recommendations generated successfully",
        "prediction_id": str(new_prediction.prediction_id),
        "acl_risk": new_prediction.acl_risk,
        "hamstring_risk": new_prediction.hamstring_risk,
        "ankle_risk": new_prediction.ankle_risk,
        "shoulder_risk": new_prediction.shoulder_risk,
        "lower_back_risk": new_prediction.lower_back_risk,
        "overuse_risk": new_prediction.overuse_risk,
        "overall_risk_score": final_risk_score,
        "risk_level": final_risk_level,
        "rules_triggered": risk_eval.get("rules_triggered", []),
        "injury_factors": risk_eval.get("injury_factors", {}),
        "position_applied_msg": risk_eval.get("position_applied_msg", ""),
        "history_notes": risk_eval.get("history_notes", []),
        "feature_contributions": risk_eval.get("feature_contributions", {}),
        "anomalies": anomalies,
        "recommendations": recs_data,
        "ml_probability": ml_eval.get("ml_probability") if ml_eval else None,
        "ml_prediction": ml_eval
    }




# =========================================================
# CREATE RECOMMENDATION
# =========================================================

@app.post("/recommendation")
def create_recommendation(
    prediction_id: str = Form(...),
    exercise: str = Form(...),
    mobility: str = Form(...),
    strengthening: str = Form(...),
    recovery: str = Form(...),
    training_modification: str = Form(...),
    db: Session = Depends(get_db)
):

    recommendation_id = uuid.uuid4()

    new_recommendation = Recommendation(
        recommendation_id=recommendation_id,
        prediction_id=uuid.UUID(prediction_id),
        exercise=exercise,
        mobility=mobility,
        strengthening=strengthening,
        recovery=recovery,
        training_modification=training_modification
    )

    db.add(new_recommendation)
    db.commit()
    db.refresh(new_recommendation)

    return {
        "message": "Recommendation created successfully",
        "recommendation_id": str(
            new_recommendation.recommendation_id
        ),
        "exercise": new_recommendation.exercise,
        "mobility": new_recommendation.mobility,
        "strengthening": new_recommendation.strengthening,
        "recovery": new_recommendation.recovery,
        "training_modification": new_recommendation.training_modification
    }


# =========================================================
# GET QUERIES (NON-BREAKING DATA RETRIEVAL)
# =========================================================

@app.get("/athlete/{identifier}")
def get_athlete(identifier: str, db: Session = Depends(get_db)):
    try:
        query_uuid = uuid.UUID(identifier)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Check by athlete_id first, then by user_id
    athlete = db.query(Athlete).filter(
        (Athlete.athlete_id == query_uuid) | (Athlete.user_id == query_uuid)
    ).first()

    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete profile not found")

    user = db.query(User).filter(User.user_id == athlete.user_id).first()

    return {
        "athlete_id": str(athlete.athlete_id),
        "user_id": str(athlete.user_id),
        "name": user.name if user else "",
        "email": user.email if user else "",
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
        "training_level": athlete.training_level,
        "gender": athlete.gender,
        "coach_notes": athlete.coach_notes
    }


@app.get("/performance/{athlete_id}")
def get_performance_records(athlete_id: str, db: Session = Depends(get_db)):
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    records = db.query(PerformanceRecord).filter(
        PerformanceRecord.athlete_id == athlete_uuid
    ).order_by(PerformanceRecord.recorded_at.desc()).all()

    return [
        {
            "record_id": str(r.record_id),
            "athlete_id": str(r.athlete_id),
            "activity": r.activity,
            "score": r.score,
            "remarks": r.remarks,
            "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None
        }
        for r in records
    ]


@app.get("/videos/{athlete_id}")
def get_athlete_videos(athlete_id: str, db: Session = Depends(get_db)):
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    videos = db.query(Video).filter(
        Video.athlete_id == athlete_uuid
    ).order_by(Video.uploaded_at.desc()).all()

    return [
        {
            "video_id": str(v.video_id),
            "athlete_id": str(v.athlete_id),
            "activity": v.activity,
            "video_url": f"/uploads/{os.path.basename(v.video_url)}" if v.video_url else "",
            "duration": v.duration,
            "fps": v.fps,
            "resolution": v.resolution,
            "quality_score": v.quality_score,
            "processing_status": v.processing_status,
            "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None
        }
        for v in videos
    ]


@app.get("/analysis/{athlete_id}")
def get_athlete_analysis(athlete_id: str, db: Session = Depends(get_db)):
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    analyses = db.query(AnalysisResult).filter(
        AnalysisResult.athlete_id == athlete_uuid
    ).order_by(AnalysisResult.created_at.desc()).all()

    return [
        {
            "analysis_id": str(a.analysis_id),
            "video_id": str(a.video_id),
            "athlete_id": str(a.athlete_id),
            "knee_valgus": a.knee_valgus,
            "hip_stability": a.hip_stability,
            "trunk_lean": a.trunk_lean,
            "stride_length": a.stride_length,
            "joint_alignment": a.joint_alignment,
            "symmetry_score": a.symmetry_score,
            "fatigue_score": a.fatigue_score,
            "movement_quality": a.movement_quality,
            "overall_risk_score": a.overall_risk_score,
            "risk_level": a.risk_level,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in analyses
    ]


@app.get("/prediction/{analysis_id}")
def get_prediction(analysis_id: str, db: Session = Depends(get_db)):
    try:
        analysis_uuid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID format")

    prediction = db.query(InjuryPrediction).filter(
        InjuryPrediction.analysis_id == analysis_uuid
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found for this analysis")

    return {
        "prediction_id": str(prediction.prediction_id),
        "analysis_id": str(prediction.analysis_id),
        "acl_risk": prediction.acl_risk,
        "hamstring_risk": prediction.hamstring_risk,
        "ankle_risk": prediction.ankle_risk,
        "shoulder_risk": prediction.shoulder_risk,
        "lower_back_risk": prediction.lower_back_risk,
        "overuse_risk": prediction.overuse_risk
    }


# =========================================================
# VIDEOS WITH ANALYSIS — history + results joined
# =========================================================

@app.get("/videos/with-analysis/{athlete_id}")
def get_videos_with_analysis(athlete_id: str, db: Session = Depends(get_db)):
    """Returns all videos for an athlete, each joined with its latest analysis result.
    Used by the Upload History to support click-to-view previous analyses."""
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    videos = db.query(Video).filter(
        Video.athlete_id == athlete_uuid
    ).order_by(Video.uploaded_at.desc()).all()

    result = []
    for v in videos:
        analysis = db.query(AnalysisResult).filter(
            AnalysisResult.video_id == v.video_id
        ).order_by(AnalysisResult.created_at.desc()).first()

        prediction = None
        recommendation = None
        if analysis:
            prediction = db.query(InjuryPrediction).filter(
                InjuryPrediction.analysis_id == analysis.analysis_id
            ).first()
            if prediction:
                recommendation = db.query(Recommendation).filter(
                    Recommendation.prediction_id == prediction.prediction_id
                ).first()

        result.append({
            "video_id": str(v.video_id),
            "athlete_id": str(v.athlete_id),
            "activity": v.activity,
            "video_url": f"/uploads/{os.path.basename(v.video_url)}" if v.video_url else "",
            "duration": v.duration,
            "fps": v.fps,
            "resolution": v.resolution,
            "quality_score": v.quality_score,
            "processing_status": v.processing_status,
            "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
            "analysis": {
                "analysis_id": str(analysis.analysis_id),
                "knee_valgus": analysis.knee_valgus,
                "hip_stability": analysis.hip_stability,
                "trunk_lean": analysis.trunk_lean,
                "stride_length": analysis.stride_length,
                "joint_alignment": analysis.joint_alignment,
                "symmetry_score": analysis.symmetry_score,
                "fatigue_score": analysis.fatigue_score,
                "movement_quality": analysis.movement_quality,
                "overall_risk_score": analysis.overall_risk_score,
                "risk_level": analysis.risk_level,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "prediction": {
                    "prediction_id": str(prediction.prediction_id),
                    "acl_risk": prediction.acl_risk,
                    "hamstring_risk": prediction.hamstring_risk,
                    "ankle_risk": prediction.ankle_risk,
                    "shoulder_risk": prediction.shoulder_risk,
                    "lower_back_risk": prediction.lower_back_risk,
                    "overuse_risk": prediction.overuse_risk,
                } if prediction else None,
                "recommendation": {
                    "recommendation_id": str(recommendation.recommendation_id),
                    "exercise": recommendation.exercise,
                    "mobility": recommendation.mobility,
                    "strengthening": recommendation.strengthening,
                    "recovery": recommendation.recovery,
                    "training_modification": recommendation.training_modification,
                } if recommendation else None,
            } if analysis else None
        })

    return result


# =========================================================
# ANALYSIS DETAIL — single analysis with prediction + recs
# =========================================================

@app.get("/analysis/detail/{analysis_id}")
def get_analysis_detail(analysis_id: str, db: Session = Depends(get_db)):
    """Returns a single analysis result with its prediction and recommendation.
    Used by the Upload History click-to-view feature."""
    try:
        analysis_uuid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID format")

    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.analysis_id == analysis_uuid
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    prediction = db.query(InjuryPrediction).filter(
        InjuryPrediction.analysis_id == analysis_uuid
    ).first()

    recommendation = None
    if prediction:
        recommendation = db.query(Recommendation).filter(
            Recommendation.prediction_id == prediction.prediction_id
        ).first()

    video = db.query(Video).filter(
        Video.video_id == analysis.video_id
    ).first()

    return {
        "analysis_id": str(analysis.analysis_id),
        "video_id": str(analysis.video_id),
        "athlete_id": str(analysis.athlete_id),
        "activity": video.activity if video else "",
        "knee_valgus": analysis.knee_valgus,
        "hip_stability": analysis.hip_stability,
        "trunk_lean": analysis.trunk_lean,
        "stride_length": analysis.stride_length,
        "joint_alignment": analysis.joint_alignment,
        "symmetry_score": analysis.symmetry_score,
        "fatigue_score": analysis.fatigue_score,
        "movement_quality": analysis.movement_quality,
        "overall_risk_score": analysis.overall_risk_score,
        "risk_level": analysis.risk_level,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "prediction": {
            "prediction_id": str(prediction.prediction_id),
            "acl_risk": prediction.acl_risk,
            "hamstring_risk": prediction.hamstring_risk,
            "ankle_risk": prediction.ankle_risk,
            "shoulder_risk": prediction.shoulder_risk,
            "lower_back_risk": prediction.lower_back_risk,
            "overuse_risk": prediction.overuse_risk,
        } if prediction else None,
        "recommendation": {
            "recommendation_id": str(recommendation.recommendation_id),
            "exercise": recommendation.exercise,
            "mobility": recommendation.mobility,
            "strengthening": recommendation.strengthening,
            "recovery": recommendation.recovery,
            "training_modification": recommendation.training_modification,
        } if recommendation else None,
    }


@app.get("/recommendation/{prediction_id}")
def get_recommendation(prediction_id: str, db: Session = Depends(get_db)):
    try:
        prediction_uuid = uuid.UUID(prediction_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid prediction ID format")

    rec = db.query(Recommendation).filter(
        Recommendation.prediction_id == prediction_uuid
    ).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found for this prediction")

    return {
        "recommendation_id": str(rec.recommendation_id),
        "prediction_id": str(rec.prediction_id),
        "exercise": rec.exercise,
        "mobility": rec.mobility,
        "strengthening": rec.strengthening,
        "recovery": rec.recovery,
        "training_modification": rec.training_modification
    }


# =========================================================
# DATASET & POPULATION BENCHMARK ENDPOINTS
# =========================================================

@app.get("/datasets/summary")
def api_get_datasets_summary():
    """Returns load status and record counts for all 3 mentor datasets."""
    return get_datasets_summary()


@app.get("/datasets/benchmarks")
def api_get_population_benchmarks(activity: Optional[str] = None):
    """Returns normative empirical population benchmarks derived from Project-Injury-Dataset.csv."""
    return get_population_benchmarks(activity_type=activity)


# =========================================================
# ML ARCHITECTURE & HONESTY STATUS ENDPOINT
# =========================================================

@app.get("/ml/status")
def api_get_ml_status():
    """
    Returns transparent status of active ML models and rule systems in SportShield:
    - MediaPipe PoseLandmarker (Active Vision ML)
    - Kinematic activity classifier (Active Rules)
    - Biomechanical risk calculation (Active Deterministic Rules v2.1)
    """
    return ml_interface.get_system_architecture_status()


# =========================================================
# ATHLETE INJURY HISTORY ENDPOINTS
# =========================================================

@app.get("/athlete/{athlete_id}/injuries")
def get_athlete_injuries(athlete_id: str, db: Session = Depends(get_db)):
    """Retrieve all logged prior injuries for an athlete."""
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    injuries = db.query(InjuryHistory).filter(
        InjuryHistory.athlete_id == athlete_uuid
    ).order_by(InjuryHistory.recorded_at.desc()).all()

    return [
        {
            "injury_id": str(i.injury_id),
            "athlete_id": str(i.athlete_id),
            "injury_type": i.injury_type,
            "body_part": i.body_part,
            "severity": i.severity,
            "months_ago": i.months_ago,
            "fully_recovered": i.fully_recovered,
            "notes": i.notes,
            "recorded_at": i.recorded_at.isoformat() if i.recorded_at else None
        }
        for i in injuries
    ]


@app.post("/athlete/{athlete_id}/injuries")
def add_athlete_injury(
    athlete_id: str,
    payload: InjuryHistoryCreate,
    db: Session = Depends(get_db)
):
    """Record a past or present injury for an athlete."""
    try:
        athlete_uuid = uuid.UUID(athlete_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid athlete ID format")

    athlete = db.query(Athlete).filter(Athlete.athlete_id == athlete_uuid).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete record not found")

    new_injury = InjuryHistory(
        injury_id=uuid.uuid4(),
        athlete_id=athlete_uuid,
        injury_type=payload.injury_type.strip(),
        body_part=payload.body_part.strip(),
        severity=payload.severity or "Moderate",
        months_ago=payload.months_ago or 0,
        fully_recovered=payload.fully_recovered if payload.fully_recovered is not None else 1,
        notes=payload.notes.strip() if payload.notes else None,
        recorded_at=datetime.utcnow()
    )

    db.add(new_injury)
    db.commit()
    db.refresh(new_injury)

    return {
        "message": "Prior injury history recorded successfully",
        "injury_id": str(new_injury.injury_id),
        "athlete_id": str(new_injury.athlete_id),
        "injury_type": new_injury.injury_type,
        "body_part": new_injury.body_part,
        "severity": new_injury.severity,
        "months_ago": new_injury.months_ago,
        "fully_recovered": new_injury.fully_recovered,
        "notes": new_injury.notes
    }


@app.delete("/athlete/{athlete_id}/injuries/{injury_id}")
def delete_athlete_injury(athlete_id: str, injury_id: str, db: Session = Depends(get_db)):
    """Delete a recorded prior injury for an athlete."""
    try:
        injury_uuid = uuid.UUID(injury_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid injury ID format")

    injury_record = db.query(InjuryHistory).filter(InjuryHistory.injury_id == injury_uuid).first()
    if not injury_record:
        raise HTTPException(status_code=404, detail="Injury record not found")

    db.delete(injury_record)
    db.commit()

    return {"message": "Injury record removed successfully", "injury_id": injury_id}


@app.post("/athlete/injury-history")
def add_athlete_injury_legacy(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Legacy route compatibility for recorded prior injuries."""
    athlete_id = payload.get("athlete_id")
    if not athlete_id:
        raise HTTPException(status_code=400, detail="athlete_id is required")
    create_payload = InjuryHistoryCreate(
        injury_type=payload.get("injury_type", "General Strain"),
        body_part=payload.get("body_part", "Knee"),
        severity=payload.get("severity", "Moderate"),
        months_ago=int(payload.get("months_ago", 0)),
        fully_recovered=int(payload.get("fully_recovered", 1)),
        notes=payload.get("notes", "")
    )
    return add_athlete_injury(athlete_id=athlete_id, payload=create_payload, db=db)


