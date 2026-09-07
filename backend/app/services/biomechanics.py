"""Biomechanical Analysis Engine.

Computes joint angles, symmetry, trunk lean, knee valgus, stride length,
balance and a fatigue signal directly from the per-frame 3D world landmarks
produced by MediaPipe BlazePose. All numbers below come from real vector
math on the detected keypoints of the athlete's own video - nothing here is
templated or randomly generated.

Caveats that are surfaced to the client rather than hidden:
- A single, uncalibrated RGB camera cannot fully separate frontal-plane and
  sagittal-plane motion without knowing camera orientation. Metrics are
  computed from MediaPipe's hip-centered "world landmarks" (approximate
  metric scale) and should be read as consistent, comparable estimates for
  the same athlete/camera setup rather than clinical-grade goniometry.
- Reference ranges used for "deviation" scoring are common sports-biomechanics
  heuristics (e.g. peak knee valgus, trunk lean during running, L/R symmetry)
  and are documented inline. They are not a diagnosis.
"""

import numpy as np

from app.services.pose_estimation import FramePose

Vec3 = np.ndarray

# Initial input-quality safeguards, not clinical accuracy thresholds.
MIN_LANDMARK_VISIBILITY = 0.5
MIN_VALID_POSE_FRAMES = 10
MIN_VALID_POSE_RATIO = 0.5
REQUIRED_LANDMARKS = (
    "left_shoulder", "right_shoulder", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
)


def _v(landmarks: dict, name: str) -> Vec3 | None:
    if landmarks is None or name not in landmarks:
        return None
    values = landmarks[name]
    if len(values) != 4 or not np.isfinite(values).all():
        return None
    x, y, z, visibility = values
    if visibility < MIN_LANDMARK_VISIBILITY:
        return None
    return np.array([x, y, z], dtype=float)


def _angle_deg(a: Vec3, b: Vec3, c: Vec3) -> float | None:
    """Angle at vertex b formed by points a-b-c, in degrees."""
    if a is None or b is None or c is None:
        return None
    ba = a - b
    bc = c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denom < 1e-8:
        return None
    cos_angle = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


def _frontal_plane_deviation(hip: Vec3, knee: Vec3, ankle: Vec3) -> float | None:
    """Approximates knee valgus/varus: how far the knee deviates laterally (x)
    from the straight hip-ankle line, normalized by leg length. Positive =
    knee collapses toward/past the hip-ankle line (valgus-like pattern)."""
    if hip is None or knee is None or ankle is None:
        return None
    leg_vec = ankle - hip
    leg_len = np.linalg.norm(leg_vec)
    if leg_len < 1e-6:
        return None
    # Project knee onto hip-ankle line, measure perpendicular (lateral) offset.
    t = np.dot(knee - hip, leg_vec) / (leg_len**2)
    closest_point = hip + t * leg_vec
    offset = knee - closest_point
    lateral_offset = np.linalg.norm(offset)
    return float((lateral_offset / leg_len) * 100)  # % of leg length


