"""
app/services/pose_estimator.py
--------------------------------
MediaPipe Pose-based landmark extraction service.

Supports both MediaPipe APIs:
  - 0.10.x: uses mp.solutions.pose (legacy Solutions API)
  - 1.x+:   uses mp.tasks.python.vision.PoseLandmarker (Tasks API)
             Downloads the BlazePose Full model .task file on first run.

Design goals
------------
- **Modular interface**: ``BasePoseEstimator`` defines the contract so a future
  implementation can swap in a different model (e.g. MoveNet, BlazePose Heavy,
  a custom ONNX model) without touching the API layer or database logic.
- **No fabrication**: only landmarks returned directly by MediaPipe are stored.
  If MediaPipe returns no results for a frame the frame is skipped silently.
- **Safe handling of low-confidence landmarks**: all 33 landmarks are stored
  regardless of ``visibility`` — the raw value is preserved so downstream
  ML can apply its own threshold.
- **Structured for ML feature engineering**: the returned ``LandmarkResult``
  objects contain frame_number and timestamp_ms so callers can compute
  velocities, angles, and symmetry across frames.

MediaPipe Pose landmark topology (indices 0–32):
  https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
"""
from __future__ import annotations

import logging
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ── MediaPipe landmark name lookup ────────────────────────────────────────────
# Ordered list matching MediaPipe PoseLandmark enum values (index = position).
LANDMARK_NAMES: list[str] = [
    "NOSE",
    "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
    "LEFT_EAR", "RIGHT_EAR",
    "MOUTH_LEFT", "MOUTH_RIGHT",
    "LEFT_SHOULDER", "RIGHT_SHOULDER",
    "LEFT_ELBOW", "RIGHT_ELBOW",
    "LEFT_WRIST", "RIGHT_WRIST",
    "LEFT_PINKY", "RIGHT_PINKY",
    "LEFT_INDEX", "RIGHT_INDEX",
    "LEFT_THUMB", "RIGHT_THUMB",
    "LEFT_HIP", "RIGHT_HIP",
    "LEFT_KNEE", "RIGHT_KNEE",
    "LEFT_ANKLE", "RIGHT_ANKLE",
    "LEFT_HEEL", "RIGHT_HEEL",
    "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX",
]  # 33 total (indices 0–32)

# Model file for MediaPipe Tasks API (1.x)
_TASK_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_full/float16/latest/pose_landmarker_full.task"
)
_TASK_MODEL_PATH = Path("/app/uploads/.mediapipe_model.task")


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class SingleLandmark:
    """
    Coordinates for a single MediaPipe pose landmark.

    Fields are the raw values returned by MediaPipe — no post-processing.
    Suitable for downstream ML feature engineering (angles, velocities, etc.).
    """
    landmark_index: int    # 0–32
    landmark_name: str     # e.g. "LEFT_KNEE"
    x: float               # normalised [0.0, 1.0] by image width
    y: float               # normalised [0.0, 1.0] by image height
    z: float               # relative depth (negative = in front of midpoint)
    visibility: float      # [0.0, 1.0] detection confidence


@dataclass
class LandmarkResult:
    """All landmarks extracted from one video frame."""
    frame_number: int
    timestamp_ms: float
    landmarks: list[SingleLandmark] = field(default_factory=list)


# ── Abstract base (swap-in interface) ────────────────────────────────────────

class BasePoseEstimator(ABC):
    """
    Contract for pose estimation implementations.

    To replace MediaPipe with another model:
    1. Subclass ``BasePoseEstimator``.
    2. Implement ``process_frame`` and ``close``.
    3. Inject the new class into ``run_analysis_pipeline``.
    """

    @abstractmethod
    def process_frame(
        self,
        frame_number: int,
        timestamp_ms: float,
        image_bgr: np.ndarray,
    ) -> LandmarkResult | None:
        """
        Extract pose landmarks from a single BGR image.

        Returns
        -------
        LandmarkResult | None
            ``None`` if no person was detected in the frame.
        """

    @abstractmethod
    def close(self) -> None:
        """Release any resources held by the estimator."""

    def __enter__(self) -> "BasePoseEstimator":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


# ── MediaPipe Solutions API (0.10.x) ─────────────────────────────────────────

