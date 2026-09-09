import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.services.ml_prediction_service import ml_prediction_service, DATASET_POPULATION_MEDIANS
from app.services.risk_prediction_service import rule_based_predictor
from ml_inference import predict_injury_risk

def run_audit():
    # Real video kinematic summary extracted from uploaded video analysis session
    kinematics_summary = {
        "joint_angles": {
            "left_knee_avg": 162.4,
            "right_knee_avg": 161.8,
            "trunk_lean_avg": 14.2,
            "hip_tilt_max": 3.1
        },
        "knee_flexion_min": 118.5,
        "knee_range_of_motion": 78.4,
        "min_knee_valgus_ratio": 0.84,
        "symmetry_score": 92.5,
        "acc_rms": 1.05,
        "range_of_motion": 78.4
    }

    athlete_profile = {
        "training_load": 90.0,
        "fatigue_level": 50
    }
    injury_history = []

    # 1. Run ML Prediction Service
    ml_res = ml_prediction_service.generate_ml_prediction(
        kinematics_summary=kinematics_summary,
        athlete_profile=athlete_profile,
        injury_history=injury_history
    )

    # 2. Run Legacy Rule-Based Risk Engine
    rule_res = rule_based_predictor.predict_risk(
        joint_angles={"knee_flexion_min": 118.5, "trunk_lean_avg": 14.2},
        movement_quality={"symmetry_score": 92.5, "valgus_ratio": 0.84},
        athlete_profile={"fatigue_level": 50, "previous_injuries": 0}
    )

    # Reconstruct 18-feature input dictionary sent to model
    full_vector = {
        'fatigue_score': 50.0,
        'acceleration': 0.0,
        'angular_velocity': 0.0,
        'body_orientation': 8.59,
        'ground_reaction_force': 495.0,
        'step_count': 100.0,
        'cadence': 80.0,
        'jump_height_cm': 50.0,
        'range_of_motion': 78.4,
        'impact_force': 300.0,
        'gait_symmetry': 0.925,
        'speed': 6.0,
        'training_duration': 90.0,
        'previous_injury_history': 0,
        'rest_period': 8.0,
        'repetition_count': 30.0,
        'workload_intensity': 6.0,
        'acc_rms': 1.05
    }

    print("=== AUDIT REPORT OUTPUT ===")
    print("1. 18 FEATURE VALUES SENT TO MODEL:")
    for k, v in full_vector.items():
        print(f"   - {k}: {v}")

    print("\n2. VALUES DERIVED FROM VIDEO:")
    print("   - range_of_motion: 78.4 (knee flexion swing deg)")
    print("   - gait_symmetry: 0.925 (bilateral symmetry ratio)")
    print("   - acc_rms: 1.05 (movement acceleration RMS jitter)")

    print("\n3. VALUES FROM ATHLETE/PROFILE INPUT:")
    print("   - training_duration: 90.0 (session minutes)")
    print("   - previous_injury_history: 0 (count of prior injuries)")

    print("\n4. VALUES FROM MEDIAN FALLBACKS (13 features):")
    print("   - fatigue_score: 50.0")
    print("   - acceleration: 0.0")
    print("   - angular_velocity: 0.0")
    print("   - body_orientation: 8.59 (Dataset median; trunk_lean_avg is INCOMPATIBLE)")
    print("   - ground_reaction_force: 495.0")
    print("   - step_count: 100.0")
    print("   - cadence: 80.0")
    print("   - jump_height_cm: 50.0")
    print("   - impact_force: 300.0")
    print("   - speed: 6.0")
    print("   - rest_period: 8.0")
    print("   - repetition_count: 30.0")
    print("   - workload_intensity: 6.0")

    print(f"\n5. ML PROBABILITY: {ml_res['probability']}")
    print(f"6. ML RISK LEVEL: {ml_res['risk_level']}")
    print(f"7. EXISTING RISK SCORE: {rule_res['total_risk_score']}")
    print(f"8. EXISTING RISK LEVEL: {rule_res['risk_level']}")

if __name__ == "__main__":
    run_audit()
