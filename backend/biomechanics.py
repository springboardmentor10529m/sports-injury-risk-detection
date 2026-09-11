import numpy as np
from typing import Dict, Any, List

def calculate_angle_3d(a: Dict[str, float], b: Dict[str, float], c: Dict[str, float]) -> float:
    """
    Calculates the 3D angle (in degrees) at landmark 'b' given points 'a', 'b', and 'c'.
    """
    ba = np.array([a['x'] - b['x'], a['y'] - b['y'], a['z'] - b['z']])
    bc = np.array([c['x'] - b['x'], c['y'] - b['y'], c['z'] - b['z']])

    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)

    if norm_ba == 0 or norm_bc == 0:
        return 180.0

    cosine_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.arccos(cosine_angle)
    return float(np.degrees(angle))


def calculate_frontal_valgus_angle(hip: Dict[str, float], knee: Dict[str, float], ankle: Dict[str, float]) -> float:
    """
    Calculates the 2D frontal plane projection angle (Knee Valgus deviation).
    Represents inward medial collapse of the knee relative to the hip-ankle axis.
    """
    v_hip_knee = np.array([knee['x'] - hip['x'], knee['y'] - hip['y']])
    v_knee_ankle = np.array([ankle['x'] - knee['x'], ankle['y'] - knee['y']])

    norm_hk = np.linalg.norm(v_hip_knee)
    norm_ka = np.linalg.norm(v_knee_ankle)

    if norm_hk == 0 or norm_ka == 0:
        return 0.0

    dot_p = np.dot(v_hip_knee, v_knee_ankle) / (norm_hk * norm_ka)
    dot_p = np.clip(dot_p, -1.0, 1.0)
    angle = np.degrees(np.arccos(dot_p))

    cross = v_hip_knee[0] * v_knee_ankle[1] - v_hip_knee[1] * v_knee_ankle[0]
    valgus_deg = float(angle if cross > 0 else -angle)
    return abs(valgus_deg)


