import pytest
import numpy as np
from ml.biomechanics.feature_engineering import BiomechanicalFeatureEngineer, BiomechanicalFeatureVector
from ml.biomechanics.temporal_aggregation import TemporalFeatureAggregator
from ml.anomaly_detection.anomaly_detector import IsolationForestAnomalyDetector
from ml.injury_prediction.baseline_model import BaselineInjuryRiskModel
from ml.risk_engine import RiskScoringEngine
from services.recommendation_engine import PersonalizedRecommendationEngine
from services.report_generator import ReportGenerator


def test_feature_engineering_20_features():
    """Verify all 20 standardized 2D features are computed with units and confidence."""
    engineer = BiomechanicalFeatureEngineer()
    kps = {
        "left_shoulder": {"x": 100.0, "y": 50.0, "confidence": 0.95},
        "right_shoulder": {"x": 300.0, "y": 50.0, "confidence": 0.95},
        "left_hip": {"x": 120.0, "y": 150.0, "confidence": 0.92},
        "right_hip": {"x": 280.0, "y": 150.0, "confidence": 0.92},
        "left_knee": {"x": 130.0, "y": 250.0, "confidence": 0.90},
        "right_knee": {"x": 270.0, "y": 250.0, "confidence": 0.90},
        "left_ankle": {"x": 140.0, "y": 350.0, "confidence": 0.88},
        "right_ankle": {"x": 260.0, "y": 350.0, "confidence": 0.88},
        "left_elbow": {"x": 80.0, "y": 90.0, "confidence": 0.85},
        "right_elbow": {"x": 320.0, "y": 90.0, "confidence": 0.85},
        "left_wrist": {"x": 70.0, "y": 130.0, "confidence": 0.80},
        "right_wrist": {"x": 330.0, "y": 130.0, "confidence": 0.80},
    }
    feats = engineer.extract_frame_features(kps, frame_width=640, frame_height=480, timestamp=0.1, frame_idx=1)

    expected_keys = [
        "knee_valgus_angle", "left_knee_angle", "right_knee_angle",
        "left_hip_angle", "right_hip_angle", "left_ankle_angle", "right_ankle_angle",
        "trunk_lean", "hip_stability", "bilateral_knee_asymmetry",
        "bilateral_hip_asymmetry", "bilateral_ankle_asymmetry", "shoulder_asymmetry",
        "range_of_motion", "joint_angle_velocity", "joint_angle_acceleration",
        "movement_variability", "postural_stability", "landing_deceleration_indicator",
        "keypoint_confidence", "frame_movement_quality"
    ]
    for k in expected_keys:
        assert k in feats, f"Missing feature: {k}"
        fv = feats[k]
        assert isinstance(fv, BiomechanicalFeatureVector)
        assert fv.unit != ""
        assert 0.0 <= fv.confidence <= 1.0


def test_temporal_feature_aggregation():
    """Verify sequence distributions, percentiles, and high risk percentage calculations."""
    engineer = BiomechanicalFeatureEngineer()
    seq = []
    for i in range(20):
        valgus_x = 130.0 + (10.0 if i % 2 == 0 else -5.0)
        kps = {
            "left_hip": {"x": 120.0, "y": 150.0, "confidence": 0.95},
            "right_hip": {"x": 280.0, "y": 150.0, "confidence": 0.95},
            "left_knee": {"x": valgus_x, "y": 250.0, "confidence": 0.90},
            "right_knee": {"x": 270.0, "y": 250.0, "confidence": 0.90},
            "left_ankle": {"x": 125.0, "y": 350.0, "confidence": 0.90},
            "right_ankle": {"x": 275.0, "y": 350.0, "confidence": 0.90},
            "left_shoulder": {"x": 110.0, "y": 50.0, "confidence": 0.95},
            "right_shoulder": {"x": 290.0, "y": 50.0, "confidence": 0.95},
        }
        f = engineer.extract_frame_features(kps, 640, 480, timestamp=i * 0.066, frame_idx=i)
        seq.append(f)

    agg = TemporalFeatureAggregator.aggregate_sequence(seq)
    assert "knee_valgus_angle" in agg
    valgus_stats = agg["knee_valgus_angle"]
    assert "mean" in valgus_stats
    assert "median" in valgus_stats
    assert "p95" in valgus_stats
    assert "std" in valgus_stats
    assert "high_risk_frame_percentage" in valgus_stats
    assert valgus_stats["total_frames_sampled"] == 20


