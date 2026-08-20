from typing import Dict, Any, List
import numpy as np

def detect_movement_anomalies(
    assessment_data: Dict[str, Any],
    fps: float = 30.0
) -> List[Dict[str, Any]]:
    """
    Analyzes biomechanical frame timeline to detect movement anomalies,
    including knee valgus collapse, trunk overlean, lateral pelvic tilt/drop,
    and asymmetric range of motion dips.
    Returns a list of detected anomaly objects with timestamp ranges, severity, and confidence.
    """
    frames_timeline = assessment_data.get("frames_timeline", [])
    if not frames_timeline:
        return []

    anomalies = []
    
    # 1. Detect Knee Valgus Collapse (Ratio < 0.85)
    valgus_frames = []
    for f in frames_timeline:
        ratio = f.get("knee_valgus_ratio", 1.0)
        if ratio < 0.85:
            valgus_frames.append((f.get("frame", 0), ratio))

    if valgus_frames:
        start_frame = valgus_frames[0][0]
        end_frame = valgus_frames[-1][0]
        min_ratio = min([v[1] for v in valgus_frames])
        
        severity = "Critical" if min_ratio < 0.70 else "High" if min_ratio < 0.80 else "Moderate"
        confidence = round(float(0.85 + (0.85 - min_ratio) * 0.5), 2)
        confidence = min(confidence, 0.98)

        anomalies.append({
            "timestamp_start": round(start_frame / fps, 2),
            "timestamp_end": round(end_frame / fps, 2),
            "issue_type": "Knee Valgus Collapse",
            "severity": severity,
            "confidence": confidence,
            "affected_joints": "Bilateral Knee Joints, Quadriceps",
            "description": f"Inward collapse of the knee joints detected (minimum ratio {min_ratio:.2f}). High risk factor for ACL and MCL strain."
        })

    # 2. Detect Excessive Forward Trunk Lean (Lean > 20 degrees)
    lean_frames = []
    for f in frames_timeline:
        lean = f.get("trunk_lean", 0.0)
        if lean > 20.0:
            lean_frames.append((f.get("frame", 0), lean))

    if lean_frames:
        start_frame = lean_frames[0][0]
        end_frame = lean_frames[-1][0]
        max_lean = max([l[1] for l in lean_frames])

        severity = "High" if max_lean > 30.0 else "Moderate"
        confidence = round(float(0.88 + (max_lean - 20.0) * 0.005), 2)
        confidence = min(confidence, 0.96)

        anomalies.append({
            "timestamp_start": round(start_frame / fps, 2),
            "timestamp_end": round(end_frame / fps, 2),
            "issue_type": "Excessive Trunk Overlean",
            "severity": severity,
            "confidence": confidence,
            "affected_joints": "Lumbar Spine, Thoracic Spine, Hip Joint",
            "description": f"Forward trunk lean reached {max_lean:.1f} degrees, indicating weak core stabilizers or poor hip hinge mechanics."
        })

    # 3. Detect Lateral Pelvic Drop / Hip Tilt (Tilt > 5.0 degrees)
    tilt_frames = []
    for f in frames_timeline:
        tilt = f.get("hip_tilt", 0.0)
        if tilt > 5.0:
            tilt_frames.append((f.get("frame", 0), tilt))

    if tilt_frames:
        start_frame = tilt_frames[0][0]
        end_frame = tilt_frames[-1][0]
        max_tilt = max([t[1] for t in tilt_frames])

        severity = "High" if max_tilt > 8.0 else "Moderate"

        anomalies.append({
            "timestamp_start": round(start_frame / fps, 2),
            "timestamp_end": round(end_frame / fps, 2),
            "issue_type": "Lateral Pelvic Drop",
            "severity": severity,
            "confidence": 0.89,
            "affected_joints": "Pelvis, Gluteus Medius, Left/Right Hips",
            "description": f"Asymmetric pelvic tilt reached {max_tilt:.1f} degrees (Trendelenburg sign proxy), pointing to hip abductor weakness."
        })

    # 4. Asymmetry anomaly check
    symmetry_score = assessment_data.get("symmetry_score", 100.0)
    if symmetry_score < 85.0:
        anomalies.append({
            "timestamp_start": 0.0,
            "timestamp_end": round(len(frames_timeline) / fps, 2),
            "issue_type": "Limb Movement Asymmetry",
            "severity": "High" if symmetry_score < 75.0 else "Moderate",
            "confidence": 0.91,
            "affected_joints": "Left vs Right Lower Extremities",
            "description": f"Overall movement symmetry score dropped to {symmetry_score:.1f}%, reflecting unbalanced weight distribution or unilateral compensation."
        })

    return anomalies
