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
    Recommendation
)
from schemas import (
    UserCreate,
    AthleteCreate,
    PerformanceRecordCreate
)

import uuid
import os
import re
import shutil
from datetime import datetime

app = FastAPI(title="Sports Injury Risk Detection API")

import hashlib

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
# CREATE DEMO ANALYSIS RESULT
# =========================================================

@app.post("/analysis")
def create_analysis(
    video_id: str = Form(...),
    athlete_id: str = Form(...),
    db: Session = Depends(get_db)
):

    analysis_id = uuid.uuid4()

    new_analysis = AnalysisResult(
        analysis_id=analysis_id,
        video_id=uuid.UUID(video_id),
        athlete_id=uuid.UUID(athlete_id),

        # DEMO VALUES
        # These will later come from the AI model.

        knee_valgus=15.0,
        hip_stability=80.0,
        trunk_lean=10.0,
        stride_length=1.2,
        joint_alignment=85.0,
        symmetry_score=82.0,
        fatigue_score=25.0,
        movement_quality=78.0,

        overall_risk_score=30.0,
        risk_level="Low",

        created_at=datetime.utcnow()
    )

    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)

    return {
        "message": "Analysis completed successfully",
        "analysis_id": str(new_analysis.analysis_id),
        "overall_risk_score": new_analysis.overall_risk_score,
        "risk_level": new_analysis.risk_level,
        "knee_valgus": new_analysis.knee_valgus,
        "hip_stability": new_analysis.hip_stability,
        "trunk_lean": new_analysis.trunk_lean,
        "stride_length": new_analysis.stride_length,
        "joint_alignment": new_analysis.joint_alignment,
        "symmetry_score": new_analysis.symmetry_score,
        "fatigue_score": new_analysis.fatigue_score,
        "movement_quality": new_analysis.movement_quality
    }


# =========================================================
# CREATE DEMO INJURY PREDICTION
# =========================================================

@app.post("/prediction")
def create_prediction(
    analysis_id: str = Form(...),
    db: Session = Depends(get_db)
):

    prediction_id = uuid.uuid4()

    new_prediction = InjuryPrediction(
        prediction_id=prediction_id,
        analysis_id=uuid.UUID(analysis_id),

        # DEMO VALUES
        # Actual AI prediction will replace these later.

        acl_risk=20.0,
        hamstring_risk=15.0,
        ankle_risk=10.0,
        shoulder_risk=5.0,
        lower_back_risk=12.0,
        overuse_risk=25.0
    )

    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return {
        "message": "Injury prediction generated successfully",
        "prediction_id": str(new_prediction.prediction_id),
        "acl_risk": new_prediction.acl_risk,
        "hamstring_risk": new_prediction.hamstring_risk,
        "ankle_risk": new_prediction.ankle_risk,
        "shoulder_risk": new_prediction.shoulder_risk,
        "lower_back_risk": new_prediction.lower_back_risk,
        "overuse_risk": new_prediction.overuse_risk
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
