import os
import uuid
import shutil
import json
import cv2
import math
import numpy as np
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, File, UploadFile, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import FileResponse, Response, HTMLResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any

try:
    from app.database import engine, Base, SessionLocal
    from app import models
    from app import schemas
    from app.auth import hash_password, verify_password, create_access_token, decode_access_token
    from app.video_processor import process_video_pose
    from app.risk_engine import calculate_injury_risk
    from app.recommender import generate_recommendations
    from app.anomaly_engine import detect_movement_anomalies
    from app.report_exporter import generate_pdf_report, generate_excel_report
except ImportError:
    from database import engine, Base, SessionLocal
    import models
    import schemas
    from auth import hash_password, verify_password, create_access_token, decode_access_token
    from video_processor import process_video_pose
    from risk_engine import calculate_injury_risk
    from recommender import generate_recommendations
    from anomaly_engine import detect_movement_anomalies
    from report_exporter import generate_pdf_report, generate_excel_report



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
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
if not os.path.exists(uploads_dir):
    uploads_dir = os.path.abspath("uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

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
    try:
        from app.services.video_service import video_service as _video_service
    except ImportError:
        from services.video_service import video_service as _video_service

    db = SessionLocal()
    try:
        # Ensure processing job exists
        job = db.query(models.ProcessingJob).filter(models.ProcessingJob.video_id == video_id).first()
        if not job:
            job = models.ProcessingJob(
                video_id=video_id,
                status="PROCESSING",
                progress=10.0,
                current_step="VALIDATING"
            )
            db.add(job)
            db.commit()
            db.refresh(job)

        # Update the video_url to point at raw file so video_service can read it
        db_video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
        if db_video and raw_path:
            db_video.video_url = raw_path
            db.commit()

        _video_service.process_video_pipeline(
            db=db,
            video_id=video_id,
            job_id=job.job_id
        )
    except Exception as e:
        print(f"Error in background video processing: {e}", flush=True)
        # Mark job and video as failed with rollback safety
        try:
            db.rollback()
            job = db.query(models.ProcessingJob).filter(models.ProcessingJob.video_id == video_id).order_by(models.ProcessingJob.started_at.desc()).first()
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
            db_video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
            if db_video:
                db_video.processing_status = "failed"
            db.commit()
        except Exception as ex:
            print(f"Error persisting failure status: {ex}", flush=True)
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
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == current_user.user_id).first()
    if not athlete:
        athlete = models.Athlete(
            athlete_id=uuid.uuid4(),
            user_id=current_user.user_id,
            sport=activity or "General",
            position="General",
            age=22,
            height=175.0,
            weight=70.0,
            training_load=10.0,
            flexibility=75.0,
            strength=75.0,
            balance=75.0,
            endurance=75.0,
            coach_notes="Auto-created profile on video upload."
        )
        db.add(athlete)
        db.commit()
        db.refresh(athlete)

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
    
    # Create processing job record
    job = models.ProcessingJob(
        video_id=video_id,
        status="QUEUED",
        progress=5.0,
        current_step="UPLOADED"
    )
    db.add(job)

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


