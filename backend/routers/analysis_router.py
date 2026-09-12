import os
import json
import csv
import io
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

import database, models, schemas, auth
from services.pose_analysis_service import run_pose_analysis_job

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analysis",
    tags=["Pose Analysis & Biomechanics"]
)


def verify_analysis_owner(analysis: models.AnalysisJob, current_user: models.User):
    if analysis.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access. You do not own this analysis job."
        )


@router.post("/videos/{video_id}/analyse", status_code=status.HTTP_202_ACCEPTED)
def queue_analysis_job(
    video_id: str,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Force a new analysis even if an analysis was previously created"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Queue background pose estimation and biomechanical analysis for a video.
    """
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    if video.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to this video.")

    # Check if active job already running
    if not force:
        existing_job = db.query(models.AnalysisJob).filter(
            models.AnalysisJob.video_id == video_id,
            models.AnalysisJob.user_id == current_user.user_id,
            models.AnalysisJob.status.in_(["queued", "processing", "pose_estimation", "tracking", "biomechanics", "rendering"])
        ).first()

        if existing_job:
            return {
                "analysis_id": existing_job.id,
                "status": existing_job.status,
                "message": "Analysis job already in progress."
            }
    else:
        # Mark stale active jobs as superseded
        stale_jobs = db.query(models.AnalysisJob).filter(
            models.AnalysisJob.video_id == video_id,
            models.AnalysisJob.user_id == current_user.user_id,
            models.AnalysisJob.status.in_(["queued", "processing", "pose_estimation", "tracking", "biomechanics", "rendering"])
        ).all()
        for sj in stale_jobs:
            sj.status = "superseded"
            sj.error_message = "Superseded by user re-analysis request."
        db.flush()

    # Create new AnalysisJob
    job = models.AnalysisJob(
        video_id=video_id,
        user_id=current_user.user_id,
        status="queued",
        stage="Queued for Analysis" if force else "Queued",
        progress=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Schedule non-blocking background task
    background_tasks.add_task(run_pose_analysis_job, job.id)

    return {
        "analysis_id": job.id,
        "status": job.status,
        "message": "Pose analysis job queued successfully."
    }


@router.post("/videos/{video_id}/reanalyse", status_code=status.HTTP_202_ACCEPTED)
def reanalyse_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Forces a fresh re-analysis job for a video, even if a previous analysis exists.
    Cancels any stale running jobs, resets video status, and queues a new RTMPose-M & ML screening pass.
    """
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    if video.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access to this video.")

    # Mark any stale running jobs as superseded
    stale_jobs = db.query(models.AnalysisJob).filter(
        models.AnalysisJob.video_id == video_id,
        models.AnalysisJob.user_id == current_user.user_id,
        models.AnalysisJob.status.in_(["queued", "processing", "pose_estimation", "tracking", "biomechanics", "rendering"])
    ).all()
    for sj in stale_jobs:
        sj.status = "superseded"
        sj.error_message = "Superseded by user re-analysis request."

    video.processing_status = "QUEUED"
    db.flush()

    # Create new AnalysisJob
    job = models.AnalysisJob(
        video_id=video_id,
        user_id=current_user.user_id,
        status="queued",
        stage="Queued for Re-analysis",
        progress=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Schedule non-blocking background task
    background_tasks.add_task(run_pose_analysis_job, job.id)

    return {
        "analysis_id": job.id,
        "video_id": video_id,
        "status": job.status,
        "message": "Video re-analysis queued successfully."
    }


@router.get("/my-analyses")
def get_my_analyses(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all analysis jobs and associated reports for the current user,
    with aggregated biomechanical metrics, risk scores, and video info.
    """
    jobs = db.query(models.AnalysisJob).filter(
        models.AnalysisJob.user_id == current_user.user_id
    ).order_by(models.AnalysisJob.created_at.desc()).all()

    analyses = []
    for job in jobs:
        video = db.query(models.Video).filter(models.Video.video_id == job.video_id).first()
        result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == job.id).first()
        if not result and video:
            result = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == video.video_id).order_by(models.AnalysisResult.created_at.desc()).first()
        prediction = None
        recommendation = None
        if result:
            prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == result.analysis_id).first()
            if prediction:
                recommendation = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first()

        pose_frames_count = db.query(models.PoseFrame).filter(models.PoseFrame.analysis_id == job.id).count()
        anomalies_count = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == job.id).count()

        analyses.append({
            "analysis_id": job.id,
            "video_id": job.video_id,
            "status": job.status,
            "stage": job.stage,
            "progress": job.progress,
            "created_at": job.created_at,
            "completed_at": job.completed_at,
            "skeleton_video_url": job.skeleton_video_url,
            "error_message": job.error_message,
            "pose_frames_count": pose_frames_count,
            "anomalies_count": anomalies_count,
            "video": {
                "video_id": video.video_id,
                "filename": video.filename,
                "activity": video.activity,
                "video_url": video.video_url,
                "duration": video.duration,
                "fps": video.fps,
                "resolution": video.resolution,
                "pose_confidence": video.pose_confidence or 0.0,
                "processed_video_url": video.processed_video_url,
            } if video else None,
            "result": {
                "overall_risk_score": result.overall_risk_score,
                "screening_risk_score": result.screening_risk_score or result.overall_risk_score,
                "calibrated_ml_probability": result.calibrated_ml_probability or 0.0,
                "risk_level": result.risk_level,
                "confidence": result.confidence or 0.95,
                "model_version": result.model_version or "2.0.0-weighted",
                "pose_model": result.pose_model or "RTMPose-M (ONNX)",
                "ml_model_version": result.ml_model_version or "2.0.0-supervised",
                "dataset_version": result.dataset_version or "1.0.0-unified",
                "symmetry_score": result.symmetry_score,
                "movement_quality": result.movement_quality,
                "knee_valgus": result.knee_valgus,
                "hip_stability": result.hip_stability,
                "trunk_lean": result.trunk_lean,
            } if result else None,
            "prediction": {
                "acl_risk": prediction.acl_risk,
                "hamstring_risk": prediction.hamstring_risk,
                "ankle_risk": prediction.ankle_risk,
                "shoulder_risk": prediction.shoulder_risk,
                "lower_back_risk": prediction.lower_back_risk,
                "overuse_risk": prediction.overuse_risk,
                "calibrated_probability": prediction.calibrated_probability or 0.0,
                "ml_model_name": prediction.ml_model_name or "Calibrated-XGBoost",
            } if prediction else None,
            "recommendation": {
                "exercise": recommendation.exercise,
                "mobility": recommendation.mobility,
                "strengthening": recommendation.strengthening,
                "recovery": recommendation.recovery,
                "training_modification": recommendation.training_modification,
                "detailed_json": recommendation.detailed_json if recommendation else None
            } if recommendation else None,
        })

    return analyses


@router.delete("/{analysis_id}", status_code=status.HTTP_200_OK)
def delete_analysis_job(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).delete()
    db.delete(job)
    db.commit()
    return {"message": "Analysis job and results deleted successfully.", "analysis_id": analysis_id}


@router.get("/{analysis_id}/status")
def get_analysis_status(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    return {
        "analysis_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "error_message": job.error_message,
        "skeleton_video_url": job.skeleton_video_url
    }


@router.get("/{analysis_id}")
def get_analysis_metadata(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    pose_count = db.query(models.PoseFrame).filter(models.PoseFrame.analysis_id == analysis_id).count()

    return {
        "analysis_id": job.id,
        "video_id": job.video_id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "total_tracked_frames": pose_count,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
        "skeleton_video_url": job.skeleton_video_url,
        "error_message": job.error_message
    }


@router.get("/{analysis_id}/keypoints")
def get_analysis_keypoints(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    frames = db.query(models.PoseFrame).filter(models.PoseFrame.analysis_id == analysis_id).order_by(models.PoseFrame.frame_number).all()

    results = []
    for f in frames:
        results.append({
            "frame_number": f.frame_number,
            "timestamp": f.timestamp,
            "person_id": f.person_id,
            "average_confidence": f.average_confidence,
            "keypoints": json.loads(f.keypoints_json),
            "smoothed_keypoints": json.loads(f.smoothed_keypoints_json)
        })

    return results


@router.get("/{analysis_id}/biomechanics")
def get_analysis_biomechanics(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    frames = db.query(models.BiomechanicsFrame).filter(models.BiomechanicsFrame.analysis_id == analysis_id).order_by(models.BiomechanicsFrame.frame_number).all()

    results = []
    for f in frames:
        results.append({
            "frame_number": f.frame_number,
            "timestamp": f.timestamp,
            "joint_angles": json.loads(f.joint_angles_json),
            "kinematics": json.loads(f.kinematics_json),
            "symmetry": json.loads(f.symmetry_json)
        })

    return results


@router.get("/{analysis_id}/skeleton-video")
def get_skeleton_video_file(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user_from_header_or_query)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    video = db.query(models.Video).filter(models.Video.video_id == job.video_id).first()

    # Candidate filepaths
    candidate_paths = []
    if video and video.processed_video_path:
        candidate_paths.append(video.processed_video_path)
    
    from services.pose_video_processor import PROCESSED_DIR
    candidate_paths.extend([
        os.path.join(PROCESSED_DIR, f"{job.video_id}_{job.id[:8]}_pose.mp4"),
        os.path.join(PROCESSED_DIR, f"{job.video_id}_{job.id}_pose.mp4"),
        os.path.join(PROCESSED_DIR, f"{job.video_id}_pose.mp4"),
        os.path.join(PROCESSED_DIR, f"{job.video_id}_skeleton.mp4")
    ])

    matched_path = None
    for p in candidate_paths:
        if p and os.path.exists(p) and os.path.getsize(p) > 0:
            matched_path = p
            break

    if not matched_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotated skeleton video not found or analysis is still in progress."
        )

    return FileResponse(
        matched_path,
        media_type="video/mp4",
        filename=f"skeleton_{analysis_id}.mp4",
        headers={"Accept-Ranges": "bytes"}
    )


@router.get("/{analysis_id}/download/keypoints")
def download_keypoints(
    analysis_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    frames = db.query(models.PoseFrame).filter(models.PoseFrame.analysis_id == analysis_id).order_by(models.PoseFrame.frame_number).all()

    if format == "json":
        data = [{
            "frame_number": f.frame_number,
            "timestamp": f.timestamp,
            "confidence": f.average_confidence,
            "keypoints": json.loads(f.smoothed_keypoints_json)
        } for f in frames]
        json_str = json.dumps(data, indent=2)
        return StreamingResponse(
            io.BytesIO(json_str.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=keypoints_{analysis_id}.json"}
        )
    else:
        # CSV Export
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["frame_number", "timestamp", "person_id", "confidence", "keypoint_name", "pixel_x", "pixel_y", "kp_confidence"])

        for f in frames:
            kps = json.loads(f.smoothed_keypoints_json)
            for kp_name, kp_val in kps.items():
                writer.writerow([
                    f.frame_number,
                    f.timestamp,
                    f.person_id,
                    f.average_confidence,
                    kp_name,
                    kp_val.get("x"),
                    kp_val.get("y"),
                    kp_val.get("confidence")
                ])

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=keypoints_{analysis_id}.csv"}
        )


@router.get("/{analysis_id}/download/biomechanics")
def download_biomechanics_csv(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")

    verify_analysis_owner(job, current_user)

    frames = db.query(models.BiomechanicsFrame).filter(models.BiomechanicsFrame.analysis_id == analysis_id).order_by(models.BiomechanicsFrame.frame_number).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "frame_number", "timestamp",
        "left_knee_angle", "right_knee_angle",
        "left_hip_angle", "right_hip_angle",
        "left_ankle_angle", "right_ankle_angle",
        "left_elbow_angle", "right_elbow_angle",
        "left_shoulder_angle", "right_shoulder_angle",
        "trunk_lean_angle", "shoulder_alignment", "hip_alignment",
        "knee_asymmetry_deg", "hip_asymmetry_deg", "lower_limb_asymmetry_index",
        "relative_movement_velocity"
    ])

    for f in frames:
        angles = json.loads(f.joint_angles_json)
        symmetry = json.loads(f.symmetry_json)
        kinematics = json.loads(f.kinematics_json)

        writer.writerow([
            f.frame_number, f.timestamp,
            angles.get("left_knee_angle"), angles.get("right_knee_angle"),
            angles.get("left_hip_angle"), angles.get("right_hip_angle"),
            angles.get("left_ankle_angle"), angles.get("right_ankle_angle"),
            angles.get("left_elbow_angle"), angles.get("right_elbow_angle"),
            angles.get("left_shoulder_angle"), angles.get("right_shoulder_angle"),
            angles.get("trunk_lean_angle"), angles.get("shoulder_alignment_angle"), angles.get("hip_alignment_angle"),
            symmetry.get("knee_asymmetry_deg"), symmetry.get("hip_asymmetry_deg"), symmetry.get("lower_limb_asymmetry_index"),
            kinematics.get("relative_movement_velocity")
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=biomechanics_{analysis_id}.csv"}
    )


@router.get("/{analysis_id}/risk")
def get_analysis_risk(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns weighted risk score (0-100), risk level, confidence, model version, and ranked contributing factors.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    if not result:
        result = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == job.video_id).order_by(models.AnalysisResult.created_at.desc()).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk scoring not yet computed for this analysis.")

    factors = db.query(models.RiskFactor).filter(models.RiskFactor.analysis_id == result.analysis_id).order_by(models.RiskFactor.contribution.desc()).all()

    final_screening_score = result.screening_risk_score if (result.screening_risk_score and result.screening_risk_score > 0) else (result.overall_risk_score or 0.0)

    return {
        "analysis_id": analysis_id,
        "overall_score": final_screening_score,
        "screening_risk_score": final_screening_score,
        "calibrated_ml_probability": result.calibrated_ml_probability or 0.0,
        "risk_level": result.risk_level,
        "confidence": result.confidence or 0.95,
        "movement_quality": result.movement_quality,
        "symmetry_score": result.symmetry_score,
        "model_version": result.model_version or "2.0.0-weighted",
        "pose_model": result.pose_model or "RTMPose-M (ONNX)",
        "ml_model_version": result.ml_model_version or "2.0.0-supervised",
        "dataset_version": result.dataset_version or "1.0.0-unified",
        "contributors": [
            {
                "factor": rf.factor,
                "body_region": rf.body_region,
                "severity": rf.severity,
                "impact": rf.contribution,
                "timestamp": rf.timestamp,
                "frame": rf.frame
            }
            for rf in factors
        ]
    }


@router.get("/{analysis_id}/anomalies")
def get_analysis_anomalies(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all detected movement anomalies for synchronized timeline visualization.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == analysis_id).order_by(models.MovementAnomaly.timestamp.asc()).all()

    return [
        {
            "id": an.id,
            "frame": an.frame,
            "timestamp": an.timestamp,
            "type": an.type,
            "score": an.score,
            "severity": an.severity,
            "body_region": an.body_region,
            "explanation": an.explanation
        }
        for an in anomalies
    ]


@router.get("/{analysis_id}/risk-factors")
def get_analysis_risk_factors(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns ranked contributing factors impacting overall injury risk.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    if not result:
        return []

    factors = db.query(models.RiskFactor).filter(models.RiskFactor.analysis_id == result.analysis_id).order_by(models.RiskFactor.contribution.desc()).all()
    return [
        {
            "id": rf.id,
            "factor": rf.factor,
            "body_region": rf.body_region,
            "severity": rf.severity,
            "contribution": rf.contribution,
            "timestamp": rf.timestamp,
            "frame": rf.frame
        }
        for rf in factors
    ]


@router.get("/{analysis_id}/recommendations")
def get_analysis_recommendations(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns prioritized personalized recommendations and regulatory disclaimer.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis results not found.")

    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == result.analysis_id).first()
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Injury predictions not found.")

    rec = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendations not found.")

    detailed_items = []
    if rec.detailed_json:
        try:
            detailed_items = json.loads(rec.detailed_json)
        except Exception:
            pass

    from services.recommendation_engine import RECOMMENDATION_DISCLAIMER

    return {
        "analysis_id": analysis_id,
        "disclaimer": RECOMMENDATION_DISCLAIMER,
        "legacy_summary": {
            "exercise": rec.exercise,
            "mobility": rec.mobility,
            "strengthening": rec.strengthening,
            "recovery": rec.recovery,
            "training_modification": rec.training_modification
        },
        "recommendations": detailed_items
    }


@router.get("/{analysis_id}/complete-report")
def get_complete_analysis_report(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Consolidated endpoint returning analysis metadata, video details, risk scores,
    injury probabilities, biomechanics summary, movement anomalies, and recommendations.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    video = db.query(models.Video).filter(models.Video.video_id == job.video_id).first()
    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    if not result and video:
        result = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == video.video_id).order_by(models.AnalysisResult.created_at.desc()).first()

    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == result.analysis_id).first() if result else None
    recommendation = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first() if prediction else None

    anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == analysis_id).order_by(models.MovementAnomaly.timestamp.asc()).all()
    if not anomalies and result:
        anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == result.analysis_id).order_by(models.MovementAnomaly.timestamp.asc()).all()
    risk_factors = db.query(models.RiskFactor).filter(models.RiskFactor.analysis_id == result.analysis_id).order_by(models.RiskFactor.contribution.desc()).all() if result else []

    bio_summary = {}
    if result and result.biomechanical_summary:
        try:
            bio_summary = json.loads(result.biomechanical_summary)
        except Exception:
            pass

    detailed_recs = []
    if recommendation and recommendation.detailed_json:
        try:
            detailed_recs = json.loads(recommendation.detailed_json)
        except Exception:
            pass

    from services.recommendation_engine import RECOMMENDATION_DISCLAIMER

    final_screening_score = (result.screening_risk_score if (result and result.screening_risk_score and result.screening_risk_score > 0) else (result.overall_risk_score if result else 0.0))

    return {
        "analysis": {
            "analysis_id": job.id,
            "video_id": job.video_id,
            "status": job.status,
            "stage": job.stage,
            "progress": job.progress,
            "created_at": job.created_at,
            "completed_at": job.completed_at,
            "skeleton_video_url": job.skeleton_video_url,
            "error_message": job.error_message
        },
        "video": {
            "video_id": video.video_id if video else None,
            "filename": video.filename if video else None,
            "activity": video.activity if video else "General Movement",
            "video_url": video.video_url if video else None,
            "duration": video.duration if video else 0.0,
            "fps": video.fps if video else 0,
            "pose_confidence": video.pose_confidence if video else 0.0,
            "processed_video_url": video.processed_video_url if video else None
        } if video else None,
        "risk": {
            "overall_score": final_screening_score,
            "screening_risk_score": final_screening_score,
            "calibrated_ml_probability": result.calibrated_ml_probability if result else 0.0,
            "risk_level": result.risk_level if result else "LOW",
            "confidence": result.confidence if result else 0.95,
            "movement_quality": result.movement_quality if result else 0.0,
            "symmetry_score": result.symmetry_score if result else 0.0,
            "model_version": result.model_version if result else "2.0.0-weighted",
            "pose_model": result.pose_model if result else "RTMPose-M (ONNX)",
            "ml_model_version": result.ml_model_version if result else "2.0.0-supervised",
            "dataset_version": result.dataset_version if result else "1.0.0-unified"
        } if result else None,
        "injury_prediction": {
            "acl": prediction.acl_risk if prediction else 0.0,
            "hamstring": prediction.hamstring_risk if prediction else 0.0,
            "ankle": prediction.ankle_risk if prediction else 0.0,
            "shoulder": prediction.shoulder_risk if prediction else 0.0,
            "lower_back": prediction.lower_back_risk if prediction else 0.0,
            "overuse": prediction.overuse_risk if prediction else 0.0,
            "calibrated_probability": prediction.calibrated_probability if prediction else 0.0,
            "ml_model_name": prediction.ml_model_name if prediction else "Calibrated-XGBoost"
        } if prediction else {},
        "biomechanics": bio_summary,
        "anomalies": [
            {
                "frame": a.frame,
                "timestamp": a.timestamp,
                "type": a.type,
                "score": a.score,
                "severity": a.severity,
                "body_region": a.body_region,
                "explanation": a.explanation
            }
            for a in anomalies
        ],
        "risk_factors": [
            {
                "factor": rf.factor,
                "body_region": rf.body_region,
                "severity": rf.severity,
                "contribution": rf.contribution,
                "timestamp": rf.timestamp,
                "frame": rf.frame
            }
            for rf in risk_factors
        ],
        "recommendations": detailed_recs,
        "legacy_recommendation": {
            "exercise": recommendation.exercise if recommendation else None,
            "mobility": recommendation.mobility if recommendation else None,
            "strengthening": recommendation.strengthening if recommendation else None,
            "recovery": recommendation.recovery if recommendation else None,
            "training_modification": recommendation.training_modification if recommendation else None
        } if recommendation else None,
        "disclaimer": RECOMMENDATION_DISCLAIMER
    }


@router.get("/{analysis_id}/explainability")
def get_analysis_explainability(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns explainability insights: feature contributions, clinical screening breakdowns,
    and model attribution for the supervised injury predictor.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis result not ready.")

    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == analysis_id).first()

    bio_summary = {}
    if result.biomechanical_summary:
        try:
            bio_summary = json.loads(result.biomechanical_summary)
        except Exception:
            pass

    from services.ml_injury_service import get_ml_predictor
    predictor = get_ml_predictor()
    ml_res = predictor.predict(bio_summary, athlete_profile={"training_load": 50.0})

    return {
        "analysis_id": analysis_id,
        "model_name": prediction.ml_model_name if prediction else "Calibrated-XGBoost",
        "model_version": result.ml_model_version or "2.0.0-supervised",
        "calibrated_probability": result.calibrated_ml_probability or 0.0,
        "screening_risk_score": result.screening_risk_score or result.overall_risk_score,
        "contributions": ml_res.get("contributions", []),
        "breakdowns": ml_res.get("breakdowns", {}),
        "disclaimer": "Supervised ML model trained on Lövdal (2021) and Swathikiran (2021) athlete cohorts using subject-level grouped validation. Monocular video keypoints provide screening kinematic proxies, not 3D clinical gait kinematics."
    }


@router.get("/{analysis_id}/download/pdf")
def download_pdf_report(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user_from_header_or_query)
):
    """
    Downloads comprehensive 9-section PDF screening report.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    video = db.query(models.Video).filter(models.Video.video_id == job.video_id).first()
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == job.user_id).first()
    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == result.analysis_id).first() if result else None
    recommendation = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first() if prediction else None

    anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == analysis_id).all()
    risk_factors = db.query(models.RiskFactor).filter(models.RiskFactor.analysis_id == result.analysis_id).all() if result else []

    bio_summary = json.loads(result.biomechanical_summary) if (result and result.biomechanical_summary) else {}
    detailed_recs = json.loads(recommendation.detailed_json) if (recommendation and recommendation.detailed_json) else []

    from services.report_generator import ReportGenerator

    pdf_bytes = ReportGenerator.generate_pdf_report(
        analysis_id=analysis_id,
        video_data={"filename": video.filename if video else "video.mp4", "activity": video.activity if video else "Movement"},
        athlete_data={"name": current_user.name, "sport": athlete.sport if athlete else "General", "position": athlete.position if athlete else "Athlete", "age": athlete.age if athlete else "N/A", "height": athlete.height if athlete else "N/A", "weight": athlete.weight if athlete else "N/A", "training_load": athlete.training_load if athlete else "N/A"},
        risk_data={"overall_score": result.overall_risk_score if result else 0.0, "risk_level": result.risk_level if result else "LOW", "confidence": result.confidence if result else 0.95},
        prediction_data={"acl_risk": prediction.acl_risk if prediction else 0.0, "hamstring_risk": prediction.hamstring_risk if prediction else 0.0, "ankle_risk": prediction.ankle_risk if prediction else 0.0, "shoulder_risk": prediction.shoulder_risk if prediction else 0.0, "lower_back_risk": prediction.lower_back_risk if prediction else 0.0, "overuse_risk": prediction.overuse_risk if prediction else 0.0},
        biomech_summary=bio_summary,
        anomalies=[{"frame": a.frame, "timestamp": a.timestamp, "type": a.type, "severity": a.severity, "body_region": a.body_region, "explanation": a.explanation} for a in anomalies],
        risk_factors=[{"factor": rf.factor, "body_region": rf.body_region, "severity": rf.severity, "contribution": rf.contribution} for rf in risk_factors],
        recommendations=detailed_recs
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=AthleteGuard_Report_{analysis_id[:8]}.pdf"}
    )


