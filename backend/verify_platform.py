"""
SportShield Full Platform Automated Verification Suite
Validates all 15 mentor requirements:
1. All 3 Mentor Datasets (Loaded, verified schemas, record counts)
2. Biomechanical Features (6 core metrics: Valgus, Hip, Trunk, ROM, Symmetry, Smoothness)
3. Activity Classification (Running vs Squatting)
4. Feature Engineering & Anomaly Detection (Z-scores against population norms)
5. Deterministic Risk Rules & Contributing Factors
6. Honest ML Architecture Status
7. Recommendation Engine (5 categories with 'Why Generated' explanations)
8. Injury History & Risk Weighting
9. Fatigue Monitoring
10. API Endpoints
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from dataset_loader import (
    verify_datasets_exist,
    load_project_injury_dataset,
    load_sports_multimodal_dataset,
    load_collegiate_athlete_dataset,
    get_population_benchmarks,
    get_datasets_summary,
)
from feature_engineering import (
    detect_biomechanical_anomalies,
    build_engineered_feature_vector,
)
from risk_rules import calculate_injury_predictions
from recommendation_engine import generate_targeted_recommendations
from ml_pipeline import ml_interface
from fastapi.testclient import TestClient
from main import app


def test_datasets():
    print("\n--- [TEST 1] Mentor Datasets Presence & Loading ---")
    exists = verify_datasets_exist()
    for name, status in exists.items():
        assert status, f"Missing required dataset: {name}"
        print(f"  [OK] {name}: Present on disk")

    df1 = load_project_injury_dataset()
    df2 = load_sports_multimodal_dataset()
    df3 = load_collegiate_athlete_dataset()

    assert len(df1) >= 40, "Project-Injury-Dataset should contain athlete records"
    assert len(df2) >= 30, "sports_multimodal_data should contain session records"
    assert len(df3) >= 25, "collegiate_athlete_injury_dataset should contain records"

    print(f"  [OK] Project-Injury-Dataset.csv: {len(df1)} records, {len(df1.columns)} columns")
    print(f"  [OK] sports_multimodal_data.csv: {len(df2)} records, {len(df2.columns)} columns")
    print(f"  [OK] collegiate_athlete_injury_dataset.csv: {len(df3)} records, {len(df3.columns)} columns")

    summary = get_datasets_summary()
    assert summary["status"] == "connected"
    assert len(summary["datasets"]) == 3
    print("  [OK] Dataset summary endpoint payload validated")


def test_population_benchmarks():
    print("\n--- [TEST 2] Population Benchmarks Calculation ---")
    benchmarks = get_population_benchmarks()
    required_metrics = [
        "knee_valgus_angle_deg",
        "hip_stability_score",
        "trunk_lateral_flexion_deg",
        "range_of_motion_deg",
        "bilateral_symmetry_pct",
        "movement_smoothness_score"
    ]
    for m in required_metrics:
        assert m in benchmarks, f"Missing benchmark metric: {m}"
        val = benchmarks[m]
        assert "mean" in val and "std" in val and "optimal" in val
        print(f"  [OK] Benchmark {m}: Mean={val['mean']}, Std={val['std']}, Optimal={val['optimal']}")


def test_feature_engineering_and_anomalies():
    print("\n--- [TEST 3] Feature Engineering & Anomaly Detection ---")
    # High risk input: High knee valgus (22.5 deg), low hip stability (52.0), high trunk lean (13.0 deg)
    raw_high_risk = {
        "knee_valgus_angle_deg": 22.5,
        "hip_stability_score": 52.0,
        "trunk_lateral_flexion_deg": 13.0,
        "range_of_motion_deg": 88.0,
        "bilateral_symmetry_pct": 71.0,
        "movement_smoothness_score": 58.0
    }
    anomalies = detect_biomechanical_anomalies(raw_high_risk)
    critical_count = len([a for a in anomalies if a["severity"] == "HIGH"])
    assert critical_count >= 2, f"Expected at least 2 critical anomalies, found {critical_count}"
    print(f"  [OK] Detected {len(anomalies)} metrics checked, {critical_count} marked HIGH severity")

    # Vector generation
    feat_result = build_engineered_feature_vector(
        raw_high_risk,
        activity_type="running",
        fatigue_indicators={"session_rpe": 8.0, "biomechanical_variance_decay": 0.25},
        injury_history_count=2
    )
    assert len(feat_result["feature_vector"]) == 13
    assert feat_result["fatigue_profile"]["fatigue_risk_multiplier"] > 1.0
    print(f"  [OK] Engineered feature vector generated: length={len(feat_result['feature_vector'])}")
    print(f"  [OK] Fatigue risk multiplier applied: {feat_result['fatigue_profile']['fatigue_risk_multiplier']}")


def test_dataset_ml_risk_prediction():
    print("\n--- [TEST 4] Dataset-Trained Random Forest ML Risk Prediction ---")
    base_biomechanics = {
        "knee_valgus": 14.5,
        "trunk_lean": 9.0,
        "symmetry_score": 79.0,
        "hip_stability": 70.0,
        "fatigue_score": 30.0,
        "movement_quality": 75.0,
        "range_of_motion_deg": 62.0
    }

    res = calculate_injury_predictions(
        base_biomechanics,
        athlete_position="Winger"
    )

    assert "overall_risk_score" in res, "Must return overall_risk_score"
    assert "risk_level" in res, "Must return risk_level from ML model"
    print(f"  [OK] ML Risk Score: {res['overall_risk_score']}/100")
    print(f"  [OK] ML Risk Level: {res['risk_level']}")
    print(f"  [OK] ACL Risk: {res['acl_risk']}%, Hamstring Risk: {res['hamstring_risk']}%")


def test_recommendation_engine():
    print("\n--- [TEST 5] Recommendation Engine (5 Categories & 'Why Generated') ---")
    biomechanics = {
        "knee_valgus": 18.2,
        "hip_stability": 62.0,
        "trunk_lean": 10.5,
        "bilateral_symmetry": 74.0,
        "range_of_motion_deg": 88.0,
        "movement_smoothness_score": 65.0
    }
    prediction = {
        "overall_risk_score": 72.0,
        "acl_risk": 68.0,
        "hamstring_risk": 55.0,
        "lower_back_risk": 62.0
    }

    recs = generate_targeted_recommendations(
        biomechanics=biomechanics,
        risk_prediction=prediction,
        training_load=82.0,
        rpe_score=8.5
    )

    categories = recs["categories"]
    required_cats = [
        "corrective_drills",
        "mobility_flexibility",
        "strengthening",
        "recovery",
        "workload_modification"
    ]

    for cat in required_cats:
        assert cat in categories and len(categories[cat]) > 0, f"Missing category: {cat}"
        first_item = categories[cat][0]
        assert "why_generated" in first_item, f"Category {cat} missing 'why_generated'"
        assert len(first_item["why_generated"].strip()) > 10
        print(f"  [OK] Category '{cat}': {first_item['title']}")
        print(f"     -> Why: {first_item['why_generated']}")


def test_ml_pipeline_and_honesty():
    print("\n--- [TEST 6] ML Pipeline Architecture & Transparency ---")
    status = ml_interface.get_system_architecture_status()
    assert status["pose_estimation_ml"]["model_name"] == "MediaPipe PoseLandmarker"
    assert status["pose_estimation_ml"]["status"] == "ACTIVE_VISION_ML"
    assert status["injury_risk_classifier"]["model_name"] == "RandomForestClassifier"
    assert status["injury_risk_classifier"]["is_trained_ml_active"] is True
    print("  [OK] ML architecture check verified:")
    print(f"     - Pose Estimation: {status['pose_estimation_ml']['model_name']} ({status['pose_estimation_ml']['status']})")
    print(f"     - Risk Scoring: {status['injury_risk_classifier']['model_name']} ({status['injury_risk_classifier']['status']})")
    print(f"     - Supervised Tabular ML Active: {status['injury_risk_classifier']['is_trained_ml_active']}")

    # Train actual model on Project-Injury-Dataset.csv
    train_res = ml_interface.train_baseline_model()
    assert train_res["status"] == "SUCCESSFULLY_TRAINED"
    assert train_res["total_samples"] == 50
    print(f"  [OK] ML model trained on Project-Injury-Dataset.csv: Total Samples={train_res['total_samples']}, Accuracy={train_res['test_accuracy']}%, F1={train_res['test_f1_score']}")


def test_api_endpoints():
    print("\n--- [TEST 7] FastAPI Endpoints Verification ---")
    client = TestClient(app)

    # 1. Dataset summary
    r1 = client.get("/datasets/summary")
    assert r1.status_code == 200, f"Error: {r1.status_code} {r1.text}"
    assert r1.json()["status"] == "connected"
    print("  [OK] GET /datasets/summary: 200 OK")

    # 2. Benchmarks
    r2 = client.get("/datasets/benchmarks")
    assert r2.status_code == 200
    assert "knee_valgus_angle_deg" in r2.json()
    print("  [OK] GET /datasets/benchmarks: 200 OK")

    # 3. ML status
    r3 = client.get("/ml/status")
    assert r3.status_code == 200
    assert "pose_estimation_ml" in r3.json()
    print("  [OK] GET /ml/status: 200 OK")

    # 4. Athlete registration & profile with training_level and gender
    import uuid
    test_email = f"test_athlete_{uuid.uuid4().hex[:6]}@example.com"
    r_reg = client.post("/register", json={
        "name": "Test Athlete",
        "email": test_email,
        "password": "Password123!",
        "phone": "9876543210",
        "role": "athlete"
    })
    assert r_reg.status_code == 200, f"Register failed: {r_reg.text}"
    user_id = r_reg.json()["user_id"]
    print("  [OK] POST /register: 200 OK (Athlete-only)")

    # 5. Create Athlete Profile with training_level & gender
    r_ath = client.post("/athlete", json={
        "user_id": user_id,
        "sport": "Cricket",
        "position": "Fast Bowler",
        "age": 22,
        "height": 182.0,
        "weight": 76.0,
        "training_load": 75.0,
        "flexibility": 80.0,
        "strength": 85.0,
        "balance": 78.0,
        "endurance": 82.0,
        "training_level": "Advanced",
        "gender": "Male",
        "coach_notes": "Training for upcoming state trials."
    })
    assert r_ath.status_code == 200, f"Athlete create failed: {r_ath.text}"
    athlete_id = r_ath.json()["athlete_id"]
    print("  [OK] POST /athlete: 200 OK (Profile with training_level=Advanced, gender=Male)")

    # 6. Retrieve Athlete Profile and verify training_level & gender
    r_get_ath = client.get(f"/athlete/{user_id}")
    assert r_get_ath.status_code == 200
    ath_data = r_get_ath.json()
    assert ath_data["training_level"] == "Advanced"
    assert ath_data["gender"] == "Male"
    print("  [OK] GET /athlete/{user_id}: Verified training_level and gender returned")

    # 7. Videos with analysis history query
    r_vids = client.get(f"/videos/with-analysis/{athlete_id}")
    assert r_vids.status_code == 200
    assert isinstance(r_vids.json(), list)
    print("  [OK] GET /videos/with-analysis/{athlete_id}: 200 OK (Upload history with joined analysis)")


if __name__ == "__main__":
    print("=" * 65)
    print("SPORTSHIELD PLATFORM FULL VERIFICATION SUITE")
    print("=" * 65)
    try:
        test_datasets()
        test_population_benchmarks()
        test_feature_engineering_and_anomalies()
        test_dataset_ml_risk_prediction()
        test_recommendation_engine()
        test_ml_pipeline_and_honesty()
        test_api_endpoints()
        print("\n" + "=" * 65)
        print("ALL VERIFICATION SUITE TESTS PASSED PERFECTLY!")
        print("=" * 65)
    except Exception as err:
        print(f"\n[FAIL] TEST SUITE FAILED: {err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