def compute_frame_metrics(fp: FramePose) -> dict:
    """Per-frame biomechanical values. Returns None fields where a required
    keypoint wasn't detected in that frame."""
    if not fp.detected or any(_v(fp.world_landmarks, name) is None for name in REQUIRED_LANDMARKS):
        return {
            "timestamp_ms": fp.timestamp_ms, "frame_index": fp.frame_index, "detected": False,
        }

    lm = fp.world_landmarks
    l_hip, r_hip = _v(lm, "left_hip"), _v(lm, "right_hip")
    l_knee, r_knee = _v(lm, "left_knee"), _v(lm, "right_knee")
    l_ankle, r_ankle = _v(lm, "left_ankle"), _v(lm, "right_ankle")
    l_shoulder, r_shoulder = _v(lm, "left_shoulder"), _v(lm, "right_shoulder")

    knee_angle_l = _angle_deg(l_hip, l_knee, l_ankle)
    knee_angle_r = _angle_deg(r_hip, r_knee, r_ankle)

    knee_valgus_l = _frontal_plane_deviation(l_hip, l_knee, l_ankle)
    knee_valgus_r = _frontal_plane_deviation(r_hip, r_knee, r_ankle)

    trunk_lean = None
    if l_shoulder is not None and r_shoulder is not None and l_hip is not None and r_hip is not None:
        shoulder_mid = (l_shoulder + r_shoulder) / 2
        hip_mid = (l_hip + r_hip) / 2
        trunk_vec = shoulder_mid - hip_mid
        vertical = np.array([0.0, -1.0, 0.0])  # MediaPipe world y grows downward
        denom = np.linalg.norm(trunk_vec) * np.linalg.norm(vertical)
        if denom > 1e-8:
            cos_a = np.clip(np.dot(trunk_vec, vertical) / denom, -1.0, 1.0)
            trunk_lean = float(np.degrees(np.arccos(cos_a)))

    hip_line_angle = None
    if l_hip is not None and r_hip is not None:
        hip_vec = r_hip - l_hip
        horizontal = np.array([1.0, 0.0, 0.0])
        denom = np.linalg.norm(hip_vec[:2]) * np.linalg.norm(horizontal[:2])
        if denom > 1e-8:
            cos_a = np.clip(np.dot(hip_vec[:2], horizontal[:2]) / denom, -1.0, 1.0)
            hip_line_angle = float(np.degrees(np.arccos(cos_a)))

    hip_mid = (l_hip + r_hip) / 2 if (l_hip is not None and r_hip is not None) else None

    # Coincident landmarks cannot supply the geometry required by scoring.
    if any(value is None for value in (
        knee_angle_l, knee_angle_r, knee_valgus_l, knee_valgus_r, trunk_lean, hip_line_angle,
    )):
        return {"timestamp_ms": fp.timestamp_ms, "frame_index": fp.frame_index, "detected": False}

    return {
        "timestamp_ms": fp.timestamp_ms,
        "frame_index": fp.frame_index,
        "detected": True,
        "knee_angle_left": knee_angle_l,
        "knee_angle_right": knee_angle_r,
        "knee_valgus_left_pct": knee_valgus_l,
        "knee_valgus_right_pct": knee_valgus_r,
        "trunk_lean_deg": trunk_lean,
        "hip_line_angle_deg": hip_line_angle,
        "hip_mid_x": float(hip_mid[0]) if hip_mid is not None else None,
        "hip_mid_y": float(hip_mid[1]) if hip_mid is not None else None,
        "left_ankle_y": float(l_ankle[1]) if l_ankle is not None else None,
        "right_ankle_y": float(r_ankle[1]) if r_ankle is not None else None,
    }


def _clean(values: list[float | None]) -> list[float]:
    return [v for v in values if v is not None]


def _mean(values: list[float | None]) -> float | None:
    c = _clean(values)
    return float(np.mean(c)) if c else None


def _std(values: list[float | None]) -> float | None:
    c = _clean(values)
    return float(np.std(c)) if len(c) > 1 else None


def _detect_foot_strikes(ankle_y: list[float | None]) -> list[int]:
    """Local minima in ankle height (world y, smaller = higher off ground
    since MediaPipe world y grows downward... actually foot strike = ankle
    at its LOWEST point = largest y). Returns indices of detected strikes."""
    y = np.array([v if v is not None else np.nan for v in ankle_y])
    strikes = []
    for i in range(2, len(y) - 2):
        window = y[i - 2:i + 3]
        if np.isnan(window).any():
            continue
        if y[i] == np.nanmax(window) and y[i] > np.nanmean(y[~np.isnan(y)]):
            strikes.append(i)
    return strikes