class MediaPipeSolutionsPoseEstimator(BasePoseEstimator):
    """
    Pose estimator using the legacy MediaPipe Solutions API (0.10.x).

    Available when ``mp.solutions.pose`` exists.
    """

    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1,
    ) -> None:
        import mediapipe as mp  # noqa: PLC0415
        self._mp_pose = mp.solutions.pose
        self._pose = self._mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,
            smooth_landmarks=True,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        logger.info("MediaPipe Solutions Pose estimator initialised (0.10.x API)")

    def process_frame(
        self,
        frame_number: int,
        timestamp_ms: float,
        image_bgr: np.ndarray,
    ) -> LandmarkResult | None:
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        results = self._pose.process(image_rgb)
        image_rgb.flags.writeable = True

        if not results.pose_landmarks:
            return None

        landmarks = []
        for idx, lm in enumerate(results.pose_landmarks.landmark):
            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"LANDMARK_{idx}"
            landmarks.append(SingleLandmark(
                landmark_index=idx,
                landmark_name=name,
                x=float(lm.x),
                y=float(lm.y),
                z=float(lm.z),
                visibility=float(lm.visibility),
            ))

        return LandmarkResult(frame_number=frame_number, timestamp_ms=timestamp_ms, landmarks=landmarks)

    def close(self) -> None:
        self._pose.close()


# ── MediaPipe Tasks API (1.x) ─────────────────────────────────────────────────

class MediaPipeTasksPoseEstimator(BasePoseEstimator):
    """
    Pose estimator using the new MediaPipe Tasks API (1.x).

    Downloads the BlazePose Full model on first use and caches it at
    /app/uploads/.mediapipe_model.task (inside the Docker uploads volume).
    """

    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        from mediapipe.tasks.python import vision  # noqa: PLC0415
        from mediapipe.tasks.python.core import base_options as bo  # noqa: PLC0415

        model_path = self._ensure_model()

        options = vision.PoseLandmarkerOptions(
            base_options=bo.BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self._landmarker = vision.PoseLandmarker.create_from_options(options)
        logger.info("MediaPipe Tasks PoseLandmarker initialised (1.x API)")

    @staticmethod
    def _ensure_model() -> Path:
        """Download the .task model if not already cached."""
        import mediapipe as mp  # noqa: PLC0415
        path = _TASK_MODEL_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            logger.info("Downloading MediaPipe model to %s …", path)
            urllib.request.urlretrieve(_TASK_MODEL_URL, path)
            logger.info("MediaPipe model downloaded (%d bytes)", path.stat().st_size)
        return path

    def process_frame(
        self,
        frame_number: int,
        timestamp_ms: float,
        image_bgr: np.ndarray,
    ) -> LandmarkResult | None:
        import mediapipe as mp  # noqa: PLC0415

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        result = self._landmarker.detect(mp_image)

        if not result.pose_landmarks:
            return None

        # Tasks API returns list of poses; take the first (primary person)
        pose = result.pose_landmarks[0]
        landmarks = []
        for idx, lm in enumerate(pose):
            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"LANDMARK_{idx}"
            landmarks.append(SingleLandmark(
                landmark_index=idx,
                landmark_name=name,
                x=float(lm.x),
                y=float(lm.y),
                z=float(lm.z),
                visibility=float(getattr(lm, 'visibility', 0.0)),
            ))

        return LandmarkResult(frame_number=frame_number, timestamp_ms=timestamp_ms, landmarks=landmarks)

    def close(self) -> None:
        self._landmarker.close()


# ── Factory function ──────────────────────────────────────────────────────────

def MediaPipePoseEstimator(
    min_detection_confidence: float = 0.5,
    min_tracking_confidence: float = 0.5,
    model_complexity: int = 1,
) -> BasePoseEstimator:
    """
    Factory that returns the appropriate MediaPipe estimator for the
    installed version.

    - If ``mp.solutions.pose`` is available → Solutions API (0.10.x)
    - Otherwise                             → Tasks API (1.x+)
    """
    try:
        import mediapipe as mp  # noqa: PLC0415
        # Try accessing the solutions namespace
        _ = mp.solutions.pose
        logger.info("Using MediaPipe Solutions API (0.10.x)")
        return MediaPipeSolutionsPoseEstimator(
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            model_complexity=model_complexity,
        )
    except AttributeError:
        logger.info("Using MediaPipe Tasks API (1.x+)")
        return MediaPipeTasksPoseEstimator(
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
