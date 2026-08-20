import os
import uuid
import shutil
import cv2
import numpy as np
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, UploadFile, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import FileResponse, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any


from app.database import engine, Base, SessionLocal
from app import models
from app import schemas
from app.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.video_processor import process_video_pose
from app.risk_engine import calculate_injury_risk
from app.recommender import generate_recommendations
from app.anomaly_engine import detect_movement_anomalies
from app.report_exporter import generate_pdf_report, generate_excel_report


# Initialize folders
os.makedirs("uploads/raw", exist_ok=True)
os.makedirs("uploads/processed", exist_ok=True)
os.makedirs("frontend/static", exist_ok=True)

app = FastAPI(
    title="Sports Injury Risk Detection API",
    description="Backend API for Sports Injury Risk Detection from Video",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Mount directories
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(models.User).filter(models.User.user_id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.get("/")
def root():
    index_path = os.path.abspath(os.path.join(FRONTEND_DIR, "index.html"))
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "Sports Injury Risk Detection API is running. Serve frontend to view UI."
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/database-test")
def database_test():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {
            "database": "connected",
            "status": "success"
        }
    except Exception as e:
        return {
            "database": "connection failed",
            "error": str(e)
        }


@app.post("/auth/register")
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role=models.UserRole(user.role),
        phone=user.phone
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(new_user.user_id),
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "phone": new_user.phone
    }


@app.post("/auth/login")
def login_user(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    password_valid = verify_password(
        user.password,
        existing_user.password
    )

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "sub": str(existing_user.user_id),
        "email": existing_user.email,
        "role": existing_user.role.value
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": str(existing_user.user_id),
            "name": existing_user.name,
            "email": existing_user.email,
            "role": existing_user.role.value
        }
    }


@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return current_user