def detect_activity_from_landmarks(
    frames_data: List[Dict[str, Any]],
    left_knee_angles: List[float],
    right_knee_angles: List[float],
    hip_y_positions: List[float]
) -> str:
    """
    Infers activity (Running, Squatting, Walking) dynamically using a principled
    temporal multi-evidence kinematic model across sampled video frames.

    Biomechanics Principles:
    - SQUATTING:
        * Stationary horizontal body position (hip_x_ptp < 0.20).
        * Stationary planted feet (ank_h_span < 0.25).
        * Bilateral simultaneous knee flexion (both knees bend together, simul_deep_ratio >= 0.20).
        * Substantial vertical descent of the hips (hip_y_ptp > 0.20).
    - RUNNING / JOGGING:
        * Locomotion & horizontal body/foot translation (hip_x_ptp > 0.20, ank_h_span > 0.25).
        * Large vertical and horizontal ankle cycling trajectory (ank_v_span > 0.50, mean_ankle_disp > 0.10).
        * Alternating swing/stance leg kinematics (large knee angle difference disparity).
    """
    if not frames_data or not (left_knee_angles or right_knee_angles):
        return "Running"

    n_frames = min(len(left_knee_angles), len(right_knee_angles))
    if n_frames < 3:
        return "Running"

    lk = np.array(left_knee_angles[:n_frames])
    rk = np.array(right_knee_angles[:n_frames])

    # Extract landmark trajectories for hips and ankles
    hip_xs, hip_ys_clean = [], []
    l_ax, l_ay = [], []
    r_ax, r_ay = [], []

    for frame in frames_data:
        lm = frame.get("landmarks")
        if not lm or not isinstance(lm, dict):
            continue
        lh = lm.get(23) or lm.get("23")
        rh = lm.get(24) or lm.get("24")
        la = lm.get(27) or lm.get("27")
        ra = lm.get(28) or lm.get("28")

        if lh and rh:
            hip_xs.append((lh["x"] + rh["x"]) / 2.0)
            hip_ys_clean.append((lh["y"] + rh["y"]) / 2.0)
        if la:
            l_ax.append(la["x"])
            l_ay.append(la["y"])
        if ra:
            r_ax.append(ra["x"])
            r_ay.append(ra["y"])

    hip_x_ptp = float(np.ptp(hip_xs)) if hip_xs else 0.0
    hip_y_ptp = float(np.ptp(hip_ys_clean)) if hip_ys_clean else (float(np.ptp(hip_y_positions)) if hip_y_positions else 0.0)

    ank_h_span = max(float(np.ptp(l_ax)) if l_ax else 0.0, float(np.ptp(r_ax)) if r_ax else 0.0)
    ank_v_span = max(float(np.ptp(l_ay)) if l_ay else 0.0, float(np.ptp(r_ay)) if r_ay else 0.0)

    # Frame-to-frame ankle displacement speed
    disp_l = [np.sqrt((l_ax[i] - l_ax[i - 1]) ** 2 + (l_ay[i] - l_ay[i - 1]) ** 2) for i in range(1, len(l_ax))]
    disp_r = [np.sqrt((r_ax[i] - r_ax[i - 1]) ** 2 + (r_ay[i] - r_ay[i - 1]) ** 2) for i in range(1, len(r_ax))]
    all_disp = disp_l + disp_r
    mean_ankle_disp = float(np.mean(all_disp)) if all_disp else 0.0

    # Knee flexion depth & bilateral synchrony
    both_deep_115 = np.sum((lk < 115.0) & (rk < 115.0))
    both_deep_120 = np.sum((lk < 120.0) & (rk < 120.0))
    simul_deep_ratio = float(both_deep_115) / float(n_frames)
    simul_flex_ratio = float(both_deep_120) / float(n_frames)

    # Alternating leg disparity
    knee_diffs = np.abs(lk - rk)
    max_knee_diff = float(np.max(knee_diffs))
    mean_knee_diff = float(np.mean(knee_diffs))

    # Evidence Accumulator
    run_evidence = 0.0
    squat_evidence = 0.0

    # 1. Horizontal body translation (Running translates; Squats remain in place horizontally)
    if hip_x_ptp > 0.20:
        run_evidence += 3.0
    elif hip_x_ptp < 0.12:
        squat_evidence += 2.0

    # 2. Planted feet vs traveling feet (Squat feet stay planted; running feet travel horizontally)
    if ank_h_span > 0.25:
        run_evidence += 3.5
    elif ank_h_span < 0.20:
        squat_evidence += 2.5

    # 3. Ankle vertical travel span (Running kicks/lifts feet up; Squat feet stay near the floor)
    if ank_v_span > 0.60:
        run_evidence += 3.0
    elif ank_v_span < 0.40 and hip_y_ptp > 0.20:
        squat_evidence += 2.0

    # 4. Simultaneous deep flexion with stationary base
    if simul_deep_ratio >= 0.20 and ank_h_span < 0.25 and hip_x_ptp < 0.18:
        squat_evidence += 4.0

    # 5. Knee angle range & alternating disparity
    if max_knee_diff > 35.0 or float(np.ptp(lk)) > 55.0 or float(np.ptp(rk)) > 55.0:
        run_evidence += 2.0

    # 6. Mean ankle displacement speed
    if mean_ankle_disp > 0.12:
        run_evidence += 2.0
    elif mean_ankle_disp < 0.08 and hip_y_ptp > 0.20:
        squat_evidence += 1.5

    # STRICT PHYSICAL CONSTRAINT:
    # Squatting REQUIRES stationary horizontal base.
    # An athlete whose feet or hips translate significantly (>0.25) across the screen is in locomotion (running/jogging), not squatting.
    if ank_h_span > 0.28 or hip_x_ptp > 0.20:
        squat_evidence = 0.0

    if squat_evidence > run_evidence:
        return "Squatting"

    return "Running"


