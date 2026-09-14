"""
Backend Integration Test Suite for Production ML Engine & Feature Adapter.
Verifies valid inference, error handling, missing feature resilience, and non-breaking risk engine behavior.
"""

import pytest
import sys
import os
import uuid
from fastapi.testclient import TestClient

# Path configuration for backend testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.main import app
from app.services.ml_prediction_service import ml_prediction_service
from ml_inference import predict_injury_risk, SportsInjuryPredictor

client = TestClient(app)


def test_valid_ml_inference():
    """Test direct ML inference using valid 18-feature dictionary."""
    valid_data = {
        'fatigue_score': 50.0,
        'acceleration': 0.0,
        'angular_velocity': 0.0,
        'body_orientation': 12.0,
        'ground_reaction_force': 495.0,
        'step_count': 100,
        'cadence': 80.0,
        'jump_height_cm': 50.0,
        'range_of_motion': 75.0,
        'impact_force': 300.0,
        'gait_symmetry': 0.90,
        'speed': 6.0,
        'training_duration': 90.0,
        'previous_injury_history': 0,
        'rest_period': 8.0,
        'repetition_count': 30,
        'workload_intensity': 6.0,
        'acc_rms': 1.0
    }
    result = predict_injury_risk(valid_data)
    assert "risk_probability" in result
    assert "risk_score_percent" in result
    assert "risk_level" in result
    assert result["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert result["model"] == "Random Forest (Balanced)"


def test_missing_feature_handling():
    """Test that missing required features in input dictionary raise ValueError."""
    invalid_data = {
        'fatigue_score': 50.0,
        # missing ground_reaction_force and other features
    }
    predictor = SportsInjuryPredictor()
    with pytest.raises(ValueError) as excinfo:
        predictor.validate_input(invalid_data)
    assert "Missing required feature(s)" in str(excinfo.value)


def test_non_numeric_feature_handling():
    """Test that non-numeric values in input dictionary raise ValueError."""
    malformed_data = {
        'fatigue_score': "INVALID_NON_NUMERIC_STRING",
        'acceleration': 0.0,
        'angular_velocity': 0.0,
        'body_orientation': 12.0,
        'ground_reaction_force': 495.0,
        'step_count': 100,
        'cadence': 80.0,
        'jump_height_cm': 50.0,
        'range_of_motion': 75.0,
        'impact_force': 300.0,
        'gait_symmetry': 0.90,
        'speed': 6.0,
        'training_duration': 90.0,
        'previous_injury_history': 0,
        'rest_period': 8.0,
        'repetition_count': 30,
        'workload_intensity': 6.0,
        'acc_rms': 1.0
    }
    predictor = SportsInjuryPredictor()
    with pytest.raises(ValueError) as excinfo:
        predictor.validate_input(malformed_data)
    assert "Invalid non-numeric value" in str(excinfo.value)


def test_ml_prediction_service_adapter():
    """Test MLPredictionService adapter with video kinematics & profile data."""
    kinematics = {
        "joint_angles": {"trunk_lean_avg": 14.5},
        "range_of_motion": 78.0,
        "symmetry_score": 92.0,
        "acc_rms": 1.05
    }
    profile = {"training_load": 100.0}
    injuries = [{"injury_type": "ACL Strain"}]

    res = ml_prediction_service.generate_ml_prediction(kinematics, profile, injuries)
    assert res["available"] is True
    assert "probability" in res
    assert "score" in res
    assert res["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "range_of_motion" in res["connected_features"]
    assert "previous_injury_history" in res["connected_features"]
    assert "body_orientation" in res["baseline_fallback_features"]
    assert "ground_reaction_force" in res["baseline_fallback_features"]


def test_health_endpoint():
    """Verify backend health endpoint is functional."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_batch_video_upload_limit():
    """Verify that uploading more than 5 videos returns HTTP 400 with strict validation message."""
    from app.main import get_current_user
    from app import models

    mock_user = models.User(
        user_id=uuid.uuid4(),
        name="Test Athlete",
        email="test@athlete.com",
        password="dummypasswordhash",
        role=models.UserRole.ATHLETE
    )

    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        files = [
            ("files", ("video1.mp4", b"dummy content 1", "video/mp4")),
            ("files", ("video2.mp4", b"dummy content 2", "video/mp4")),
            ("files", ("video3.mp4", b"dummy content 3", "video/mp4")),
            ("files", ("video4.mp4", b"dummy content 4", "video/mp4")),
            ("files", ("video5.mp4", b"dummy content 5", "video/mp4")),
            ("files", ("video6.mp4", b"dummy content 6", "video/mp4")),
        ]
        response = client.post("/videos/upload-batch", files=files, data={"activity": "Squatting"})
        assert response.status_code == 400
        assert "Maximum 5 videos can be uploaded at once." in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()




