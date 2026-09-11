from typing import Dict, Any
from .geometry import calculate_angle_3pt, calculate_line_angle_horizontal, calculate_line_angle_vertical

def compute_all_joint_angles(keypoints: Dict[str, Dict[str, Any]]) -> Dict[str, float]:
    """
    Computes joint angles (in degrees) for left and right anatomical joints plus trunk/shoulder/hip alignments.
    Safely handles missing or low-confidence keypoints.
    """
    def get_pt(name: str):
        if name in keypoints:
            kp = keypoints[name]
            return (float(kp.get("x", 0.0)), float(kp.get("y", 0.0)))
        return (0.0, 0.0)

    # 1. Knees (hip -> knee -> ankle)
    left_knee = calculate_angle_3pt(get_pt("left_hip"), get_pt("left_knee"), get_pt("left_ankle"))
    right_knee = calculate_angle_3pt(get_pt("right_hip"), get_pt("right_knee"), get_pt("right_ankle"))

    # 2. Hips (shoulder -> hip -> knee)
    left_hip = calculate_angle_3pt(get_pt("left_shoulder"), get_pt("left_hip"), get_pt("left_knee"))
    right_hip = calculate_angle_3pt(get_pt("right_shoulder"), get_pt("right_hip"), get_pt("right_knee"))

    # 3. Ankles (knee -> ankle -> ankle_foot_offset)
    # Virtual foot point extending horizontally forward relative to ankle
    l_ankle_pt, r_ankle_pt = get_pt("left_ankle"), get_pt("right_ankle")
    l_foot_pt = (l_ankle_pt[0] + 20.0, l_ankle_pt[1])
    r_foot_pt = (r_ankle_pt[0] + 20.0, r_ankle_pt[1])

    left_ankle = calculate_angle_3pt(get_pt("left_knee"), l_ankle_pt, l_foot_pt)
    right_ankle = calculate_angle_3pt(get_pt("right_knee"), r_ankle_pt, r_foot_pt)

    # 4. Elbows (shoulder -> elbow -> wrist)
    left_elbow = calculate_angle_3pt(get_pt("left_shoulder"), get_pt("left_elbow"), get_pt("left_wrist"))
    right_elbow = calculate_angle_3pt(get_pt("right_shoulder"), get_pt("right_elbow"), get_pt("right_wrist"))

    # 5. Shoulders (elbow -> shoulder -> hip)
    left_shoulder = calculate_angle_3pt(get_pt("left_elbow"), get_pt("left_shoulder"), get_pt("left_hip"))
    right_shoulder = calculate_angle_3pt(get_pt("right_elbow"), get_pt("right_shoulder"), get_pt("right_hip"))

    # 6. Alignments & Trunk Lean
    l_sh, r_sh = get_pt("left_shoulder"), get_pt("right_shoulder")
    l_hip, r_hip = get_pt("left_hip"), get_pt("right_hip")

    mid_shoulder = ((l_sh[0] + r_sh[0]) / 2.0, (l_sh[1] + r_sh[1]) / 2.0)
    mid_hip = ((l_hip[0] + r_hip[0]) / 2.0, (l_hip[1] + r_hip[1]) / 2.0)

    trunk_lean = calculate_line_angle_vertical(mid_hip, mid_shoulder)
    shoulder_alignment = calculate_line_angle_horizontal(l_sh, r_sh)
    hip_alignment = calculate_line_angle_horizontal(l_hip, r_hip)

    return {
        "left_knee_angle": round(left_knee, 1),
        "right_knee_angle": round(right_knee, 1),
        "left_hip_angle": round(left_hip, 1),
        "right_hip_angle": round(right_hip, 1),
        "left_ankle_angle": round(left_ankle, 1),
        "right_ankle_angle": round(right_ankle, 1),
        "left_elbow_angle": round(left_elbow, 1),
        "right_elbow_angle": round(right_elbow, 1),
        "left_shoulder_angle": round(left_shoulder, 1),
        "right_shoulder_angle": round(right_shoulder, 1),
        "trunk_lean_angle": round(trunk_lean, 1),
        "shoulder_alignment_angle": round(shoulder_alignment, 1),
        "hip_alignment_angle": round(hip_alignment, 1)
    }