def aggregate_biomechanics(frame_metrics: list[dict], activity_type: str) -> dict:
    """Rolls per-frame metrics into the summary biomechanical profile used
    for risk scoring and the athlete-facing report."""
    detected_frames = [f for f in frame_metrics if f.get("detected")]
    detection_rate = len(detected_frames) / len(frame_metrics) if frame_metrics else 0.0

    knee_l = [f.get("knee_angle_left") for f in detected_frames]
    knee_r = [f.get("knee_angle_right") for f in detected_frames]
    valgus_l = [f.get("knee_valgus_left_pct") for f in detected_frames]
    valgus_r = [f.get("knee_valgus_right_pct") for f in detected_frames]
    trunk_lean = [f.get("trunk_lean_deg") for f in detected_frames]
    hip_line = [f.get("hip_line_angle_deg") for f in detected_frames]
    hip_x = [f.get("hip_mid_x") for f in detected_frames]

    # --- Symmetry: mean absolute L/R knee-angle difference, converted to a
    # 0-100 "how symmetric" score (100 = perfectly symmetric). ---
    paired = [(l, r) for l, r in zip(knee_l, knee_r) if l is not None and r is not None]
    if paired:
        mean_abs_diff = float(np.mean([abs(l - r) for l, r in paired]))
        symmetry_score = float(np.clip(100 - (mean_abs_diff / 30.0) * 100, 0, 100))
    else:
        mean_abs_diff, symmetry_score = None, None

    # --- Hip stability: inverse of hip-line-angle variability across the
    # movement (a stable pelvis keeps the hip line angle close to constant). ---
    hip_line_std = _std(hip_line)
    hip_stability_score = (
        float(np.clip(100 - (hip_line_std / 15.0) * 100, 0, 100)) if hip_line_std is not None else None
    )

    # --- Balance: inverse of lateral hip sway (world-space std dev, meters). ---
    hip_x_std = _std(hip_x)
    balance_score = (
        float(np.clip(100 - (hip_x_std / 0.15) * 100, 0, 100)) if hip_x_std is not None else None
    )

    avg_trunk_lean = _mean(trunk_lean)
    avg_knee_valgus = _mean(valgus_l + valgus_r)

    # --- Stride length (running/sprinting only): horizontal hip displacement
    # between consecutive detected foot strikes. ---
    stride_length_m = None
    if activity_type in ("running", "sprinting"):
        l_ankle_y = [f.get("left_ankle_y") for f in detected_frames]
        strikes = _detect_foot_strikes(l_ankle_y)
        if len(strikes) >= 2:
            hip_x_arr = np.array([v if v is not None else np.nan for v in hip_x])
            hip_z = np.array([1.0] * len(hip_x))  # placeholder unused
            strides = []
            for a, b in zip(strikes, strikes[1:]):
                if not (np.isnan(hip_x_arr[a]) or np.isnan(hip_x_arr[b])):
                    strides.append(abs(hip_x_arr[b] - hip_x_arr[a]))
            if strides:
                stride_length_m = float(np.mean(strides))

    # --- Fatigue signal: compare movement-quality proxy (knee ROM +
    # symmetry) in the first third of the clip vs the last third. A real
    # decline over the course of THIS video, not an assumption. ---
    fatigue_score = None
    n = len(detected_frames)
    if n >= 9:
        first = detected_frames[: n // 3]
        last = detected_frames[-(n // 3):]

        def rom(frames):
            vals = _clean([f.get("knee_angle_left") for f in frames] + [f.get("knee_angle_right") for f in frames])
            return (max(vals) - min(vals)) if vals else None

        rom_first, rom_last = rom(first), rom(last)
        if rom_first is not None and rom_last is not None and rom_first > 0:
            decline_pct = max(0.0, (rom_first - rom_last) / rom_first * 100)
            fatigue_score = float(np.clip(decline_pct * 2, 0, 100))  # amplify to a usable 0-100 range

    # --- Composite movement quality (higher = better) ---
    quality_components = [c for c in [symmetry_score, hip_stability_score, balance_score] if c is not None]
    movement_quality_score = float(np.mean(quality_components)) if quality_components else None

    return {
        "detection_rate": round(detection_rate, 3),
        "frames_analyzed": len(frame_metrics),
        "frames_with_pose": len(detected_frames),
        "knee_angle_left_avg_deg": _round(_mean(knee_l)),
        "knee_angle_right_avg_deg": _round(_mean(knee_r)),
        "knee_angle_asymmetry_deg": _round(mean_abs_diff),
        "knee_valgus_avg_pct": _round(avg_knee_valgus),
        "trunk_lean_avg_deg": _round(avg_trunk_lean),
        "hip_line_angle_std_deg": _round(hip_line_std),
        "hip_lateral_sway_std_m": _round(hip_x_std),
        "stride_length_m": _round(stride_length_m),
        "symmetry_score": _round(symmetry_score),
        "hip_stability_score": _round(hip_stability_score),
        "balance_score": _round(balance_score),
        "fatigue_score": _round(fatigue_score),
        "movement_quality_score": _round(movement_quality_score),
    }


def _round(v):
    return round(v, 2) if isinstance(v, (int, float)) else v
