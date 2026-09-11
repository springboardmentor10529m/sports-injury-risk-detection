from typing import Dict, Any

def compute_symmetry_metrics(angles: Dict[str, float]) -> Dict[str, float]:
    """
    Computes Left/Right absolute angle deltas and symmetry indicators.
    0.0 represents perfect bilateral symmetry.
    """
    knee_delta = abs(angles.get("left_knee_angle", 0.0) - angles.get("right_knee_angle", 0.0))
    hip_delta = abs(angles.get("left_hip_angle", 0.0) - angles.get("right_hip_angle", 0.0))
    ankle_delta = abs(angles.get("left_ankle_angle", 0.0) - angles.get("right_ankle_angle", 0.0))
    elbow_delta = abs(angles.get("left_elbow_angle", 0.0) - angles.get("right_elbow_angle", 0.0))
    shoulder_delta = abs(angles.get("left_shoulder_angle", 0.0) - angles.get("right_shoulder_angle", 0.0))

    # Overall overall asymmetry score (mean delta across lower limbs)
    lower_limb_asymmetry = (knee_delta + hip_delta + ankle_delta) / 3.0

    return {
        "knee_asymmetry_deg": round(knee_delta, 1),
        "hip_asymmetry_deg": round(hip_delta, 1),
        "ankle_asymmetry_deg": round(ankle_delta, 1),
        "elbow_asymmetry_deg": round(elbow_delta, 1),
        "shoulder_asymmetry_deg": round(shoulder_delta, 1),
        "lower_limb_asymmetry_index": round(lower_limb_asymmetry, 2)
    }
