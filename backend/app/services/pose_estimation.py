"""Pose estimation using MediaPipe's Pose Landmarker (Tasks API, BlazePose GHUM
model, 33 3D keypoints). This is the real on-device model - not a stub.

Requires the model bundle to exist at settings.POSE_MODEL_PATH. Run
`backend/scripts/download_models.sh` once before starting the API; if the
file is missing we raise immediately rather than silently returning empty
results.
"""

from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision as mp_vision

from app.core.config import settings
from app.video_processing.frame_extractor import ExtractedFrame

# BlazePose 33-keypoint index -> semantic name, per the official landmark map:
# https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
LANDMARK_NAMES = {
    0: "nose",
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow", 14: "right_elbow",
    15: "left_wrist", 16: "right_wrist",
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
    29: "left_heel", 30: "right_heel",
    31: "left_foot_index", 32: "right_foot_index",
}


class PoseModelNotFoundError(Exception):
    pass


@dataclass
class FramePose:
    timestamp_ms: int
    frame_index: int
    detected: bool
    # name -> (x, y, z, visibility). image landmarks are normalized [0,1] to
    # frame width/height. world landmarks are metric (meters), hip-centered,
    # and are what the biomechanics engine uses for angle math since they are
    # far less sensitive to camera distance/zoom than the normalized image
    # coordinates.
    image_landmarks: dict[str, tuple[float, float, float, float]] | None
    world_landmarks: dict[str, tuple[float, float, float, float]] | None


def _landmark_dict(landmark_list, world: bool) -> dict[str, tuple[float, float, float, float]]:
    out = {}
    for idx, name in LANDMARK_NAMES.items():
        if idx >= len(landmark_list):
            continue
        lm = landmark_list[idx]
        visibility = getattr(lm, "visibility", 1.0)
        out[name] = (lm.x, lm.y, lm.z, visibility)
    return out


class PoseEstimator:
    """Wraps a MediaPipe PoseLandmarker running in VIDEO mode so that
    timestamps must be strictly increasing across calls - matching how we
    feed it sequential sampled frames from a single video."""

    def __init__(self, model_path: str | None = None):
        model_path = model_path or settings.POSE_MODEL_PATH
        if not Path(model_path).exists():
            raise PoseModelNotFoundError(
                f"Pose model not found at '{model_path}'. Run "
                f"backend/scripts/download_models.sh once before starting the API."
            )
        base_options = mp_tasks.BaseOptions(model_asset_path=model_path)
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    def process(self, frames: list[ExtractedFrame]) -> list[FramePose]:
        results: list[FramePose] = []
        last_ts = -1
        for ef in frames:
            ts = ef.timestamp_ms
            if ts <= last_ts:
                ts = last_ts + 1  # VIDEO mode requires strictly increasing timestamps
            last_ts = ts

            rgb = cv2.cvtColor(ef.frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
            result = self._landmarker.detect_for_video(mp_image, ts)

            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                image_lms = _landmark_dict(result.pose_landmarks[0], world=False)
                world_lms = (
                    _landmark_dict(result.pose_world_landmarks[0], world=True)
                    if result.pose_world_landmarks
                    else None
                )
                results.append(
                    FramePose(
                        timestamp_ms=ts,
                        frame_index=ef.frame_index,
                        detected=True,
                        image_landmarks=image_lms,
                        world_landmarks=world_lms,
                    )
                )
            else:
                results.append(
                    FramePose(
                        timestamp_ms=ts,
                        frame_index=ef.frame_index,
                        detected=False,
                        image_landmarks=None,
                        world_landmarks=None,
                    )
                )
        return results

    def close(self):
        self._landmarker.close()


def frame_pose_to_json(fp: FramePose) -> dict:
    return {
        "timestamp_ms": fp.timestamp_ms,
        "frame_index": fp.frame_index,
        "detected": fp.detected,
        "world_landmarks": fp.world_landmarks,
    }
