import os
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import database, models, schemas, auth
from services.pose_ml_pipeline import pose_ml_pipeline

router = APIRouter(prefix="/api/pose", tags=["AI Pose Estimation Pipeline"])

@router.get("/model-info", response_model=Dict[str, Any])
def get_ml_model_info():
    """
    Returns metadata for the RTMPose-M COCO 17-Keypoint Model.
    """
    return pose_ml_pipeline.get_model_info()

@router.post("/process/{video_id}", response_model=Dict[str, Any])
def process_video_pose_ml(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Runs the RTMPose-M COCO 17-Keypoint pipeline on the target video.
    Returns real inference metrics (Mean Keypoint Confidence, Processed Frames, Valid Pose Frames, Tracked Frames).
    """
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")

    if video.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this video")

    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "videos")
    filename = os.path.basename(video.video_url)
    file_path = os.path.join(upload_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Physical video file '{filename}' not found on server")

    try:
        # Run Real RTMPose-M Pipeline inference
        pose_result = pose_ml_pipeline.process_video_ml(file_path, video_id=video_id)
        
        pose_result["video_id"] = video_id
        pose_result["athlete_id"] = video.athlete_id or current_user.user_id
        pose_result["filename"] = video.filename
        pose_result["activity"] = video.activity

        # Update video processing status in DB
        video.processing_status = "POSE_EXTRACTED"
        db.commit()

        return pose_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RTMPose Pipeline inference error: {str(e)}")

@router.get("/{video_id}", response_model=Dict[str, Any])
def get_video_pose_data_ml(
    video_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Retrieves RTMPose-M 17 COCO keypoint sequence and biomechanics data for a video.
    """
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")

    if video.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this video")

    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "videos")
    filename = os.path.basename(video.video_url)
    file_path = os.path.join(upload_dir, filename)

    if os.path.exists(file_path):
        pose_result = pose_ml_pipeline.process_video_ml(file_path, video_id=video_id)
        pose_result["video_id"] = video_id
        pose_result["athlete_id"] = video.athlete_id or current_user.user_id
        pose_result["filename"] = video.filename
        pose_result["activity"] = video.activity
        return pose_result

    raise HTTPException(status_code=404, detail="Video file not found on server")