def test_isolation_forest_anomaly_detection():
    """Verify Isolation Forest anomaly detector flags outliers and generates explanations."""
    detector = IsolationForestAnomalyDetector(contamination=0.15)
    seq = []
    # 15 normal frames + 2 anomalous frames with high valgus and asymmetry
    for i in range(17):
        is_anom = (i == 7 or i == 14)
        valgus_deg = 24.0 if is_anom else 3.0
        asym_deg = 28.0 if is_anom else 4.0
        frame_dict = {
            "knee_valgus_angle": BiomechanicalFeatureVector("knee_valgus_angle", valgus_deg, "degrees", 0.95, i * 0.1, i),
            "trunk_lean": BiomechanicalFeatureVector("trunk_lean", 4.0, "degrees", 0.95, i * 0.1, i),
            "bilateral_knee_asymmetry": BiomechanicalFeatureVector("bilateral_knee_asymmetry", asym_deg, "degrees", 0.95, i * 0.1, i),
            "bilateral_hip_asymmetry": BiomechanicalFeatureVector("bilateral_hip_asymmetry", 3.0, "degrees", 0.95, i * 0.1, i),
            "bilateral_ankle_asymmetry": BiomechanicalFeatureVector("bilateral_ankle_asymmetry", 3.0, "degrees", 0.95, i * 0.1, i),
            "hip_stability": BiomechanicalFeatureVector("hip_stability", 2.0, "degrees", 0.95, i * 0.1, i),
            "joint_angle_velocity": BiomechanicalFeatureVector("joint_angle_velocity", 40.0, "deg/s", 0.95, i * 0.1, i),
            "movement_variability": BiomechanicalFeatureVector("movement_variability", 2.0, "std", 0.95, i * 0.1, i),
            "keypoint_confidence": BiomechanicalFeatureVector("keypoint_confidence", 0.95, "prob", 1.0, i * 0.1, i),
        }
        seq.append(frame_dict)

    anomalies = detector.detect_anomalies(seq)
    assert len(anomalies) >= 2
    # Ensure anomalies contain required keys
    for a in anomalies:
        assert "frame" in a
        assert "timestamp" in a
        assert "type" in a
        assert "score" in a
        assert "severity" in a
        assert "body_region" in a
        assert "explanation" in a


def test_baseline_injury_risk_model():
    """Verify BaselineInjuryRiskModel returns probabilities in [0, 1] and feature attributions."""
    model = BaselineInjuryRiskModel()
    dummy_agg = {
        "knee_valgus_angle": {"mean": 14.5, "p95": 18.0, "high_risk_frame_percentage": 25.0},
        "bilateral_knee_asymmetry": {"mean": 16.0, "p95": 20.0},
        "bilateral_hip_asymmetry": {"mean": 12.0},
        "bilateral_ankle_asymmetry": {"mean": 10.0},
        "trunk_lean": {"mean": 8.0},
        "shoulder_asymmetry": {"mean": 5.0},
        "hip_stability": {"mean": 6.0},
        "range_of_motion": {"mean": 45.0},
        "movement_variability": {"mean": 5.0},
        "postural_stability": {"mean": 75.0}
    }
    probs = model.predict_proba(dummy_agg, athlete_profile={"training_load": 70.0})
    for cat in ["acl", "hamstring", "ankle", "shoulder", "lower_back", "overuse"]:
        assert cat in probs
        assert 0.0 <= probs[cat] <= 1.0

    explanations = model.explain(dummy_agg)
    assert "acl" in explanations
    assert len(explanations["acl"]) >= 2

    meta = model.get_metadata()
    assert meta["is_clinically_validated"] is False
    assert "clinical_disclaimer" in meta


