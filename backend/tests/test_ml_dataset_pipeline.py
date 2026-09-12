import os
import json
import uuid
from datetime import datetime
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
import database, models, auth
from services.ml_injury_service import SupervisedInjuryPredictor, get_ml_predictor

client = TestClient(app)

def test_models_catalog_endpoint():
    """
    Verifies that GET /api/models returns complete information about
    RTMPose-M ONNX pose estimation and Calibrated XGBoost injury prediction.
    """
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    
    # Pose model checks
    pose = data["pose_model"]
    assert "RTMPose-M" in pose["name"]
    assert pose["keypoints"] == 17
    assert "SimCC" in pose["architecture"]
    assert "rtmlib" in pose["primary_backend"]
    assert "One-Euro" in pose["temporal_smoother"]

    # Supervised injury model checks
    injury = data["injury_models"]
    primary = injury["primary_production_model"]
    assert "Calibrated XGBoost" in primary["name"]
    assert primary["features_count"] == 19
    assert "Subject-Level GroupShuffleSplit" in primary["split_strategy"]
    assert primary["train_athletes"] == 78
    assert primary["test_athletes"] == 26
    assert "roc_auc" in primary["evaluation"]

    # Screening engine checks
    screening = data["screening_engine"]
    assert screening["weights"]["biomechanics_kinematics"] == 0.35
    assert screening["weights"]["injury_history"] == 0.20


def test_datasets_catalog_endpoint():
    """
    Verifies that GET /api/datasets returns the verified catalog of authentic public datasets.
    """
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "integrated"
    
    raw = data["raw_datasets"]
    raw_ids = [d["id"] for d in raw]
    assert "lovdal_2021" in raw_ids
    assert "swathikiran_2021" in raw_ids
    assert "fukuchi_2017" in raw_ids
    assert "santos_2017" in raw_ids
    assert "zenodo_intellirehabds" in raw_ids

    # Check verified processed datasets
    processed = data["processed_datasets"]
    proc_ids = [d["id"] for d in processed]
    assert "injury_prediction_dataset" in proc_ids
    assert "unified_biomechanics_dataset" in proc_ids

    injury_ds = next(d for d in processed if d["id"] == "injury_prediction_dataset")
    assert injury_ds["samples_count"] >= 40000
    assert injury_ds["athletes_count"] >= 100


def test_supervised_injury_predictor_direct_inference():
    """
    Tests SupervisedInjuryPredictor inference directly with mock biomechanical summary.
    """
    predictor = get_ml_predictor()
    mock_summary = {
        "knee_valgus_angle": {"mean": 14.5, "max": 21.0},
        "hip_stability": {"mean": 18.2},
        "trunk_lean": {"mean": 8.0},
        "bilateral_knee_asymmetry": {"mean": 6.8}
    }
    mock_athlete = {
        "training_load": 75.0,
        "weekly_mileage": 60.0
    }

    result = predictor.predict(mock_summary, mock_athlete)
    assert "calibrated_probability" in result
    assert 0.0 <= result["calibrated_probability"] <= 1.0
    assert "model_name" in result
    assert "contributions" in result
    assert len(result["contributions"]) > 0
    assert "breakdowns" in result
    assert "overuse_injury" in result["breakdowns"]
    assert "acl_knee_ligament" in result["breakdowns"]


def test_explainability_api_flow():
    """
    Tests GET /api/analysis/{analysis_id}/explainability endpoint.
    """
    db = database.SessionLocal()
    user_id = str(uuid.uuid4())
    token = auth.create_access_token({"sub": user_id})
    headers = {"Authorization": f"Bearer {token}"}

    # Setup user, athlete, video, job, result, prediction
    user = models.User(
        user_id=user_id,
        email=f"ml_test_{user_id[:8]}@example.com",
        name="ML Test User",
        password="testpasshash"
    )
    db.add(user)
    db.flush()

    video = models.Video(
        video_id=str(uuid.uuid4()),
        user_id=user_id,
        filename="sprint_test.mp4",
        activity="Sprint",
        video_url="/uploads/videos/sprint_test.mp4",
        processing_status="completed"
    )
    db.add(video)
    db.flush()

    job_id = str(uuid.uuid4())
    job = models.AnalysisJob(
        id=job_id,
        video_id=video.video_id,
        user_id=user_id,
        status="completed",
        stage="Analysis Complete",
        progress=100.0,
        completed_at=datetime.utcnow()
    )
    db.add(job)
    db.flush()

    res = models.AnalysisResult(
        analysis_id=job_id,
        video_id=video.video_id,
        athlete_id="athlete-test-1",
        knee_valgus=12.5,
        hip_stability=78.0,
        trunk_lean=6.2,
        symmetry_score=88.0,
        overall_risk_score=55.0,
        screening_risk_score=55.0,
        calibrated_ml_probability=0.185,
        pose_model="RTMPose-M (ONNX)",
        ml_model_version="2.0.0-supervised",
        dataset_version="1.0.0-unified",
        biomechanical_summary=json.dumps({
            "knee_valgus_angle": {"mean": 12.5},
            "bilateral_knee_asymmetry": {"mean": 5.2}
        })
    )
    db.add(res)
    db.flush()

    pred = models.InjuryPrediction(
        analysis_id=job_id,
        acl_risk=45.0,
        overuse_risk=35.0,
        calibrated_probability=0.185,
        ml_model_name="Calibrated-XGBoost"
    )
    db.add(pred)
    db.commit()

    # Invoke GET /api/analysis/{analysis_id}/explainability
    response = client.get(f"/api/analysis/{job_id}/explainability", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_id"] == job_id
    assert data["model_name"] == "Calibrated-XGBoost"
    assert "calibrated_probability" in data
    assert "contributions" in data
    assert "breakdowns" in data
    assert "disclaimer" in data

    # Test POST /api/analysis/videos/{video_id}/reanalyse
    reanalyse_resp = client.post(f"/api/analysis/videos/{video.video_id}/reanalyse", headers=headers)
    assert reanalyse_resp.status_code == 202
    reanalyse_data = reanalyse_resp.json()
    assert "analysis_id" in reanalyse_data
    assert reanalyse_data["status"] == "queued"
    assert reanalyse_data["video_id"] == video.video_id

    db.close()
