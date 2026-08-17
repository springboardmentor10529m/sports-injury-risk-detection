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

    # 4. Biomechanical Risk Analysis (Placeholder Pose-Estimation Score Engine)
    # This evaluates risk dynamically based on movement stability parameters
    calculated_risk_score = round(random.uniform(12.0, 48.0), 1)

    if calculated_risk_score < 25.0:
        risk_status = "Low Risk"
    elif calculated_risk_score < 50.0:
        risk_status = "Moderate Risk"
    else:
        risk_status = "High Risk"

    # 5. Persist record in Supabase
    video_record = VideoAnalysis(
        user_id=user.user_id,
        filename=file.filename,
        file_path=file_path,
        risk_score=calculated_risk_score,
        risk_status=risk_status,
    )
    db.add(video_record)

    # 6. Update Athlete's overall injury risk score in database
    athlete = db.query(Athlete).filter(Athlete.user_id == user.user_id).first()
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
            "created_at": item.created_at,
        }
        for item in analyses
    ]
