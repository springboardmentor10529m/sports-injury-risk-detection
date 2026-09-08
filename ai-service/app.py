"""
Sports Injury Risk Detection - AI Microservice
FastAPI server exposing endpoints for video biomechanics, pose estimation, ML inference, and recommendations.
"""

import os
import time
import json
import shutil
import tempfile
import cv2
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from services.video_processor import VideoProcessor
from services.pose_estimator import PoseEstimator
from services.biomechanics import BiomechanicsAnalyzer
from services.feature_extractor import FeatureExtractor
from services.ml_engine import MLEngine
from services.anomaly_detector import AnomalyDetector
from services.risk_scorer import RiskScorer
from services.recommendation_engine import RecommendationEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)

app = FastAPI(
    title="Sports Injury Risk Detection AI Service",
    description="Microservice for video pose kinematics, machine learning risk estimation, and corrective exercise prescriptions.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount outputs directory for serving annotated videos and snapshots
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

# Initialize singleton service components
video_processor = VideoProcessor(target_fps=15)
biomechanics_analyzer = BiomechanicsAnalyzer()
feature_extractor = FeatureExtractor()
ml_engine = MLEngine(models_dir=MODELS_DIR)
anomaly_detector = AnomalyDetector()
risk_scorer = RiskScorer()
recommendation_engine = RecommendationEngine()

START_TIME = time.time()

# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------
class AthleteProfile(BaseModel):
    age: Optional[float] = 25.0
    height: Optional[float] = 180.0
    weight: Optional[float] = 75.0
    previous_injuries: Optional[int] = 0
    injury_recurrence: Optional[int] = 0
    chronic_conditions: Optional[bool] = False

class WorkloadData(BaseModel):
    training_intensity: Optional[float] = 0.50
    recovery_time_days: Optional[float] = 3.0
    weekly_training_hours: Optional[float] = 12.0
    sleep_hours_avg: Optional[float] = 7.5

class DirectPredictRequest(BaseModel):
    athlete_profile: Optional[AthleteProfile] = None
    workload_data: Optional[WorkloadData] = None
    kinematics: Optional[Dict[str, Any]] = None

class VideoPathRequest(BaseModel):
    video_path: str
    athlete_profile: Optional[AthleteProfile] = None
    workload_data: Optional[WorkloadData] = None

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "uptime_sec": round(time.time() - START_TIME, 1),
        "models_loaded": ml_engine.is_loaded,
        "device": "CPU",
        "service": "Sports Injury AI Microservice"
    }

@app.get("/api/ai/models/metrics")
def get_model_metrics():
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Model metrics not found. Train models first.")
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    return metrics