@app.get("/videos/{video_id}/status")
def get_video_status(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Real-time progress and status tracking for video pose processing job."""
    v_uuid = uuid.UUID(video_id)
    video = db.query(models.Video).filter(models.Video.video_id == v_uuid).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    job = db.query(models.ProcessingJob).filter(models.ProcessingJob.video_id == v_uuid).order_by(models.ProcessingJob.started_at.desc()).first()

    return {
        "video_id": str(video.video_id),
        "status": video.processing_status.upper(),
        "stage": job.current_step if job else video.processing_status.upper(),
        "progress": job.progress if job else (100.0 if video.processing_status == "completed" else 50.0),
        "error_message": job.error_message if job else None,
        "activity": video.activity
    }


@app.get("/videos/{video_id}/pose")
def get_video_pose_keypoints(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve raw 33 MediaPipe keypoint landmark telemetry across all video frames."""
    v_uuid = uuid.UUID(video_id)
    pose_rec = db.query(models.PoseData).filter(models.PoseData.video_id == v_uuid).first()
    if not pose_rec:
        raise HTTPException(status_code=404, detail="Pose landmark telemetry not found for this video.")

    try:
        frames_keypoints = json.loads(pose_rec.keypoints_data) if isinstance(pose_rec.keypoints_data, str) else pose_rec.keypoints_data
    except Exception:
        frames_keypoints = []

    return {
        "video_id": str(video_id),
        "total_frames": pose_rec.total_frames,
        "fps": pose_rec.fps,
        "keypoints_structure": "MediaPipe 33 Landmarks",
        "frames": frames_keypoints
    }


@app.get("/videos/{video_id}/telemetry")
def get_video_telemetry(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve frame-wise biomechanical telemetry (knee valgus, trunk lean, etc.) for a video."""
    try:
        v_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    video = db.query(models.Video).filter(models.Video.video_id == v_uuid).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    pose_rec = db.query(models.PoseData).filter(models.PoseData.video_id == v_uuid).first()
    telemetry = []

    if pose_rec and pose_rec.keypoints:
        kp = pose_rec.keypoints if isinstance(pose_rec.keypoints, dict) else (json.loads(pose_rec.keypoints) if isinstance(pose_rec.keypoints, str) else {})
        if "telemetry" in kp and isinstance(kp["telemetry"], list) and len(kp["telemetry"]) > 0:
            telemetry = kp["telemetry"]

    # If pose_rec.frames has landmarks but telemetry wasn't stored directly
    if not telemetry and pose_rec and pose_rec.frames:
        frames_list = pose_rec.frames if isinstance(pose_rec.frames, list) else (json.loads(pose_rec.frames) if isinstance(pose_rec.frames, str) else [])
        if frames_list:
            fps = float(video.fps or 30.0)
            try:
                from app.services.biomechanics_service import biomechanics_service
            except ImportError:
                from services.biomechanics_service import biomechanics_service
            for idx, fr in enumerate(frames_list):
                lms = fr.get("landmarks", {})
                if lms:
                    kin = biomechanics_service.compute_frame_kinematics(lms)
                    telemetry.append({
                        "frame": fr.get("frame", idx),
                        "timestamp": fr.get("timestamp_seconds", round(float(idx / fps), 2)),
                        "knee_valgus": float(kin.get("knee_valgus_ratio", 1.0)),
                        "knee_valgus_ratio": float(kin.get("knee_valgus_ratio", 1.0)),
                        "trunk_lean": float(kin.get("trunk_lean", 0.0)),
                        "hip_tilt": float(kin.get("hip_tilt", 0.0)),
                        "left_knee_angle": float(kin.get("left_knee_angle", 180.0)),
                        "right_knee_angle": float(kin.get("right_knee_angle", 180.0))
                    })

    # Fallback for seeded or historical videos where PoseData was not created but AnalysisResult exists
    if not telemetry:
        analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == v_uuid).first()
        if analysis:
            total_f = int((video.duration or 3.0) * (video.fps or 30))
            if total_f <= 0:
                total_f = 40
            base_valgus = float(analysis.knee_valgus or 0.88)
            base_lean = float(analysis.trunk_lean or 12.0)
            fps = float(video.fps or 30)
            for i in range(total_f):
                t = i / max(1, total_f - 1)
                factor = 0.5 - 0.5 * math.cos(2 * math.pi * t)
                v_val = round(1.0 - (1.0 - base_valgus) * factor, 2)
                l_val = round(2.0 + (base_lean - 2.0) * factor, 1)
                telemetry.append({
                    "frame": i,
                    "timestamp": round(float(i / fps), 2),
                    "knee_valgus": v_val,
                    "knee_valgus_ratio": v_val,
                    "trunk_lean": l_val,
                    "hip_tilt": round(1.0 + 3.0 * factor, 1)
                })

    return {
        "video_id": str(video_id),
        "total_frames": len(telemetry),
        "fps": video.fps or 30,
        "telemetry": telemetry
    }


@app.get("/videos/{video_id}/processed-video")
def get_processed_video_file(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Stream annotated skeleton overlay MP4 video."""
    v_uuid = uuid.UUID(video_id)
    video = db.query(models.Video).filter(models.Video.video_id == v_uuid).first()
    if not video or not video.processed_filepath:
        raise HTTPException(status_code=404, detail="Processed video file not available.")

    rel_path = video.processed_filepath.lstrip("/\\")
    if not os.path.exists(rel_path):
        rel_path = video.filepath

    if not os.path.exists(rel_path):
        raise HTTPException(status_code=404, detail="Video file missing on server.")

    return FileResponse(rel_path, media_type="video/mp4")


@app.get("/athletes/{athlete_id}/analyses")
def get_athlete_analyses_history(
    athlete_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all past movement analyses for a specified athlete ID."""
    ath_uuid = uuid.UUID(athlete_id)
    videos = db.query(models.Video).filter(models.Video.athlete_id == ath_uuid).order_by(models.Video.uploaded_at.desc()).all()
    
    video_ids = [v.video_id for v in videos]
    analyses = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id.in_(video_ids)).all() if video_ids else []

    results = []
    for v in videos:
        an = next((a for a in analyses if a.video_id == v.video_id), None)
        results.append({
            "video_id": str(v.video_id),
            "activity": v.activity or "Assessment",
            "uploaded_at": v.uploaded_at,
            "status": v.processing_status,
            "quality_score": an.quality_score if an else None,
            "risk_level": an.risk_level if an else None
        })

    return results


@app.get("/risk-assessment/{video_id}", response_model=schemas.RiskAssessmentResponse)
def get_movement_risk_assessment(
    video_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns comprehensive Movement Risk Intelligence analysis for a video,
    including weighted risk scores, risk explanations, contributing factors,
    detected acute anomalies, and corrective recommendation plans.
    """
    v_uuid = uuid.UUID(video_id)
    video = db.query(models.Video).filter(models.Video.video_id == v_uuid).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == v_uuid).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis result not ready or video still processing.")

    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == video.athlete_id).first()
    injuries = db.query(models.InjuryHistory).filter(models.InjuryHistory.athlete_id == video.athlete_id).all() if athlete else []
    anomalies_db = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == analysis.analysis_id).all()

    athlete_profile = {}
    if athlete:
        athlete_profile = {
            "sport": athlete.sport,
            "position": athlete.position,
            "age": athlete.age,
            "height": athlete.height,
            "weight": athlete.weight,
            "training_load": athlete.training_load or 0.0,
            "flexibility": athlete.flexibility or 50.0,
            "strength": athlete.strength or 50.0,
            "balance": athlete.balance or 50.0,
        }

    injury_history_list = [
        {
            "injury_type": inj.injury_type,
            "body_part": inj.body_part,
            "severity": inj.severity,
            "injury_date": str(inj.injury_date) if inj.injury_date else None,
        }
        for inj in injuries
    ]

    kinematics_data = {
        "knee_valgus": analysis.knee_valgus,
        "hip_stability": analysis.hip_stability,
        "trunk_lean": analysis.trunk_lean,
        "joint_alignment": analysis.joint_alignment or 90.0,
        "symmetry_score": analysis.symmetry_score,
        "fatigue_score": analysis.fatigue_score or 3.5,
        "movement_quality": analysis.movement_quality or 85.0,
    }

    try:
        from app.services.risk_assessment_service import risk_assessment_service
        eval_result = risk_assessment_service.evaluate_movement_risk(
            kinematics=kinematics_data,
            athlete_profile=athlete_profile,
            injury_history=injury_history_list
        )
        risk_results = eval_result["risk_results"]
        explanations = eval_result["explanations"]["explanations"]
        contributing_factors = eval_result["explanations"]["contributing_factors"]
        recommendations = eval_result["recommendations"]
        anomalies_list = eval_result["anomalies"]
    except Exception:
        # Fallback if evaluation fails dynamically
        pred = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == analysis.analysis_id).first()
        risk_results = {
            "overall_risk_score": analysis.overall_risk_score or 25.0,
            "risk_category": analysis.risk_level or "Low",
            "acl_risk": pred.acl_risk if pred else 20.0,
            "hamstring_risk": pred.hamstring_risk if pred else 15.0,
            "ankle_sprain_risk": pred.ankle_risk if pred else 15.0,
            "shoulder_risk": pred.shoulder_risk if pred else 10.0,
            "lower_back_risk": pred.lower_back_risk if pred else 15.0,
            "overuse_risk": 15.0,
            "disclaimer": "RESEARCH PROTOTYPE DISCLAIMER: Educational indicator only. Not a clinical medical diagnosis."
        }
        explanations = ["Movement mechanics evaluated against physiological baseline reference thresholds."]
        contributing_factors = [{"factor": "Kinematic Alignment", "impact": "Low", "detail": "Normal physiological baseline"}]
        anomalies_list = [
            {
                "frame_number": getattr(a, "frame_number", int(round((float(a.timestamp_start or 0.0)) * (video.fps or 30)))),
                "timestamp_start": a.timestamp_start,
                "timestamp_seconds": a.timestamp_start,
                "timestamp_end": a.timestamp_end,
                "issue_type": a.issue_type,
                "anomaly_type": a.issue_type,
                "severity": a.severity,
                "confidence": a.confidence,
                "confidence_score": a.confidence,
                "affected_joints": a.affected_joints,
                "description": a.description,
            }
            for a in anomalies_db
        ]
        recommendations = {
            "exercise_recommendations": [{"name": "Standard Warm-up & Glute Activation", "reps": "3 sets of 12", "focus": "Postural stability"}],
            "recovery_plan": "Baseline active training and standard post-session stretching."
        }

    # Generate additive ML Prediction using production ML inference service
    ml_pred = None
    try:
        from app.services.ml_prediction_service import ml_prediction_service
        ml_pred = ml_prediction_service.generate_ml_prediction(
            kinematics_summary=kinematics_data,
            athlete_profile=athlete_profile,
            injury_history=injury_history_list
        )
    except Exception as e:
        print(f"ML Prediction calculation warning: {e}")

    return {
        "video_id": video.video_id,
        "athlete_id": video.athlete_id,
        "overall_risk_score": risk_results["overall_risk_score"],
        "risk_category": risk_results["risk_category"],
        "biomechanical_risk": risk_results.get("biomechanical_risk"),
        "historical_injury_risk": risk_results.get("historical_injury_risk"),
        "asymmetry_risk": risk_results.get("asymmetry_risk"),
        "training_load_risk": risk_results.get("training_load_risk"),
        "fatigue_risk": risk_results.get("fatigue_risk"),
        "acl_risk": risk_results["acl_risk"],
        "hamstring_risk": risk_results["hamstring_risk"],
        "ankle_risk": risk_results.get("ankle_sprain_risk", risk_results.get("ankle_risk", 15.0)),
        "shoulder_risk": risk_results["shoulder_risk"],
        "lower_back_risk": risk_results["lower_back_risk"],
        "overuse_risk": risk_results.get("overuse_risk", 15.0),
        "disclaimer": risk_results.get("disclaimer", "RESEARCH PROTOTYPE DISCLAIMER: Computational Indicator for athletic optimization."),
        "explanations": explanations,
        "contributing_factors": contributing_factors,
        "anomalies": anomalies_list,
        "recommendations": recommendations,
        "ml_prediction": ml_pred,
    }


