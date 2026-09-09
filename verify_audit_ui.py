import sys
import os
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Video, AnalysisResult, MovementAnomaly, Athlete
from app.services.movement_analysis_service import movement_analysis_service
from app.services.risk_assessment_service import risk_assessment_service

db = SessionLocal()

print("--- 1. Testing Movement Analysis Anomaly Detection ---")
dummy_telemetry = [
    {"frame": 0, "timestamp_seconds": 0.0, "left_knee_angle": 170.0, "right_knee_angle": 170.0, "trunk_lean": 10.0, "knee_valgus_ratio": 0.95, "hip_tilt": 2.0},
    {"frame": 15, "timestamp_seconds": 0.5, "left_knee_angle": 120.0, "right_knee_angle": 165.0, "trunk_lean": 32.0, "knee_valgus_ratio": 0.70, "hip_tilt": 7.5}, # triggers Rules 1, 2, 3, 4
    {"frame": 30, "timestamp_seconds": 1.0, "left_knee_angle": 175.0, "right_knee_angle": 175.0, "trunk_lean": 12.0, "knee_valgus_ratio": 0.92, "hip_tilt": 1.0},
]

anomalies = movement_analysis_service.detect_anomalies(dummy_telemetry, fps=30.0)
print(f"Detected Anomalies Count: {len(anomalies)}")
for a in anomalies:
    print(f"  - Frame: {a.get('frame_number')}, Timestamp: {a.get('timestamp_seconds')}s, Type: {a.get('anomaly_type')}, Confidence: {a.get('confidence_score')}, Severity: {a.get('severity')}")

print("\n--- 2. Testing Risk Explanation & Contributing Factors ---")
eval_result = risk_assessment_service.evaluate_movement_risk(
    kinematics={
        "knee_valgus": 0.72, # Below 0.85 -> triggers Knee Valgus Collapse factor
        "hip_stability": 8.0, # Above 5.0 -> triggers Pelvic Drop factor
        "trunk_lean": 32.0, # Above 20.0 -> triggers Excessive Trunk Lean factor
        "joint_alignment": 80.0,
        "symmetry_score": 75.0, # Below 90.0 -> triggers Limb Asymmetry factor
        "fatigue_score": 4.0,
        "movement_quality": 60.0
    },
    athlete_profile={"sport": "Soccer", "position": "Forward", "age": 22, "height": 180, "weight": 75, "training_load": 16.0},
    injury_history=[{"injury_type": "ACL Strain", "body_part": "Knee", "severity": "High", "injury_date": "2025-01-01"}]
)

contributing = eval_result["explanations"]["contributing_factors"]
print(f"Contributing Factors Count: {len(contributing)}")
for cf in contributing:
    print(f"  - Factor: '{cf.get('factor')}', Impact: '{cf.get('impact')}', Detail: '{cf.get('detail')}'")

print("\n--- 3. Testing Database Saved Anomalies ---")
video = db.query(Video).filter(Video.processing_status == "completed").first()
if video:
    anomalies_db = db.query(MovementAnomaly).filter(MovementAnomaly.video_id == video.video_id).all()
    print(f"DB Anomalies for video {video.video_id}: {len(anomalies_db)}")
    for a in anomalies_db:
        fps = video.fps or 30
        calculated_frame = getattr(a, "frame_number", int(round(float(a.timestamp_start or 0.0) * fps)))
        print(f"  - Frame: {calculated_frame}, Timestamp: {a.timestamp_start}s, Issue: {a.issue_type}, Severity: {a.severity}, Confidence: {a.confidence}")
else:
    print("No completed video found in DB for query test.")

print("\nVerification Test Completed Successfully.")
