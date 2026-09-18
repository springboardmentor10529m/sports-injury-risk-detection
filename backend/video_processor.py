from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import math
import tempfile
import time

import cv2
import numpy as np


VIDEO_FEATURES = [
    "knee_angle_left", "knee_angle_right", "knee_angle_mean",
    "knee_angle_range", "hip_vertical_range", "ankle_vertical_range",
    "ankle_lateral_range", "gait_speed", "cadence", "step_count",
    "jump_height", "range_of_motion", "pose_detection_rate",
]


@dataclass
class VideoMetrics:
    features: dict[str, float]
    metadata: dict[str, Any]
    warnings: list[str]


def _calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = float(np.linalg.norm(ba) * np.linalg.norm(bc))
    if denom <= 1e-9:
        return 0.0
    return float(np.degrees(np.arccos(np.clip(np.dot(ba, bc) / denom, -1.0, 1.0))))


def _range(values: list[float]) -> float:
    return float(max(values) - min(values)) if values else 0.0


def _live_feature_values(left: list[float], right: list[float], hip: list[float],
                         ankle_l: list[float], ankle_r: list[float], ankle_x: list[float],
                         frame_times: list[float]) -> dict[str, float]:
    knees = left + right
    return {
        "knee_angle_left": float(np.mean(left)) if left else 0.0,
        "knee_angle_right": float(np.mean(right)) if right else 0.0,
        "knee_angle_mean": float(np.mean(knees)) if knees else 0.0,
        "knee_angle_range": _range(knees),
        "hip_vertical_range": _range(hip),
        "ankle_vertical_range": _range(ankle_l + ankle_r),
        "ankle_lateral_range": _range(ankle_x),
        "gait_speed": 0.0,
        "cadence": 0.0,
        "step_count": 0.0,
        "jump_height": _range(hip),
        "range_of_motion": _range(knees),
        "pose_detection_rate": 1.0 if frame_times else 0.0,
    }


def draw_pose_skeleton(frame, landmarks, width: int, height: int, frame_idx: int,
                       fps: float, knee_angle_l=None, knee_angle_r=None,
                       live_features=None):
    try:
        import mediapipe as mp
        drawing = mp.solutions.drawing_utils
        styles = mp.solutions.drawing_styles
        drawing.draw_landmarks(frame, landmarks, mp.solutions.pose.POSE_CONNECTIONS,
                               landmark_drawing_spec=styles.get_default_pose_landmarks_style())
    except Exception:
        return frame
    label = f"FRAME {frame_idx}  |  FPS {fps:.1f}"
    if knee_angle_l is not None or knee_angle_r is not None:
        label += f"  |  KNEE L {knee_angle_l or 0:.0f}  R {knee_angle_r or 0:.0f}"
    cv2.putText(frame, label, (18, max(28, height - 20)), cv2.FONT_HERSHEY_SIMPLEX,
                0.55, (40, 220, 120), 2, cv2.LINE_AA)
    return frame


def process_video(video_path: Path, defaults: dict[str, float] | None = None) -> VideoMetrics:
    defaults = defaults or {}
    warnings: list[str] = []
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return VideoMetrics({k: float(defaults.get(k, 0.0)) for k in VIDEO_FEATURES},
                            {"frames_processed": 0, "pose_detected_frames": 0,
                             "pose_detection_rate": 0.0}, ["Video could not be opened."])
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    output = Path(tempfile.mkstemp(suffix="_annotated.mp4")[1])
    writer = cv2.VideoWriter(str(output), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    left: list[float] = []; right: list[float] = []; hip: list[float] = []
    ankle_l: list[float] = []; ankle_r: list[float] = []; ankle_x: list[float] = []
    times: list[float] = []; frames = 0; detected = 0
    try:
        import mediapipe as mp
        pose = mp.solutions.pose.Pose(static_image_mode=False, model_complexity=1,
                                      smooth_landmarks=True, min_detection_confidence=.5,
                                      min_tracking_confidence=.5)
    except Exception as exc:
        pose = None; warnings.append(f"MediaPipe unavailable: {exc}")
    started = time.perf_counter()
    while True:
        ok, frame = cap.read()
        if not ok: break
        frames += 1; result = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)) if pose else None
        if result and result.pose_landmarks:
            detected += 1; lm = result.pose_landmarks.landmark; p = lambda n: np.array([lm[n].x, lm[n].y])
            import mediapipe as mp
            i = mp.solutions.pose.PoseLandmark
            try:
                l = _calculate_angle(p(i.LEFT_HIP.value), p(i.LEFT_KNEE.value), p(i.LEFT_ANKLE.value)); left.append(l)
                r = _calculate_angle(p(i.RIGHT_HIP.value), p(i.RIGHT_KNEE.value), p(i.RIGHT_ANKLE.value)); right.append(r)
                hip.append((lm[i.LEFT_HIP.value].y + lm[i.RIGHT_HIP.value].y) / 2)
                ankle_l.append(lm[i.LEFT_ANKLE.value].y); ankle_r.append(lm[i.RIGHT_ANKLE.value].y)
                ankle_x.append((lm[i.LEFT_ANKLE.value].x + lm[i.RIGHT_ANKLE.value].x) / 2); times.append((frames - 1) / fps)
                draw_pose_skeleton(frame, result.pose_landmarks, width, height, frames, fps, l, r)
            except Exception: pass
        writer.write(frame)
    cap.release(); writer.release()
    if pose: pose.close()
    features = _live_feature_values(left, right, hip, ankle_l, ankle_r, ankle_x, times)
    features.update({k: float(defaults.get(k, v)) if not v else v for k, v in features.items()})
    metadata = {"frames_processed": frames, "fps": fps, "pose_detected_frames": detected,
                "pose_detection_rate": detected / frames if frames else 0.0,
                "processing_time_s": time.perf_counter() - started, "annotated_video": str(output),
                "is_h264": False, "telemetry": []}
    return VideoMetrics(features, metadata, warnings)
