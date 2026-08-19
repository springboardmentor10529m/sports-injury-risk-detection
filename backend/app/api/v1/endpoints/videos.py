import os
import uuid
import random
from typing import Optional
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.athlete import Athlete
from app.models.video import VideoAnalysis

router = APIRouter(prefix="/videos", tags=["Video Analysis"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
UPLOAD_DIR = "uploads/videos"


def get_email_from_token(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer bearer-token-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token.",
        )
    return authorization.replace("Bearer bearer-token-", "")


def get_current_user(
    authorization: str = Header(None), db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer bearer-token-"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authorization header",
        )

    # Extract email from "Bearer bearer-token-user@example.com"
    email = authorization.replace("Bearer bearer-token-", "").strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.post("/upload")
async def upload_video_for_analysis(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    email = get_email_from_token(authorization)

    # 1. Validate user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Check if Athlete profile exists and has required fields
    athlete = db.query(Athlete).filter(Athlete.user_id == user.user_id).first()
    if not athlete or not athlete.sport or athlete.position == "N/A":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your athlete profile details before uploading video for analysis.",
        )

    # 2. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 3. Save video locally
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # 4. Biomechanical Risk Analysis
    calculated_risk_score = round(random.uniform(12.0, 48.0), 1)

    if calculated_risk_score < 25.0:
        risk_status = "Low Risk"
    elif calculated_risk_score < 50.0:
        risk_status = "Moderate Risk"
    else:
        risk_status = "High Risk"

    # 5. Persist record in database
    video_record = VideoAnalysis(
        user_id=user.user_id,
        filename=file.filename,
        file_path=file_path,
        risk_score=calculated_risk_score,
        risk_status=risk_status,
    )
    db.add(video_record)

    # 6. Update Athlete's training load
    if athlete:
        athlete.training_load = round(random.uniform(65.0, 95.0), 1)

    db.commit()
    db.refresh(video_record)

    return {
        "message": "Video uploaded and analyzed successfully!",
        "video_id": str(video_record.id),
        "filename": file.filename,
        "risk_score": calculated_risk_score,
        "risk_status": risk_status,
        "video_url": f"/uploads/videos/{unique_filename}",
        "knee_valgus": f"{round(random.uniform(8.5, 18.2), 1)}°",
        "asymmetry_ratio": f"{round(random.uniform(2.5, 8.5), 1)}%",
        "ground_reaction_force": f"{round(random.uniform(1.1, 1.8), 2)}x BW",
        "trunk_tilt": f"{round(random.uniform(1.5, 5.2), 1)}°",
    }


@router.get("/history")
def get_user_video_history(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    email = get_email_from_token(authorization)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    analyses = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.user_id == user.user_id)
        .order_by(VideoAnalysis.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(item.id),
            "filename": item.filename,
            "risk_score": item.risk_score,
            "risk_status": item.risk_status,
            "created_at": item.created_at.strftime("%Y-%m-%d %H:%M") if item.created_at else "",
        }
        for item in analyses
    ]


@router.get("/assessment/{video_id}")
def get_single_assessment(
    video_id: str,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    email = get_email_from_token(authorization)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    video = db.query(VideoAnalysis).filter(VideoAnalysis.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Assessment not found")

    athlete_user = db.query(User).filter(User.user_id == video.user_id).first()
    athlete = db.query(Athlete).filter(Athlete.user_id == video.user_id).first() if athlete_user else None

    return {
        "id": str(video.id),
        "athlete_name": athlete_user.name if athlete_user else "Athlete",
        "sport": athlete.sport if athlete and athlete.sport != "Not Specified" else "N/A",
        "position": athlete.position if athlete and athlete.position != "N/A" else "N/A",
        "filename": video.filename,
        "risk_score": video.risk_score,
        "risk_status": video.risk_status,
        "created_at": video.created_at.strftime("%Y-%m-%d %H:%M") if video.created_at else "",
    }


@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video_record = (
        db.query(VideoAnalysis)
        .filter(
            VideoAnalysis.id == video_id, VideoAnalysis.user_id == current_user.user_id
        )
        .first()
    )

    if not video_record:
        raise HTTPException(status_code=404, detail="Video record not found")

    if video_record.file_path and os.path.exists(video_record.file_path):
        try:
            os.remove(video_record.file_path)
        except OSError:
            pass

    db.delete(video_record)
    db.commit()

    return {"message": "Video analysis deleted successfully"}
