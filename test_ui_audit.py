import sys
import os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.services.movement_analysis_service import movement_analysis_service
from app.services.explanation_service import risk_explanation_service

print("=== 1. MOVEMENT ANOMALY DETECTION TEST ===")
telemetry = [
    {"frame": 0, "timestamp_seconds": 0.0, "left_knee_angle": 170.0, "right_knee_angle": 170.0, "trunk_lean": 10.0, "knee_valgus_ratio": 0.95, "hip_tilt": 2.0},
    {"frame": 15, "timestamp_seconds": 0.5, "left_knee_angle": 120.0, "right_knee_angle": 165.0, "trunk_lean": 32.0, "knee_valgus_ratio": 0.70, "hip_tilt": 7.5},
]

anomalies = movement_analysis_service.detect_anomalies(telemetry, fps=30.0)
print(f"Total Anomalies Flagged: {len(anomalies)}")
for idx, a in enumerate(anomalies, 1):
    frame_num = a.get("frame_number")
    ts = a.get("timestamp_seconds")
    conf = a.get("confidence_score")
    conf_str = f"{int(conf * 100)}%" if conf else "Not available"
    print(f"Anomaly #{idx}: Frame={frame_num}, Timestamp={ts}s, Confidence={conf_str}, Type='{a.get('anomaly_type')}', Severity='{a.get('severity')}'")

print("\n=== 2. CONTRIBUTING RISK FACTORS TEST ===")
exp_result = risk_explanation_service.generate_explanations(
    risk_results={"overall_risk_score": 58.5, "risk_category": "High"},
    feature_vector={
        "knee_valgus": 0.72,
        "trunk_lean_deg": 32.0,
        "hip_stability_deg": 8.0,
        "symmetry_score": 75.0,
        "training_load_hrs": 16.0,
        "injury_history": {"has_knee_acl_history": True, "has_hamstring_history": False}
    },
    anomalies=anomalies
)

factors = exp_result.get("contributing_factors", [])
print(f"Total Contributing Factors Displayed: {len(factors)}")
for idx, f in enumerate(factors, 1):
    print(f"  Factor #{idx}: '{f.get('factor')}' | Impact: '{f.get('impact')}' | Detail: '{f.get('detail')}'")

print("\n=== VERIFICATION COMPLETE ===")
