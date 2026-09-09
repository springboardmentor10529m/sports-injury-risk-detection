import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.services.ml_prediction_service import ml_prediction_service
from app.services.risk_prediction_service import rule_based_predictor
from train_sports_injury_model import VideoKinematicExtractor

def test_run_real_video_e2e_audit():
    video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "raw", "2e39eaff-bbfe-4172-ae84-539446b57fe0_raw.mp4"))
    
    print(f"\n--- PROCESSING REAL UPLOADED VIDEO: {os.path.basename(video_path)} ---")
    extractor = VideoKinematicExtractor()
    kinematics = extractor.extract_video_kinematics(video_path)
    
    print("\nEXTRACTED VIDEO KINEMATICS:")
    for k, v in kinematics.items():
        print(f"  {k}: {v}")

    # Mock athlete profile input & injury history for test session
    athlete_profile = {
        "training_load": 105.0,  # training_duration in min
    }
    injury_history = [{"injury_type": "Ankle Sprain"}]

    # Generate ML prediction
    ml_res = ml_prediction_service.generate_ml_prediction(
        kinematics_summary=kinematics,
        athlete_profile=athlete_profile,
        injury_history=injury_history
    )

    # Legacy Rule-based Prediction
    rule_res = rule_based_predictor.predict_risk(
        joint_angles={"knee_flexion_min": kinematics["knee_flexion_min"], "trunk_lean_avg": kinematics["trunk_lean_avg"]},
        movement_quality={"symmetry_score": kinematics["gait_symmetry"] * 100.0, "valgus_ratio": kinematics["min_knee_valgus_ratio"]},
        athlete_profile={"fatigue_level": 50, "previous_injuries": len(injury_history)}
    )

    # Reconstruct exact 18 feature vector sent to ML model
    # Connected features
    connected = ml_res["connected_features"]
    fallbacks = ml_res["baseline_fallback_features"]

    print("\n=== E2E INFERENCE AUDIT REPORT ===")
    print("ML Available:", ml_res["available"])
    print("ML Probability:", ml_res["probability"])
    print("ML Risk Score (%):", ml_res["score"])
    print("ML Risk Level:", ml_res["risk_level"])
    print("Existing Rule-Based Score:", rule_res["total_risk_score"])
    print("Existing Rule-Based Level:", rule_res["risk_level"])

    print("\nConnected Features:", connected)
    print("Fallback Baseline Features:", fallbacks)

if __name__ == "__main__":
    test_run_real_video_e2e_audit()