@app.get("/risk-history/{athlete_id}", response_model=List[schemas.RiskHistoryItem])
def get_athlete_risk_history(
    athlete_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns historical risk score tracking over time for an athlete.
    """
    ath_uuid = uuid.UUID(athlete_id)
    videos = db.query(models.Video).filter(
        models.Video.athlete_id == ath_uuid,
        models.Video.processing_status == "completed"
    ).order_by(models.Video.uploaded_at.asc()).all()

    video_ids = [v.video_id for v in videos]
    analyses = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id.in_(video_ids)).all() if video_ids else []

    history = []
    for v in videos:
        an = next((a for a in analyses if a.video_id == v.video_id), None)
        if an:
            pred = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == an.analysis_id).first()
            history.append({
                "video_id": v.video_id,
                "uploaded_at": v.uploaded_at,
                "overall_risk_score": an.overall_risk_score or 20.0,
                "risk_category": an.risk_level or "Low",
                "acl_risk": pred.acl_risk if pred else 15.0,
                "hamstring_risk": pred.hamstring_risk if pred else 15.0,
                "movement_quality": an.movement_quality or 85.0,
            })

    return history


@app.get("/reports/{video_id}/biomechanics", response_class=HTMLResponse)
def get_biomechanics_html_report(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Returns an interactive HTML Biomechanical Assessment Report with research prototype disclaimers."""
    v_uuid = uuid.UUID(video_id)
    video = db.query(models.Video).filter(models.Video.video_id == v_uuid).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == v_uuid).first()
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == video.athlete_id).first()
    user = db.query(models.User).filter(models.User.user_id == athlete.user_id).first() if athlete else None

    athlete_name = user.name if user else "Athlete"
    sport = athlete.sport if athlete else "General Sport"
    metrics = json.loads(analysis.assessment_metrics) if (analysis and analysis.assessment_metrics) else {}

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Biomechanical Movement Assessment Report</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }}
            .container {{ max-width: 800px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 20px; border: 1px solid #334155; }}
            h1 {{ color: #38bdf8; font-size: 24px; margin-bottom: 5px; }}
            .sub {{ color: #94a3b8; font-size: 14px; margin-bottom: 25px; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }}
            .card {{ background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #334155; }}
            .label {{ color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: bold; }}
            .value {{ color: #38bdf8; font-size: 20px; font-weight: bold; margin-top: 5px; }}
            .disclaimer {{ background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 15px; border-radius: 12px; font-size: 12px; color: #fef08a; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Biomechanical Assessment Report</h1>
            <div class="sub">Athlete: <strong>{athlete_name}</strong> | Activity: <strong>{video.activity or 'Movement'}</strong> | Sport: <strong>{sport}</strong></div>

            <div class="grid">
                <div class="card"><div class="label">Movement Quality Score</div><div class="value">{analysis.quality_score if analysis else 85.0}%</div></div>
                <div class="card"><div class="label">Knee Valgus Ratio</div><div class="value">{metrics.get('knee_valgus', 0.88)}</div></div>
                <div class="card"><div class="label">Trunk Lean Angle</div><div class="value">{metrics.get('trunk_lean', 12.0)}°</div></div>
                <div class="card"><div class="label">Bilateral Limb Symmetry</div><div class="value">{metrics.get('symmetry_score', 92.0)}%</div></div>
                <div class="card"><div class="label">Stride Length Indicator</div><div class="value">{metrics.get('stride_length', 1.25)}m</div></div>
                <div class="card"><div class="label">Balance / Stability Score</div><div class="value">{metrics.get('stability_score', 90.0)}%</div></div>
            </div>

            <div class="card">
                <div class="label">Technique & Posture Assessment</div>
                <p style="font-size: 13px; color: #cbd5e1; margin-top: 8px;">{metrics.get('posture_assessment', 'Consistent joint tracking and balanced body posture observed.')}</p>
            </div>

            <div class="disclaimer">
                <strong>Research & Educational Disclaimer:</strong> This document is generated by an automated AI computer-vision prototype. All metrics serve strictly as movement screening indicators and do NOT provide medical diagnosis or replace evaluation by a licensed sports healthcare professional.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


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

    raw_url = (video.video_url or "").replace("\\", "/")
    filename = os.path.basename(raw_url)
    proc_filename = filename if filename.startswith("processed_") else f"processed_{filename}"
    proc_abs = os.path.join(uploads_dir, "processed", proc_filename)
    
    if os.path.exists(proc_abs):
        video_url_clean = f"/uploads/processed/{proc_filename}"
    else:
        raw_filename = filename.replace("processed_", "") if filename.startswith("processed_") else filename
        video_url_clean = f"/uploads/raw/{raw_filename}"

    return {
        "video_id": str(video.video_id),
        "filename": video.activity or "Activity Video",
        "filepath": video_url_clean,
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
            "risk_score": analysis.overall_risk_score if analysis else 20.0,
            "risk_category": analysis.risk_level if analysis else "Low",
            "acl_risk": prediction.acl_risk if prediction else 15.0,
            "hamstring_risk": prediction.hamstring_risk if prediction else 15.0,
            "ankle_sprain_risk": prediction.ankle_risk if prediction else 15.0,
            "shoulder_risk": prediction.shoulder_risk if prediction else 10.0,
            "lower_back_risk": prediction.lower_back_risk if prediction else 15.0,
            "overuse_risk": getattr(prediction, "overuse_risk", 15.0) if prediction else 15.0
        } if (analysis or prediction) else None,
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


@app.get("/analyses/{analysis_id}")
def get_analysis_by_id(
    analysis_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve analysis result by analysis_id or video_id (alias endpoint)."""
    try:
        a_uuid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == a_uuid).first()
    if not analysis:
        analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == a_uuid).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    return get_video_analysis(video_id=str(analysis.video_id), current_user=current_user, db=db)



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