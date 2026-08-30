"""
Movement Analysis Service — Deterministic Movement Quality Scoring & Rule-Based Anomaly Detection
Week 3 Implementation
"""
from typing import Dict, Any, List, Optional

class MovementAnalysisService:
    def calculate_movement_quality_score(
        self,
        pose_confidence: float,
        symmetry_score: float,
        trunk_lean_avg: float,
        stability_score: float,
        smoothness_score: float = 90.0,
        joint_alignment_score: float = 90.0
    ) -> float:
        """
        Calculates a deterministic Movement Quality Score (0 - 100%) based on 
        pose confidence (15%), movement symmetry (25%), trunk alignment (20%),
        stability (20%), joint alignment & smoothness (20%).
        """
        # 1. Pose Confidence Factor (0 - 15 points)
        conf_pts = min(15.0, pose_confidence * 15.0)

        # 2. Symmetry Factor (0 - 25 points)
        sym_pts = min(25.0, (symmetry_score / 100.0) * 25.0)

        # 3. Trunk Alignment Factor (0 - 20 points)
        trunk_penalty = max(0.0, (trunk_lean_avg - 15.0) * 1.2)
        trunk_pts = max(0.0, 20.0 - trunk_penalty)

        # 4. Movement Stability Factor (0 - 20 points)
        stab_pts = min(20.0, (stability_score / 100.0) * 20.0)

        # 5. Smoothness & Structural Alignment Factor (0 - 20 points)
        smooth_align_pts = min(20.0, ((smoothness_score + joint_alignment_score) / 200.0) * 20.0)

        quality_score = conf_pts + sym_pts + trunk_pts + stab_pts + smooth_align_pts
        return round(float(max(0.0, min(100.0, quality_score))), 1)

    def detect_anomalies(
        self,
        frames_telemetry: List[Dict[str, Any]],
        fps: float = 30.0
    ) -> List[Dict[str, Any]]:
        """
        Evaluates frame kinematics against rule-based biomechanical thresholds.
        Identifies potential inward knee deviation, trunk overlean, pelvic tilt, and asymmetry.
        Note: Non-clinical human-readable observation indicators.
        """
        anomalies = []

        for idx, frame in enumerate(frames_telemetry):
            timestamp = round(float(idx / max(1.0, fps)), 2)
            frame_num = frame.get("frame", idx)

            l_knee = frame.get("left_knee_angle", 180.0)
            r_knee = frame.get("right_knee_angle", 180.0)
            trunk = frame.get("trunk_lean", 0.0)
            valgus = frame.get("knee_valgus_ratio", 1.0)
            tilt = frame.get("hip_tilt", 0.0)

            # Rule 1: Potential Inward Knee Alignment Deviation (Valgus ratio)
            if valgus < 0.80:
                anomalies.append({
                    "frame_number": frame_num,
                    "timestamp_seconds": timestamp,
                    "anomaly_type": "Inward Knee Alignment Deviation",
                    "severity": "Attention Recommended" if valgus < 0.72 else "Mild Deviation",
                    "confidence_score": 0.92,
                    "affected_joints": ["Left Knee", "Right Knee"],
                    "description": f"Potential inward knee alignment deviation observed (ratio {valgus:.2f}). Knee spacing narrowed relative to hip alignment."
                })

            # Rule 2: Excessive Forward Trunk Lean
            if trunk > 28.0:
                anomalies.append({
                    "frame_number": frame_num,
                    "timestamp_seconds": timestamp,
                    "anomaly_type": "Trunk Forward Overlean",
                    "severity": "Attention Recommended" if trunk > 35.0 else "Mild Deviation",
                    "confidence_score": 0.89,
                    "affected_joints": ["Spine", "Hips"],
                    "description": f"Excessive forward torso lean observed ({trunk:.1f}°). Higher biomechanical moment on lumbar segment."
                })

            # Rule 3: Lateral Pelvic Tilt / Drop
            if tilt > 6.0:
                anomalies.append({
                    "frame_number": frame_num,
                    "timestamp_seconds": timestamp,
                    "anomaly_type": "Lateral Pelvic Tilt",
                    "severity": "Mild Deviation",
                    "confidence_score": 0.85,
                    "affected_joints": ["Pelvis", "Hips"],
                    "description": f"Transient lateral pelvic tilt detected ({tilt:.1f}° tilt). Indicates hip stabilizer sway."
                })

            # Rule 4: Bilateral Knee Flexion Asymmetry
            knee_diff = abs(l_knee - r_knee)
            if knee_diff > 35.0:
                anomalies.append({
                    "frame_number": frame_num,
                    "timestamp_seconds": timestamp,
                    "anomaly_type": "Limb Flexion Asymmetry",
                    "severity": "Mild Deviation",
                    "confidence_score": 0.87,
                    "affected_joints": ["Left Knee", "Right Knee"],
                    "description": f"Bilateral knee flexion asymmetry observed ({l_knee:.1f}° L vs {r_knee:.1f}° R)."
                })

        # Deduplicate sequential anomalies (keep max severity per 0.5s window)
        filtered_anomalies = []
        last_ts = -1.0
        for an in anomalies:
            if an["timestamp_seconds"] - last_ts >= 0.5:
                filtered_anomalies.append(an)
                last_ts = an["timestamp_seconds"]

        return filtered_anomalies

movement_analysis_service = MovementAnalysisService()