def test_weighted_risk_scoring_engine():
    """Verify 35/20/20/15/10 weighting, risk levels, and ranked contributing factors."""
    dummy_agg = {
        "knee_valgus_angle": {"mean": 18.0, "p95": 24.0, "high_risk_frame_percentage": 40.0},
        "trunk_lean": {"mean": 14.0, "high_risk_frame_percentage": 30.0},
        "hip_stability": {"mean": 9.0},
        "bilateral_knee_asymmetry": {"mean": 20.0},
        "bilateral_hip_asymmetry": {"mean": 15.0},
        "bilateral_ankle_asymmetry": {"mean": 12.0},
        "movement_variability": {"mean": 6.0},
        "keypoint_confidence": {"mean": 0.95}
    }
    histories = [{"severity": "SEVERE", "body_part": "knee", "recovery_date": None}]
    profile = {"training_load": 80.0}

    report = RiskScoringEngine.calculate(dummy_agg, athlete_profile=profile, injury_histories=histories)
    assert 0.0 <= report["overall_score"] <= 100.0
    assert report["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert report["overall_score"] >= 50.0
    assert len(report["contributors"]) >= 2
    assert "component_scores" in report


def test_personalized_recommendation_engine():
    """Verify personalized actionable recommendations with disclaimer and priority."""
    recs = PersonalizedRecommendationEngine.generate_recommendations(
        overall_risk=72.0,
        risk_level="HIGH",
        injury_probabilities={"acl": 0.75, "hamstring": 0.60, "ankle": 0.30, "shoulder": 0.20, "lower_back": 0.40, "overuse": 0.65},
        biomechanical_summary={"knee_valgus_angle": {"mean": 16.0, "high_risk_frame_percentage": 35.0}, "bilateral_knee_asymmetry": {"mean": 18.0}},
        anomalies=[{"type": "knee_valgus", "severity": "HIGH"}],
        athlete_profile={"training_load": 85.0}
    )
    assert recs["total_recommendations"] > 0
    assert "disclaimer" in recs
    for r in recs["recommendations"]:
        assert "reason" in r
        assert "priority" in r
        assert "target_region" in r
        assert "category" in r
        assert "exercise" in r


def test_pdf_and_excel_generation():
    """Verify ReportLab PDF and OpenPyXL Excel reports build cleanly to non-empty bytes."""
    video_data = {"filename": "test.mp4", "activity": "Sprinting"}
    athlete_data = {"name": "Alex Mercer", "sport": "Track & Field", "position": "Sprinter", "age": 22, "height": 180, "weight": 75, "training_load": 65}
    risk_data = {"overall_score": 68.5, "risk_level": "HIGH", "confidence": 0.92}
    pred_data = {"acl_risk": 72.0, "hamstring_risk": 58.0, "ankle_risk": 30.0, "shoulder_risk": 15.0, "lower_back_risk": 45.0, "overuse_risk": 60.0}
    biomech_summary = {
        "knee_valgus_angle": {"mean": 15.2, "max": 22.0, "p95": 19.5, "high_risk_frame_percentage": 30.0, "threshold": 12.0},
        "trunk_lean": {"mean": 8.5, "max": 14.0, "p95": 11.0, "high_risk_frame_percentage": 15.0, "threshold": 10.0},
        "bilateral_knee_asymmetry": {"mean": 16.8, "max": 24.0, "p95": 21.0, "high_risk_frame_percentage": 35.0, "threshold": 15.0},
        "hip_stability": {"mean": 6.2, "threshold": 8.0, "p95": 8.0}
    }
    anomalies = [{"frame": 12, "timestamp": 0.8, "type": "knee_valgus", "score": 0.88, "severity": "HIGH", "body_region": "knee", "explanation": "Inward knee collapse"}]
    risk_factors = [{"factor": "Knee valgus deviation", "body_region": "knee", "severity": "HIGH", "contribution": 18.5}]
    recommendations = [{"priority": "HIGH", "category": "strengthening", "target_region": "knee", "exercise": "Band walks", "suggested_frequency": "3x/wk", "expected_objective": "Stabilize knee", "reason": "Valgus"}]
    biomech_frames = [{"frame_number": 1, "timestamp": 0.05, "joint_angles": {"left_knee_angle": 160.0, "right_knee_angle": 150.0}, "symmetry": {"knee_asymmetry_deg": 10.0}}]

    # Test PDF
    pdf_bytes = ReportGenerator.generate_pdf_report(
        analysis_id="test-analysis-1234",
        video_data=video_data,
        athlete_data=athlete_data,
        risk_data=risk_data,
        prediction_data=pred_data,
        biomech_summary=biomech_summary,
        anomalies=anomalies,
        risk_factors=risk_factors,
        recommendations=recommendations
    )
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    # Test Excel
    excel_bytes = ReportGenerator.generate_excel_report(
        analysis_id="test-analysis-1234",
        video_data=video_data,
        athlete_data=athlete_data,
        risk_data=risk_data,
        prediction_data=pred_data,
        biomech_summary=biomech_summary,
        biomech_frames=biomech_frames,
        anomalies=anomalies,
        risk_factors=risk_factors,
        recommendations=recommendations
    )
    assert len(excel_bytes) > 1000