@router.get("/{analysis_id}/download/excel")
def download_excel_report(
    analysis_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user_from_header_or_query)
):
    """
    Downloads comprehensive 6-sheet analytical Excel workbook.
    """
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == analysis_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found.")
    verify_analysis_owner(job, current_user)

    video = db.query(models.Video).filter(models.Video.video_id == job.video_id).first()
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == job.user_id).first()
    result = db.query(models.AnalysisResult).filter(models.AnalysisResult.analysis_id == analysis_id).first()
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.analysis_id == result.analysis_id).first() if result else None
    recommendation = db.query(models.Recommendation).filter(models.Recommendation.prediction_id == prediction.prediction_id).first() if prediction else None

    anomalies = db.query(models.MovementAnomaly).filter(models.MovementAnomaly.analysis_id == analysis_id).all()
    risk_factors = db.query(models.RiskFactor).filter(models.RiskFactor.analysis_id == result.analysis_id).all() if result else []
    frames = db.query(models.BiomechanicsFrame).filter(models.BiomechanicsFrame.analysis_id == analysis_id).order_by(models.BiomechanicsFrame.frame_number).all()

    frame_dicts = [
        {
            "frame_number": f.frame_number,
            "timestamp": f.timestamp,
            "joint_angles": json.loads(f.joint_angles_json) if isinstance(f.joint_angles_json, str) else {},
            "symmetry": json.loads(f.symmetry_json) if isinstance(f.symmetry_json, str) else {}
        }
        for f in frames
    ]

    bio_summary = json.loads(result.biomechanical_summary) if (result and result.biomechanical_summary) else {}
    detailed_recs = json.loads(recommendation.detailed_json) if (recommendation and recommendation.detailed_json) else []

    from services.report_generator import ReportGenerator

    excel_bytes = ReportGenerator.generate_excel_report(
        analysis_id=analysis_id,
        video_data={"filename": video.filename if video else "video.mp4", "activity": video.activity if video else "Movement"},
        athlete_data={"name": current_user.name, "sport": athlete.sport if athlete else "General", "position": athlete.position if athlete else "Athlete"},
        risk_data={"overall_score": result.overall_risk_score if result else 0.0, "risk_level": result.risk_level if result else "LOW", "confidence": result.confidence if result else 0.95},
        prediction_data={"acl_risk": prediction.acl_risk if prediction else 0.0, "hamstring_risk": prediction.hamstring_risk if prediction else 0.0, "ankle_risk": prediction.ankle_risk if prediction else 0.0, "shoulder_risk": prediction.shoulder_risk if prediction else 0.0, "lower_back_risk": prediction.lower_back_risk if prediction else 0.0, "overuse_risk": prediction.overuse_risk if prediction else 0.0},
        biomech_summary=bio_summary,
        biomech_frames=frame_dicts,
        anomalies=[{"frame": a.frame, "timestamp": a.timestamp, "type": a.type, "score": a.score, "severity": a.severity, "body_region": a.body_region, "explanation": a.explanation} for a in anomalies],
        risk_factors=[{"factor": rf.factor, "body_region": rf.body_region, "severity": rf.severity, "contribution": rf.contribution} for rf in risk_factors],
        recommendations=detailed_recs
    )

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=AthleteGuard_Workbook_{analysis_id[:8]}.xlsx"}
    )