def _process_video_pipeline(
    input_video_path: str,
    athlete_profile: Optional[Dict[str, Any]] = None,
    workload_data: Optional[Dict[str, Any]] = None,
    generate_annotated: bool = True
) -> Dict[str, Any]:
    """Internal core processing pipeline for a local video file."""
    # 1. Video validation & metadata
    metadata = video_processor.extract_metadata(input_video_path)
    is_valid, validation_err = video_processor.validate_video(metadata)
    if not is_valid:
        raise HTTPException(status_code=400, detail=validation_err)

    quality = video_processor.assess_video_quality(input_video_path)

    # 2. Pose estimation across sampled frames
    pose_estimator = PoseEstimator(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    frame_kinematics_list = []
    annotated_frames = []

    try:
        for frame_idx, timestamp, frame in video_processor.frame_generator(input_video_path):
            pose_res, annotated_frame = pose_estimator.process_frame(frame)
            if pose_res and "keypoints" in pose_res:
                kine = biomechanics_analyzer.analyze_frame_kinematics(pose_res["keypoints"])
                kine["frame_idx"] = frame_idx
                kine["timestamp_sec"] = timestamp
                frame_kinematics_list.append(kine)

                # Overlay HUD text on annotated frame
                if generate_annotated:
                    kl = kine.get("knee_angle_left")
                    kr = kine.get("knee_angle_right")
                    asym = kine.get("bilateral_knee_asymmetry_pct")
                    hud_text = f"Knee L: {kl or '--'} | R: {kr or '--'} | Asym: {asym or '--'}%"
                    cv2.putText(annotated_frame, hud_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2)
                    annotated_frames.append(annotated_frame)
    finally:
        pose_estimator.close()

    if not frame_kinematics_list:
        raise HTTPException(
            status_code=422,
            detail="No human pose could be reliably detected in this video. Please upload a clear sports movement video."
        )

    # 3. Aggregate Kinematics & Feature Extraction
    features = feature_extractor.aggregate_kinematics(
        frame_kinematics_list=frame_kinematics_list,
        fps=metadata["fps"],
        athlete_profile=athlete_profile
    )
    summary_kinematics = features["summary_kinematics"]
    ml_feature_vector = features["ml_feature_vector"]

    # 4. Machine Learning Inference
    ml_prediction = ml_engine.predict(
        feature_vector=ml_feature_vector,
        workload_data=workload_data
    )

    # 5. Biomechanical Anomaly Detection
    anomalies = anomaly_detector.detect_anomalies(summary_kinematics)

    # 6. Unified 5-Factor Weighted Risk Scoring
    risk_data = risk_scorer.compute_risk_score(
        summary_kinematics=summary_kinematics,
        ml_prediction=ml_prediction,
        athlete_history=athlete_profile,
        workload_data=workload_data
    )

    # 7. Corrective Recommendations
    recommendations = recommendation_engine.generate_recommendations(
        risk_data=risk_data,
        anomalies=anomalies,
        ml_prediction=ml_prediction
    )

    # 8. Render Annotated Video Output if requested
    annotated_video_url = None
    if generate_annotated and annotated_frames:
        out_filename = f"annotated_{int(time.time())}_{os.path.basename(input_video_path)}"
        out_path = os.path.join(OUTPUTS_DIR, out_filename)
        h, w, _ = annotated_frames[0].shape
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(out_path, fourcc, 15, (w, h))
        for af in annotated_frames:
            writer.write(af)
        writer.release()
        annotated_video_url = f"/outputs/{out_filename}"

    return {
        "success": True,
        "video_metadata": metadata,
        "video_quality": quality,
        "frames_analyzed": len(frame_kinematics_list),
        
        # 1. BIOMECHANICAL MEASUREMENTS (Pure kinematics)
        "biomechanical_measurements": {
            "knee_flexion": summary_kinematics["knee_flexion"],
            "knee_valgus": summary_kinematics["knee_valgus"],
            "trunk_lean": summary_kinematics["trunk_lean"],
            "ankle_flexion": summary_kinematics["ankle_flexion"],
            "bilateral_asymmetry": summary_kinematics["bilateral_asymmetry"],
            "sample_frame_kinematics": frame_kinematics_list[:20]  # First 20 frames for graph plotting
        },

        # 2. MACHINE LEARNING PREDICTION (Statistical inferences)
        "ml_predictions": ml_prediction,

        # 3. WEIGHTED INJURY RISK SCORE (0 - 100 Index)
        "weighted_risk_score": risk_data,

        # Anomalies & Prescriptions
        "anomalies": anomalies,
        "recommendations": recommendations,
        "annotated_video_url": annotated_video_url
    }

@app.post("/api/ai/analyze-video")
async def analyze_video_upload(
    video: UploadFile = File(...),
    athlete_profile_json: Optional[str] = Form(None),
    workload_data_json: Optional[str] = Form(None)
):
    """Processes uploaded video through complete CV, ML, Risk Scoring, and Recommendation pipeline."""
    athlete_profile = json.loads(athlete_profile_json) if athlete_profile_json else {}
    workload_data = json.loads(workload_data_json) if workload_data_json else {}

    # Save uploaded file to temp directory
    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(video.file, tmp)
        tmp_path = tmp.name

    try:
        result = _process_video_pipeline(
            input_video_path=tmp_path,
            athlete_profile=athlete_profile,
            workload_data=workload_data,
            generate_annotated=True
        )
        return result
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/api/ai/analyze-path")
def analyze_video_by_path(req: VideoPathRequest):
    """Processes a video already stored on the server by absolute path."""
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail="File does not exist on disk.")

    prof = req.athlete_profile.dict() if req.athlete_profile else {}
    wl = req.workload_data.dict() if req.workload_data else {}

    return _process_video_pipeline(
        input_video_path=req.video_path,
        athlete_profile=prof,
        workload_data=wl,
        generate_annotated=True
    )

@app.post("/api/ai/predict-risk")
def direct_predict_risk(req: DirectPredictRequest):
    """Direct inference for API clients supplying kinematic and workload features."""
    prof = req.athlete_profile.dict() if req.athlete_profile else {}
    wl = req.workload_data.dict() if req.workload_data else {}
    kine = req.kinematics or {
        "knee_flexion": {"mean": 58.0, "rom": 55.0},
        "knee_valgus": {"mean": 6.0, "max": 11.5},
        "trunk_lean": {"mean": 4.5, "max": 8.0},
        "ankle_flexion": {"mean": 62.0, "min": 32.0},
        "bilateral_asymmetry": {"mean": 8.5, "max": 14.0}
    }

    feature_vec = {
        "Age": float(prof.get("age", 25)),
        "Height_cm": float(prof.get("height", 180)),
        "Weight_kg": float(prof.get("weight", 75)),
        "Knee_Angle_deg": float(kine.get("knee_flexion", {}).get("mean", 58.0)),
        "Jump_Height_cm": 60.0,
        "Ankle_Flexion_deg": float(kine.get("ankle_flexion", {}).get("mean", 62.0)),
        "Speed_m_s": 35.0,
        "Reaction_Time_ms": 160.0,
        "Injury_Recurrence": int(prof.get("previous_injuries", 0))
    }

    ml_prediction = ml_engine.predict(feature_vec, workload_data=wl)
    anomalies = anomaly_detector.detect_anomalies(kine)
    risk_data = risk_scorer.compute_risk_score(
        summary_kinematics=kine,
        ml_prediction=ml_prediction,
        athlete_history=prof,
        workload_data=wl
    )
    recommendations = recommendation_engine.generate_recommendations(
        risk_data=risk_data,
        anomalies=anomalies,
        ml_prediction=ml_prediction
    )

    return {
        "success": True,
        "biomechanical_measurements": kine,
        "ml_predictions": ml_prediction,
        "weighted_risk_score": risk_data,
        "anomalies": anomalies,
        "recommendations": recommendations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