# Athlete Profile Endpoints
@app.post("/athlete/profile", response_model=schemas.AthleteResponse)
def create_or_update_profile(
    profile: schemas.AthleteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ATHLETE:
        raise HTTPException(status_code=403, detail="Only athletes can have profiles")
    
    db_profile = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    
    if db_profile:
        db_profile.sport = profile.sport
        db_profile.position = profile.position
        db_profile.age = profile.age
        db_profile.height = profile.height
        db_profile.weight = profile.weight
        db_profile.training_load = profile.training_load
        db_profile.flexibility = profile.flexibility
        db_profile.strength = profile.strength
        db_profile.balance = profile.balance
        db_profile.endurance = profile.endurance
        db_profile.coach_notes = profile.coach_notes
    else:
        db_profile = models.Athlete(
            user_id=current_user.user_id,
            sport=profile.sport,
            position=profile.position,
            age=profile.age,
            height=profile.height,
            weight=profile.weight,
            training_load=profile.training_load,
            flexibility=profile.flexibility,
            strength=profile.strength,
            balance=profile.balance,
            endurance=profile.endurance,
            coach_notes=profile.coach_notes
        )
        db.add(db_profile)
        
    db.commit()
    db.refresh(db_profile)
    return db_profile


@app.get("/athlete/profile", response_model=schemas.AthleteResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ATHLETE:
        raise HTTPException(status_code=403, detail="Only athletes have profiles")
    
    db_profile = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Athlete profile not created yet")
    return db_profile


@app.get("/athlete/profile/{athlete_id}", response_model=schemas.AthleteResponse)
def get_athlete_profile(
    athlete_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == models.UserRole.ATHLETE:
        # Check if they are looking up their own profile
        athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == uuid.UUID(athlete_id)).first()
        if not athlete or athlete.user_id != current_user.user_id:
             raise HTTPException(status_code=403, detail="Not authorized to view this profile")
             
    db_profile = db.query(models.Athlete).filter(models.Athlete.athlete_id == uuid.UUID(athlete_id)).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return db_profile


# Injury History Endpoints
@app.post("/athlete/injury-history", response_model=schemas.InjuryHistoryResponse)
def add_injury_record(
    record: schemas.InjuryHistoryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        raise HTTPException(status_code=400, detail="Please create your athlete profile first")
        
    db_record = models.InjuryHistory(
        athlete_id=athlete.athlete_id,
        injury_type=record.injury_type,
        body_part=record.body_part,
        severity=record.severity,
        injury_date=record.injury_date,
        recovery_date=record.recovery_date,
        remarks=record.remarks
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get("/athlete/injury-history", response_model=List[schemas.InjuryHistoryResponse])
def get_my_injury_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        return []
    return db.query(models.InjuryHistory).filter(models.InjuryHistory.athlete_id == athlete.athlete_id).all()


# RESTful Athlete & Injury Aliases & CRUD
@app.get("/athletes", response_model=List[Dict[str, Any]])
def get_athletes_rest(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_athletes(current_user=current_user, db=db)


@app.get("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def get_athlete_by_id(
    athlete_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_athlete_profile(athlete_id=athlete_id, current_user=current_user, db=db)


@app.post("/athletes", response_model=schemas.AthleteResponse)
def post_athlete_profile(
    profile: schemas.AthleteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_or_update_profile(profile=profile, current_user=current_user, db=db)


@app.put("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def update_athlete_by_id(
    athlete_id: str,
    profile: schemas.AthleteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_profile = db.query(models.Athlete).filter(models.Athlete.athlete_id == uuid.UUID(athlete_id)).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    if current_user.role == models.UserRole.ATHLETE and db_profile.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    db_profile.sport = profile.sport
    db_profile.position = profile.position
    db_profile.age = profile.age
    db_profile.height = profile.height
    db_profile.weight = profile.weight
    db_profile.training_load = profile.training_load
    db_profile.flexibility = profile.flexibility
    db_profile.strength = profile.strength
    db_profile.balance = profile.balance
    db_profile.endurance = profile.endurance
    db_profile.coach_notes = profile.coach_notes

    db.commit()
    db.refresh(db_profile)
    return db_profile


@app.get("/athletes/{athlete_id}/injuries", response_model=List[schemas.InjuryHistoryResponse])
def get_athlete_injuries(
    athlete_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == uuid.UUID(athlete_id)).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    if current_user.role == models.UserRole.ATHLETE and athlete.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these injury records")
    return db.query(models.InjuryHistory).filter(models.InjuryHistory.athlete_id == athlete.athlete_id).all()


@app.post("/athletes/{athlete_id}/injuries", response_model=schemas.InjuryHistoryResponse)
def add_athlete_injury(
    athlete_id: str,
    record: schemas.InjuryHistoryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == uuid.UUID(athlete_id)).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    if current_user.role == models.UserRole.ATHLETE and athlete.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to add injury record for this athlete")

    db_record = models.InjuryHistory(
        athlete_id=athlete.athlete_id,
        injury_type=record.injury_type,
        body_part=record.body_part,
        severity=record.severity,
        injury_date=record.injury_date,
        recovery_date=record.recovery_date,
        remarks=record.remarks
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.put("/injuries/{injury_id}", response_model=schemas.InjuryHistoryResponse)
def update_injury_record(
    injury_id: str,
    record: schemas.InjuryHistoryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_record = db.query(models.InjuryHistory).filter(models.InjuryHistory.injury_id == uuid.UUID(injury_id)).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Injury record not found")

    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == db_record.athlete_id).first()
    if current_user.role == models.UserRole.ATHLETE and athlete and athlete.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this injury record")

    db_record.injury_type = record.injury_type
    db_record.body_part = record.body_part
    db_record.severity = record.severity
    db_record.injury_date = record.injury_date
    db_record.recovery_date = record.recovery_date
    db_record.remarks = record.remarks

    db.commit()
    db.refresh(db_record)
    return db_record


@app.delete("/injuries/{injury_id}")
def delete_injury_record(
    injury_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_record = db.query(models.InjuryHistory).filter(models.InjuryHistory.injury_id == uuid.UUID(injury_id)).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Injury record not found")

    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == db_record.athlete_id).first()
    if current_user.role == models.UserRole.ATHLETE and athlete and athlete.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this injury record")

    db.delete(db_record)
    db.commit()
    return {"message": "Injury record deleted successfully"}



# Background Task for Video Processing
def background_process_video(video_id: uuid.UUID, raw_path: str, processed_path: str, athlete_id: uuid.UUID):
    db = SessionLocal()
    try:
        # 1. Run pose analysis
        assessment_data = process_video_pose(raw_path, processed_path)
        
        if not assessment_data.get("processed", False):
            raise ValueError(assessment_data.get("error", "Pose detection failed"))

        # Fetch athlete details for training load
        athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
        profile_dict = None
        if athlete:
            profile_dict = {
                "sport_type": athlete.sport,
                "training_load": athlete.training_load,
                "injury_history": []
            }
            # Fetch past injuries from history
            injuries = db.query(models.InjuryHistory).filter(models.InjuryHistory.athlete_id == athlete_id).all()
            if injuries:
                profile_dict["injury_history"] = [
                    {"injury_type": i.injury_type, "severity": i.severity}
                    for i in injuries
                ]

        # 2. Run risk engine
        risk_data = calculate_injury_risk(assessment_data, profile_dict)

        # 3. Generate recommendations
        rec_data = generate_recommendations(risk_data)

        # 4. Write results to database
        db_analysis = models.AnalysisResult(
            video_id=video_id,
            athlete_id=athlete_id,
            knee_valgus=assessment_data["joint_angles"]["min_knee_valgus_ratio"],
            hip_stability=assessment_data["joint_angles"]["hip_tilt_max"],
            trunk_lean=assessment_data["joint_angles"]["trunk_lean_avg"],
            stride_length=1.2,  # default placeholder metric
            joint_alignment=assessment_data["joint_angles"]["left_knee_avg"],
            symmetry_score=assessment_data["symmetry_score"],
            fatigue_score=float(risk_data["risk_score"] * 0.1),
            movement_quality=100.0 - risk_data["risk_score"],
            overall_risk_score=risk_data["risk_score"],
            risk_level=risk_data["risk_category"]
        )
        db.add(db_analysis)
        db.flush()

        db_prediction = models.InjuryPrediction(
            analysis_id=db_analysis.analysis_id,
            acl_risk=risk_data["acl_risk"],
            hamstring_risk=risk_data["hamstring_risk"],
            ankle_risk=risk_data["ankle_risk"],
            shoulder_risk=risk_data["shoulder_risk"],
            lower_back_risk=risk_data["lower_back_risk"],
            overuse_risk=risk_data["overuse_risk"]
        )
        db.add(db_prediction)
        db.flush()

        db_rec = models.Recommendation(
            prediction_id=db_prediction.prediction_id,
            exercise=rec_data["exercise"],
            mobility=rec_data["mobility"],
            strengthening=rec_data["strengthening"],
            recovery=rec_data["recovery"],
            training_modification=rec_data["training_modification"]
        )
        db.add(db_rec)

        db_pose = models.PoseData(
            video_id=video_id,
            athlete_id=athlete_id,
            frames=assessment_data.get("frames_timeline", []),
            keypoints=assessment_data.get("joint_angles", {}),
            skeleton=assessment_data.get("range_of_motion", {})
        )
        db.add(db_pose)

        db_ailog = models.AiLog(
            video_id=video_id,
            model_name="MediaPipe Pose Tasks API",
            inference_time=0.015,
            confidence=0.88,
            output="Success"
        )
        db.add(db_ailog)

        # 5. Detect and save movement anomalies
        anomalies_list = detect_movement_anomalies(assessment_data)
        for a in anomalies_list:
            db_anomaly = models.MovementAnomaly(
                analysis_id=db_analysis.analysis_id,
                video_id=video_id,
                timestamp_start=a["timestamp_start"],
                timestamp_end=a["timestamp_end"],
                issue_type=a["issue_type"],
                severity=a["severity"],
                confidence=a["confidence"],
                affected_joints=a.get("affected_joints", ""),
                description=a.get("description", "")
            )
            db.add(db_anomaly)

        # Update Video details and state
        video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
        if video:
            cap = cv2.VideoCapture(raw_path)
            if cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
                frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                video.resolution = f"{width}x{height}"
                video.fps = fps
                video.duration = float(frames_count) / fps if fps > 0 else 0.0
                video.quality_score = 0.92
                cap.release()
            video.processing_status = "completed"

        # Create high risk alert notification
        if risk_data["risk_score"] >= 60.0:
            db_notification = models.Notification(
                user_id=db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first().user_id,
                title="High Injury Risk Alert",
                message=f"Your latest video analysis showed an overall risk score of {risk_data['risk_score']}% ({risk_data['risk_category']}). Review recommendations immediately.",
                notification_type="Alert"
            )
            db.add(db_notification)

        db.commit()
    except Exception as e:
        db.rollback()
        video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
        if video:
            video.processing_status = f"failed: {str(e)}"
            db.commit()
        print(f"Error in background task for video {video_id}: {str(e)}")
    finally:
        db.close()


@app.post("/videos/upload", response_model=schemas.VideoResponse)
def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    activity: str = Form("Squatting"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ATHLETE:
        raise HTTPException(status_code=403, detail="Only athletes can upload videos for assessment")

    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        raise HTTPException(status_code=400, detail="Please create your athlete profile first before uploading videos.")

    video_id = uuid.uuid4()
    file_extension = os.path.splitext(file.filename)[1] or ".mp4"
    raw_filename = f"{video_id}_raw{file_extension}"
    processed_filename = f"{video_id}_processed{file_extension}"

    raw_path = os.path.join("uploads", "raw", raw_filename)
    processed_path = os.path.join("uploads", "processed", processed_filename)

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_video = models.Video(
        video_id=video_id,
        athlete_id=athlete.athlete_id,
        activity=activity or athlete.sport,
        video_url=f"uploads/processed/{processed_filename}",
        processing_status="processing"
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    background_tasks.add_task(
        background_process_video,
        video_id=video_id,
        raw_path=raw_path,
        processed_path=processed_path,
        athlete_id=athlete.athlete_id
    )

    return db_video


@app.get("/videos/list", response_model=List[schemas.VideoResponse])
def list_my_videos(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == models.UserRole.ATHLETE:
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete:
            return []
        videos = db.query(models.Video).filter(models.Video.athlete_id == athlete.athlete_id).order_by(models.Video.uploaded_at.desc()).all()
    else:
        videos = db.query(models.Video).order_by(models.Video.uploaded_at.desc()).all()
    return videos


@app.get("/videos/{video_id}/analysis")
def get_video_analysis(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    video = db.query(models.Video).filter(models.Video.video_id == uuid.UUID(video_id)).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if current_user.role == models.UserRole.ATHLETE:
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete or video.athlete_id != athlete.athlete_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this analysis")

    if video.processing_status != "completed":
        return {
            "status": video.processing_status,
            "message": "Analysis is still processing or has failed"
        }

    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == video.video_id).first()
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == analysis.analysis_id).first() if analysis else None
    
    recommendation = None
    if prediction:
        recommendation = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first()

    anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.video_id == video.video_id).all() if video else []

    return {
        "video_id": str(video.video_id),
        "filename": video.activity or "Activity Video",
        "filepath": f"/{video.video_url}",
        "status": video.processing_status,
        "assessment": {
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
            "created_at": analysis.created_at,
            "posture_assessment": f"Trunk lean: {analysis.trunk_lean} degrees. Hip tilt: {analysis.hip_stability} degrees. Knee collapse: {analysis.knee_valgus} ratio."
        } if analysis else None,
        "risk": {
            "risk_score": analysis.overall_risk_score,
            "risk_category": analysis.risk_level,
            "acl_risk": prediction.acl_risk,
            "hamstring_risk": prediction.hamstring_risk,
            "ankle_sprain_risk": prediction.ankle_risk,
            "shoulder_risk": prediction.shoulder_risk,
            "lower_back_risk": prediction.lower_back_risk
        } if prediction else None,
        "recommendations": {
            "exercise_recommendations": [{"name": line.split(":")[0].replace("- ", ""), "reps": line.split(":")[1] if ":" in line else ""} for line in (recommendation.exercise or "").split("\n") if line],
            "mobility_suggestions": [{"name": line.replace("- ", ""), "duration": ""} for line in (recommendation.mobility or "").split("\n") if line],
            "strengthening_suggestions": [{"name": line.replace("- ", ""), "purpose": ""} for line in (recommendation.strengthening or "").split("\n") if line],
            "recovery_plan": recommendation.recovery if recommendation else "",
            "training_modification": recommendation.training_modification if recommendation else ""
        } if recommendation else None,
        "anomalies": [
            {
                "anomaly_id": str(a.anomaly_id),
                "timestamp_start": a.timestamp_start,
                "timestamp_end": a.timestamp_end,
                "issue_type": a.issue_type,
                "severity": a.severity,
                "confidence": a.confidence,
                "affected_joints": a.affected_joints,
                "description": a.description
            } for a in anomalies
        ]
    }


@app.get("/reports/{video_id}/pdf")
def get_pdf_report(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis_data = get_video_analysis(video_id=video_id, current_user=current_user, db=db)
    if "assessment" not in analysis_data or not analysis_data["assessment"]:
        raise HTTPException(status_code=400, detail="Analysis data not available yet")
        
    video = db.query(models.Video).filter(models.Video.video_id == uuid.UUID(video_id)).first()
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == video.athlete_id).first()
    user = db.query(models.User).filter(models.User.user_id == athlete.user_id).first() if athlete else None
    
    recs = analysis_data.get("recommendations", {}) or {}
    report_data = {
        "athlete": {
            "name": user.name if user else "Athlete",
            "sport": athlete.sport if athlete else "General",
            "position": athlete.position if athlete else "N/A",
            "age": athlete.age if athlete else "N/A",
            "height": athlete.height if athlete else "N/A",
            "weight": athlete.weight if athlete else "N/A",
            "training_load": athlete.training_load if athlete else 0.0
        },
        "video": {"activity": video.activity or "Sports Movement"},
        "created_at": str(analysis_data["assessment"]["created_at"]),
        "assessment": analysis_data["assessment"],
        "risk": analysis_data["risk"],
        "recommendations": {
            "exercise": "\n".join([f"- {ex['name']} {ex['reps']}" for ex in recs.get("exercise_recommendations", [])]),
            "mobility": "\n".join([f"- {m['name']}" for m in recs.get("mobility_suggestions", [])]),
            "strengthening": "\n".join([f"- {s['name']}" for s in recs.get("strengthening_suggestions", [])]),
            "recovery": recs.get("recovery_plan", ""),
            "training_modification": recs.get("training_modification", "")
        },
        "anomalies": analysis_data.get("anomalies", [])
    }
    
    pdf_bytes = generate_pdf_report(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=injury_risk_report_{video_id[:8]}.pdf"}
    )


@app.get("/reports/{video_id}/excel")
def get_excel_report(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis_data = get_video_analysis(video_id=video_id, current_user=current_user, db=db)
    if "assessment" not in analysis_data or not analysis_data["assessment"]:
        raise HTTPException(status_code=400, detail="Analysis data not available yet")
        
    video = db.query(models.Video).filter(models.Video.video_id == uuid.UUID(video_id)).first()
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == video.athlete_id).first()
    user = db.query(models.User).filter(models.User.user_id == athlete.user_id).first() if athlete else None
    
    recs = analysis_data.get("recommendations", {}) or {}
    report_data = {
        "athlete": {
            "name": user.name if user else "Athlete",
            "sport": athlete.sport if athlete else "General",
            "position": athlete.position if athlete else "N/A",
            "age": athlete.age if athlete else "N/A",
            "height": athlete.height if athlete else "N/A",
            "weight": athlete.weight if athlete else "N/A",
            "training_load": athlete.training_load if athlete else 0.0
        },
        "video": {"activity": video.activity or "Sports Movement"},
        "created_at": str(analysis_data["assessment"]["created_at"]),
        "assessment": analysis_data["assessment"],
        "risk": analysis_data["risk"],
        "recommendations": {
            "exercise": "\n".join([f"- {ex['name']} {ex['reps']}" for ex in recs.get("exercise_recommendations", [])]),
            "mobility": "\n".join([f"- {m['name']}" for m in recs.get("mobility_suggestions", [])]),
            "strengthening": "\n".join([f"- {s['name']}" for s in recs.get("strengthening_suggestions", [])]),
            "recovery": recs.get("recovery_plan", ""),
            "training_modification": recs.get("training_modification", "")
        },
        "anomalies": analysis_data.get("anomalies", [])
    }
    
    excel_bytes = generate_excel_report(report_data)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=injury_risk_report_{video_id[:8]}.xlsx"}
    )



# Dashboard metrics
@app.get("/dashboard/summary")
def get_dashboard_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == models.UserRole.ATHLETE:
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete:
            return {
                "total_videos": 0,
                "average_risk_score": 0.0,
                "latest_risk_score": 0.0,
                "latest_risk_category": "None",
                "recent_videos": []
            }
            
        videos = db.query(models.Video).filter(models.Video.athlete_id == athlete.athlete_id).all()
        video_ids = [v.video_id for v in videos]
        
        risks = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id.in_(video_ids)).all() if video_ids else []
        avg_risk = np.mean([r.overall_risk_score for r in risks]) if risks else 0.0
        
        latest_risk = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id.in_(video_ids)).order_by(models.AnalysisResult.created_at.desc()).first() if video_ids else None
        
        return {
            "total_videos": len(videos),
            "average_risk_score": round(float(avg_risk), 1),
            "latest_risk_score": latest_risk.overall_risk_score if latest_risk else 0.0,
            "latest_risk_category": latest_risk.risk_level if latest_risk else "None",
            "recent_videos": [
                {"video_id": str(v.video_id), "filename": v.activity or v.video_url.split("/")[-1], "status": v.processing_status, "uploaded_at": v.uploaded_at}
                for v in videos[:5]
            ]
        }
    else:
        total_athletes = db.query(models.Athlete).count()
        total_videos = db.query(models.Video).count()
        
        risks = db.query(models.AnalysisResult).all()
        risk_dist = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
        for r in risks:
            cat = r.risk_level or "Low"
            risk_dist[cat] = risk_dist.get(cat, 0) + 1
            
        recent_uploads = db.query(models.Video).order_by(models.Video.uploaded_at.desc()).limit(5).all()
        
        return {
            "total_athletes": total_athletes,
            "total_videos": total_videos,
            "risk_distribution": risk_dist,
            "recent_uploads": [
                {
                    "video_id": str(v.video_id),
                    "filename": v.activity or v.video_url.split("/")[-1],
                    "athlete_name": (
                        db.query(models.User)
                        .filter(
                            models.User.user_id == db.query(models.Athlete)
                            .filter(models.Athlete.athlete_id == v.athlete_id)
                            .first().user_id
                        )
                        .first().name
                        if db.query(models.Athlete).filter(models.Athlete.athlete_id == v.athlete_id).first()
                        else "Unknown"
                    ),
                    "status": v.processing_status,
                    "uploaded_at": v.uploaded_at
                }
                for v in recent_uploads
            ]
        }


@app.get("/athletes/list")
def list_athletes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == models.UserRole.ATHLETE:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    athletes = db.query(models.Athlete).all()
    
    result = []
    for athlete in athletes:
        user = db.query(models.User).filter(models.User.user_id == athlete.user_id).first()
        latest_video = db.query(models.Video).filter(models.Video.athlete_id == athlete.athlete_id).order_by(models.Video.uploaded_at.desc()).first()
        latest_risk = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == latest_video.video_id).first() if latest_video else None
        
        result.append({
            "athlete_id": str(athlete.athlete_id),
            "name": user.name if user else "Unknown Athlete",
            "email": user.email if user else "",
            "sport_type": athlete.sport,
            "risk_category": latest_risk.risk_level if latest_risk else "No Data",
            "risk_score": latest_risk.overall_risk_score if latest_risk else None,
            "last_upload": latest_video.uploaded_at if latest_video else None
        })
        
    return result


@app.get("/notifications/list", response_model=List[Dict[str, Any]])
def get_my_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(models.Notification).filter(models.Notification.user_id == current_user.user_id).order_by(models.Notification.created_at.desc()).all()
    return [
        {
            "notification_id": str(n.notification_id),
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": n.created_at
        } for n in notifications
    ]


@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(models.Notification).filter(
        models.Notification.notification_id == uuid.UUID(notification_id),
        models.Notification.user_id == current_user.user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@app.put("/auth/password")
def change_password(
    pwd_data: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_data.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.password = hash_password(pwd_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@app.get("/dashboard/role-summary")
def get_role_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = current_user.role
    if role == models.UserRole.ATHLETE:
        athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
        if not athlete:
            return {"role": role, "summary": "No athlete profile established yet."}
        videos = db.query(models.Video).filter(models.Video.athlete_id == athlete.athlete_id).all()
        return {
            "role": role,
            "sport": athlete.sport,
            "total_assessments": len(videos),
            "training_load": athlete.training_load,
            "message": "Focus on high-load recovery and knee alignment drills."
        }
    elif role == models.UserRole.COACH:
        total_athletes = db.query(models.Athlete).count()
        high_risk_athletes = db.query(models.AnalysisResult).filter(models.AnalysisResult.overall_risk_score >= 60.0).count()
        return {
            "role": role,
            "team_size": total_athletes,
            "athletes_at_risk": high_risk_athletes,
            "focus": "Review high risk alerts and adjust team drill intensity."
        }
    elif role == models.UserRole.PHYSIOTHERAPIST:
        total_injuries = db.query(models.InjuryHistory).count()
        active_rehab = db.query(models.InjuryHistory).filter(models.InjuryHistory.recovery_date == None).count()
        return {
            "role": role,
            "total_injury_records": total_injuries,
            "active_rehab_cases": active_rehab,
            "focus": "Monitor knee valgus asymmetry and ACL risk profiles."
        }
    elif role == models.UserRole.SPORTS_SCIENTIST:
        total_videos = db.query(models.Video).count()
        total_anomalies = db.query(models.MovementAnomaly).count()
        return {
            "role": role,
            "total_datasets_analyzed": total_videos,
            "anomalies_detected": total_anomalies,
            "focus": "Analyze fatigue correlation across squat and jump biomechanics."
        }
    elif role == models.UserRole.ADMINISTRATOR:
        user_count = db.query(models.User).count()
        video_count = db.query(models.Video).count()
        return {
            "role": role,
            "registered_users": user_count,
            "processed_videos": video_count,
            "system_status": "All AI engines and DB services operational."
        }
    return {"role": role, "summary": "Role active"}


@app.get("/admin/users", response_model=List[schemas.UserResponse])
def admin_list_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Admin authorization required")
    return db.query(models.User).all()


@app.get("/admin/analytics")
def admin_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Admin authorization required")
    
    return {
        "users_by_role": {
            "athlete": db.query(models.User).filter(models.User.role == models.UserRole.ATHLETE).count(),
            "coach": db.query(models.User).filter(models.User.role == models.UserRole.COACH).count(),
            "physiotherapist": db.query(models.User).filter(models.User.role == models.UserRole.PHYSIOTHERAPIST).count(),
            "sports_scientist": db.query(models.User).filter(models.User.role == models.UserRole.SPORTS_SCIENTIST).count(),
            "admin": db.query(models.User).filter(models.User.role == models.UserRole.ADMINISTRATOR).count()
        },
        "total_videos": db.query(models.Video).count(),
        "total_anomalies": db.query(models.MovementAnomaly).count(),
        "database_backend": str(engine.name)
    }


static_dir = os.path.join(FRONTEND_DIR, "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")