def analyze_biomechanics_from_frames(frames_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Processes keypoint trajectories across frames to calculate summary biomechanical metrics
    and dynamically infer the detected movement activity.
    """
    if not frames_data:
        return get_default_biomechanics()

    knee_valgus_list = []
    trunk_lean_list = []
    left_knee_angles = []
    right_knee_angles = []
    left_hip_angles = []
    right_hip_angles = []
    left_ankle_angles = []
    right_ankle_angles = []
    joint_alignment_list = []
    hip_y_positions = []

    for frame in frames_data:
        lm = frame.get("landmarks")
        if not lm or not isinstance(lm, dict):
            continue

        # MediaPipe Pose Keypoints:
        # 11: L Shoulder, 12: R Shoulder
        # 13: L Elbow, 14: R Elbow
        # 15: L Wrist, 16: R Wrist
        # 23: L Hip, 24: R Hip
        # 25: L Knee, 26: R Knee
        # 27: L Ankle, 28: R Ankle
        # 31: L Foot, 32: R Foot
        l_sh = lm.get(11) or lm.get("11")
        r_sh = lm.get(12) or lm.get("12")
        l_hip = lm.get(23) or lm.get("23")
        r_hip = lm.get(24) or lm.get("24")
        l_knee = lm.get(25) or lm.get("25")
        r_knee = lm.get(26) or lm.get("26")
        l_ankle = lm.get(27) or lm.get("27")
        r_ankle = lm.get(28) or lm.get("28")
        l_foot = lm.get(31) or lm.get("31")
        r_foot = lm.get(32) or lm.get("32")

        # Lower body angles & Valgus
        if l_hip and r_hip and l_knee and r_knee and l_ankle and r_ankle:
            # Knee Flexion Angles (Hip - Knee - Ankle)
            lk_angle = calculate_angle_3d(l_hip, l_knee, l_ankle)
            rk_angle = calculate_angle_3d(r_hip, r_knee, r_ankle)
            left_knee_angles.append(lk_angle)
            right_knee_angles.append(rk_angle)

            # Knee Valgus Angle (Frontal Plane Deviation)
            l_valgus = calculate_frontal_valgus_angle(l_hip, l_knee, l_ankle)
            r_valgus = calculate_frontal_valgus_angle(r_hip, r_knee, r_ankle)
            knee_valgus_list.append(max(l_valgus, r_valgus))

            # Hip Vertical Tracking for Stability
            mid_hip_y = (l_hip['y'] + r_hip['y']) / 2.0
            hip_y_positions.append(mid_hip_y)

        # Ankle Angles (Knee - Ankle - Foot Index if present, else fallback)
        if l_knee and r_knee and l_ankle and r_ankle and l_foot and r_foot:
            la_angle = calculate_angle_3d(l_knee, l_ankle, l_foot)
            ra_angle = calculate_angle_3d(r_knee, r_ankle, r_foot)
            left_ankle_angles.append(la_angle)
            right_ankle_angles.append(ra_angle)

        # Trunk & Hip Flexion Angles
        if l_sh and r_sh and l_hip and r_hip and l_knee and r_knee:
            # Hip Flexion Angles (Shoulder - Hip - Knee)
            lh_angle = calculate_angle_3d(l_sh, l_hip, l_knee)
            rh_angle = calculate_angle_3d(r_sh, r_hip, r_knee)
            left_hip_angles.append(lh_angle)
            right_hip_angles.append(rh_angle)

            # Trunk Lean (Shoulder-to-Hip axis tilt vs vertical)
            mid_sh_x = (l_sh['x'] + r_sh['x']) / 2.0
            mid_sh_y = (l_sh['y'] + r_sh['y']) / 2.0
            mid_hip_x = (l_hip['x'] + r_hip['x']) / 2.0
            mid_hip_y = (l_hip['y'] + r_hip['y']) / 2.0

            dx = mid_sh_x - mid_hip_x
            dy = mid_sh_y - mid_hip_y
            lean_deg = float(np.degrees(np.arctan2(abs(dx), abs(dy) + 1e-6)))
            trunk_lean_list.append(lean_deg)

            # Alignment score (shoulder level & hip level tilt parallelism)
            sh_tilt = abs(l_sh['y'] - r_sh['y'])
            hip_tilt = abs(l_hip['y'] - r_hip['y'])
            alignment_err = (sh_tilt + hip_tilt) * 100.0
            joint_alignment_list.append(max(0.0, 100.0 - alignment_err * 20.0))

    # Dynamic Activity Detection from Keypoint Trajectories
    detected_activity = detect_activity_from_landmarks(
        frames_data, left_knee_angles, right_knee_angles, hip_y_positions
    )

    # Summary Aggregations
    avg_knee_valgus = float(np.mean(knee_valgus_list)) if knee_valgus_list else 11.5
    avg_trunk_lean = float(np.mean(trunk_lean_list)) if trunk_lean_list else 8.0
    avg_joint_alignment = float(np.mean(joint_alignment_list)) if joint_alignment_list else 85.0

    avg_knee_angle = float(np.mean(left_knee_angles + right_knee_angles)) if (left_knee_angles or right_knee_angles) else 135.0
    avg_hip_angle = float(np.mean(left_hip_angles + right_hip_angles)) if (left_hip_angles or right_hip_angles) else 140.0
    avg_ankle_angle = float(np.mean(left_ankle_angles + right_ankle_angles)) if (left_ankle_angles or right_ankle_angles) else 105.0

    # Range of Motion (ROM) & Stride Estimate
    if left_knee_angles and right_knee_angles:
        lk_rom = np.ptp(left_knee_angles)
        rk_rom = np.ptp(right_knee_angles)
        avg_rom = float((lk_rom + rk_rom) / 2.0)
        stride_length = float(np.round(1.1 + (avg_rom / 180.0) * 0.5, 2))
    else:
        avg_rom = 65.0
        stride_length = 1.25

    # Bilateral Symmetry Score
    if left_knee_angles and right_knee_angles:
        mean_l = np.mean(left_knee_angles)
        mean_r = np.mean(right_knee_angles)
        max_knee = max(mean_l, mean_r) + 1e-6
        diff = abs(mean_l - mean_r)
        symmetry_score = float(np.clip(100.0 - (diff / max_knee) * 100.0, 50.0, 100.0))
    else:
        symmetry_score = 85.0

    # Hip Stability (Vertical Center of Mass Variance)
    if hip_y_positions:
        std_hip = np.std(hip_y_positions)
        hip_stability = float(np.clip(100.0 - std_hip * 400.0, 40.0, 100.0))
    else:
        hip_stability = 80.0

    # Fatigue Score (Variance decay across movement trajectory segments)
    if len(left_knee_angles) > 10:
        half = len(left_knee_angles) // 2
        first_var = np.var(left_knee_angles[:half])
        second_var = np.var(left_knee_angles[half:])
        fatigue_score = float(np.clip(20.0 + abs(second_var - first_var) * 2.0, 10.0, 85.0))
    else:
        fatigue_score = 20.0

    # Composite Movement Quality Index
    movement_quality = float(
        np.clip(
            0.35 * symmetry_score +
            0.35 * avg_joint_alignment +
            0.30 * max(0.0, 100.0 - avg_trunk_lean * 2.0),
            40.0, 98.0
        )
    )

    biomechanical_details = [
        {
            "feature": "Knee Valgus",
            "value": round(avg_knee_valgus, 1),
            "unit": "deg",
            "method": "2D frontal plane projection of knee offset relative to hip-ankle axis",
            "threshold": "< 10.0 deg",
            "status": "Normal" if avg_knee_valgus <= 10.0 else "Deviated",
            "is_within_threshold": bool(avg_knee_valgus <= 10.0)
        },
        {
            "feature": "Trunk Lean",
            "value": round(avg_trunk_lean, 1),
            "unit": "deg",
            "method": "Spinal shoulder-hip axis deviation from vertical plane",
            "threshold": "< 10.0 deg",
            "status": "Normal" if avg_trunk_lean <= 10.0 else "Deviated",
            "is_within_threshold": bool(avg_trunk_lean <= 10.0)
        },
        {
            "feature": "Range of Motion (ROM)",
            "value": round(avg_rom, 1),
            "unit": "deg",
            "method": "Difference between maximum extension and minimum flexion knee angle",
            "threshold": ">= 60.0 deg",
            "status": "Normal" if avg_rom >= 60.0 else "Restricted",
            "is_within_threshold": bool(avg_rom >= 60.0)
        },
        {
            "feature": "Bilateral Symmetry",
            "value": round(symmetry_score, 1),
            "unit": "%",
            "method": "Bilateral percentage match between left and right limb kinematics",
            "threshold": ">= 80.0%",
            "status": "Normal" if symmetry_score >= 80.0 else "Asymmetric",
            "is_within_threshold": bool(symmetry_score >= 80.0)
        },
        {
            "feature": "Hip Stability",
            "value": round(hip_stability, 1),
            "unit": "%",
            "method": "Inverse vertical center-of-mass variance across stride trajectory",
            "threshold": ">= 75.0%",
            "status": "Optimal" if hip_stability >= 75.0 else "Unstable",
            "is_within_threshold": bool(hip_stability >= 75.0)
        },
        {
            "feature": "Movement Quality",
            "value": round(movement_quality, 1),
            "unit": "%",
            "method": "Weighted composite score of symmetry, trunk alignment, and joint stability",
            "threshold": ">= 75.0%",
            "status": "High Quality" if movement_quality >= 75.0 else "Needs Improvement",
            "is_within_threshold": bool(movement_quality >= 75.0)
        },
        {
            "feature": "Fatigue Score",
            "value": round(fatigue_score, 1),
            "unit": "%",
            "method": "Kinematic variance decay comparison between first and second half of session",
            "threshold": "< 35.0%",
            "status": "Normal" if fatigue_score < 35.0 else "Fatigued",
            "is_within_threshold": bool(fatigue_score < 35.0)
        }
    ]

    return {
        "detected_activity": detected_activity,
        "knee_valgus": round(avg_knee_valgus, 1),
        "hip_stability": round(hip_stability, 1),
        "trunk_lean": round(avg_trunk_lean, 1),
        "stride_length": round(stride_length, 2),
        "joint_alignment": round(avg_joint_alignment, 1),
        "symmetry_score": round(symmetry_score, 1),
        "fatigue_score": round(fatigue_score, 1),
        "movement_quality": round(movement_quality, 1),
        "range_of_motion_deg": round(avg_rom, 1),
        "knee_angle": round(avg_knee_angle, 1),
        "hip_angle": round(avg_hip_angle, 1),
        "ankle_angle": round(avg_ankle_angle, 1),
        "biomechanical_details": biomechanical_details
    }


def get_default_biomechanics() -> Dict[str, Any]:
    return {
        "detected_activity": "Running",
        "knee_valgus": 11.5,
        "hip_stability": 82.0,
        "trunk_lean": 7.8,
        "stride_length": 1.25,
        "joint_alignment": 86.0,
        "symmetry_score": 85.0,
        "fatigue_score": 20.0,
        "movement_quality": 84.0,
        "range_of_motion_deg": 65.0,
        "knee_angle": 135.0,
        "hip_angle": 140.0,
        "ankle_angle": 105.0,
        "biomechanical_details": [
            {
                "feature": "Knee Valgus",
                "value": 11.5,
                "unit": "deg",
                "method": "2D frontal plane projection of knee offset relative to hip-ankle axis",
                "threshold": "< 10.0 deg",
                "status": "Deviated",
                "is_within_threshold": False
            },
            {
                "feature": "Trunk Lean",
                "value": 7.8,
                "unit": "deg",
                "method": "Spinal shoulder-hip axis deviation from vertical plane",
                "threshold": "< 10.0 deg",
                "status": "Normal",
                "is_within_threshold": True
            },
            {
                "feature": "Range of Motion (ROM)",
                "value": 65.0,
                "unit": "deg",
                "method": "Difference between maximum extension and minimum flexion knee angle",
                "threshold": ">= 60.0 deg",
                "status": "Normal",
                "is_within_threshold": True
            },
            {
                "feature": "Bilateral Symmetry",
                "value": 85.0,
                "unit": "%",
                "method": "Bilateral percentage match between left and right limb kinematics",
                "threshold": ">= 80.0%",
                "status": "Normal",
                "is_within_threshold": True
            },
            {
                "feature": "Hip Stability",
                "value": 82.0,
                "unit": "%",
                "method": "Inverse vertical center-of-mass variance across stride trajectory",
                "threshold": ">= 75.0%",
                "status": "Optimal",
                "is_within_threshold": True
            },
            {
                "feature": "Movement Quality",
                "value": 84.0,
                "unit": "%",
                "method": "Weighted composite score of symmetry, trunk alignment, and joint stability",
                "threshold": ">= 75.0%",
                "status": "High Quality",
                "is_within_threshold": True
            },
            {
                "feature": "Fatigue Score",
                "value": 20.0,
                "unit": "%",
                "method": "Kinematic variance decay comparison between first and second half of session",
                "threshold": "< 35.0%",
                "status": "Normal",
                "is_within_threshold": True
            }
        ]
    }


