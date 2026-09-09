"""
Movement Anomaly Detection Service.
Interprets frame timelines and joint angle calculations to identify acute biomechanical anomalies
(valgus collapse, trunk overlean, pelvic drop, limb movement asymmetry).
"""
from typing import Dict, Any, List
# pyrefly: ignore [missing-import]
from app.anomaly_engine import detect_movement_anomalies

class MovementAnomalyService:
    def detect_anomalies(self, kinematics: Dict[str, Any], fps: float = 30.0) -> List[Dict[str, Any]]:
        """
        Identifies acute biomechanical anomalies across video frames.
        """
        anomalies = detect_movement_anomalies(kinematics, fps=fps)
        
        # If no anomalies returned from timeline, construct basic check from summary metrics
        if not anomalies:
            knee_valgus = float(kinematics.get("knee_valgus", 1.0) or 1.0)
            trunk_lean = float(kinematics.get("trunk_lean", 0.0) or 0.0)
            hip_stability = float(kinematics.get("hip_stability", 0.0) or 0.0)

            if knee_valgus < 0.85:
                anomalies.append({
                    "timestamp_start": 0.4,
                    "timestamp_end": 0.9,
                    "issue_type": "Knee Valgus Collapse",
                    "severity": "High" if knee_valgus < 0.75 else "Moderate",
                    "confidence": 0.88,
                    "affected_joints": "Bilateral Knee Joints",
                    "description": f"Inward knee displacement detected during deep flexion phase (Ratio: {knee_valgus:.2f})."
                })

            if trunk_lean > 20.0:
                anomalies.append({
                    "timestamp_start": 0.2,
                    "timestamp_end": 0.7,
                    "issue_type": "Excessive Trunk Overlean",
                    "severity": "High" if trunk_lean > 30.0 else "Moderate",
                    "confidence": 0.90,
                    "affected_joints": "Lumbar Spine & Hip Hinge",
                    "description": f"Forward trunk inclination reached {trunk_lean:.1f} degrees during load transition."
                })

            if hip_stability > 5.0:
                anomalies.append({
                    "timestamp_start": 0.3,
                    "timestamp_end": 0.8,
                    "issue_type": "Lateral Pelvic Drop",
                    "severity": "Moderate",
                    "confidence": 0.85,
                    "affected_joints": "Pelvis & Gluteus Medius",
                    "description": f"Lateral pelvic tilt measured at {hip_stability:.1f} degrees."
                })

        return anomalies

movement_anomaly_service = MovementAnomalyService()
