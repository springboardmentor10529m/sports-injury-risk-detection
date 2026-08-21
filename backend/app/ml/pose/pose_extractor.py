"""
Pose extraction service using MediaPipe Pose Landmarker.
Extracts 15 anatomical keypoints per frame with temporal smoothing.
"""

import logging
import os
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from scipy.signal import savgol_filter

logger = logging.getLogger("uvicorn.error")

# 15 Standard Anatomical Landmarks & MediaPipe Index Mapping
LANDMARK_MAPPING = {
    "NOSE": 0,
    "LEFT_SHOULDER": 11,
    "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW": 13,
    "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15,
    "RIGHT_WRIST": 16,
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_KNEE": 25,
    "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
    "LEFT_FOOT_INDEX": 31,
    "RIGHT_FOOT_INDEX": 32,
}

PRIMARY_15_LANDMARKS = [
    "NOSE",
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    "LEFT_ELBOW",
    "RIGHT_ELBOW",
    "LEFT_WRIST",
    "RIGHT_WRIST",
    "LEFT_HIP",
    "RIGHT_HIP",
    "LEFT_KNEE",
    "RIGHT_KNEE",
    "LEFT_ANKLE",
    "RIGHT_ANKLE",
    "LEFT_FOOT_INDEX",
    "RIGHT_FOOT_INDEX",
]


class PoseExtractor:
    def __init__(self, model_path: str | None = None):
        if model_path is None:
            base_dir = Path(__file__).resolve().parent
            model_path = str(base_dir / "pose_landmarker_lite.task")

        self.model_path = model_path
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"MediaPipe Pose model not found at {self.model_path}")

        base_options = python.BaseOptions(model_asset_path=self.model_path)
        self.options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def extract_from_video(
        self,
        video_path: str,
        smoothing_method: str = "SAVITZKY_GOLAY",
        savgol_window: int = 7,
        savgol_polyorder: int = 2,
    ) -> dict[str, Any]:
        """
        Process video file and extract 15-keypoint landmark timeseries.
        Retains both raw and temporally smoothed coordinate trajectories.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"OpenCV failed to open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        duration_seconds = round(total_frames / fps, 2) if total_frames > 0 and fps > 0 else 0.0

        detector = vision.PoseLandmarker.create_from_options(self.options)
        raw_frames: list[dict[str, Any]] = []

        frame_idx = 0
        while True:
            ret, frame_bgr = cap.read()
            if not ret or frame_bgr is None:
                break

            timestamp_seconds = round(frame_idx / fps, 4) if fps > 0 else float(frame_idx)
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            detection_result = detector.detect(mp_image)

            landmarks_dict: dict[str, dict[str, float]] = {}

            if detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
                pose_landmarks = detection_result.pose_landmarks[0]
                for name, idx in LANDMARK_MAPPING.items():
                    if idx < len(pose_landmarks):
                        lm = pose_landmarks[idx]
                        landmarks_dict[name] = {
                            "x": round(float(lm.x), 5),
                            "y": round(float(lm.y), 5),
                            "z": round(float(lm.z), 5),
                            "visibility": round(
                                float(
                                    lm.visibility if hasattr(lm, "visibility") and lm.visibility is not None else 1.0
                                ),
                                4,
                            ),
                        }

            raw_frames.append(
                {
                    "frame_index": frame_idx,
                    "timestamp_seconds": timestamp_seconds,
                    "landmarks": landmarks_dict,
                }
            )
            frame_idx += 1

        cap.release()
        detector.close()

        if len(raw_frames) == 0:
            raise ValueError("No video frames could be read from file.")

        # Apply temporal smoothing to coordinate trajectories
        smoothed_frames = self.apply_temporal_smoothing(
            raw_frames=raw_frames,
            method=smoothing_method,
            window_length=savgol_window,
            polyorder=savgol_polyorder,
        )

        return {
            "fps": fps,
            "duration_seconds": duration_seconds,
            "frame_count": len(raw_frames),
            "smoothing_method": smoothing_method,
            "frames": smoothed_frames,
        }

    def apply_temporal_smoothing(
        self,
        raw_frames: list[dict[str, Any]],
        method: str = "SAVITZKY_GOLAY",
        window_length: int = 7,
        polyorder: int = 2,
    ) -> list[dict[str, Any]]:
        """
        Apply Savitzky-Golay or Moving Average temporal filter across landmark coordinates.
        Preserves raw values alongside smoothed values.
        """
        n_frames = len(raw_frames)
        smoothed_frames: list[dict[str, Any]] = []

        # Prepare landmark trajectories
        landmark_trajectories: dict[str, dict[str, np.ndarray]] = {}

        for lm_name in LANDMARK_MAPPING.keys():
            xs = np.zeros(n_frames, dtype=np.float32)
            ys = np.zeros(n_frames, dtype=np.float32)
            zs = np.zeros(n_frames, dtype=np.float32)
            vis = np.zeros(n_frames, dtype=np.float32)

            for i, f in enumerate(raw_frames):
                lm = f["landmarks"].get(lm_name)
                if lm:
                    xs[i] = lm["x"]
                    ys[i] = lm["y"]
                    zs[i] = lm["z"]
                    vis[i] = lm["visibility"]

            landmark_trajectories[lm_name] = {
                "x": xs,
                "y": ys,
                "z": zs,
                "visibility": vis,
                "x_smooth": np.copy(xs),
                "y_smooth": np.copy(ys),
                "z_smooth": np.copy(zs),
            }

        # Apply smoothing when enough frames are present
        if n_frames >= 4:
            # Ensure window length is odd and <= n_frames
            effective_window = window_length if window_length % 2 != 0 else window_length - 1
            effective_window = min(effective_window, n_frames if n_frames % 2 != 0 else n_frames - 1)
            effective_window = max(3, effective_window)
            effective_poly = min(polyorder, effective_window - 1)

            for lm_name, data in landmark_trajectories.items():
                # Smooth if there is variance / detected values
                if np.count_nonzero(data["visibility"]) > 2:
                    if method == "SAVITZKY_GOLAY" and effective_window > effective_poly:
                        try:
                            data["x_smooth"] = savgol_filter(data["x"], effective_window, effective_poly)
                            data["y_smooth"] = savgol_filter(data["y"], effective_window, effective_poly)
                            data["z_smooth"] = savgol_filter(data["z"], effective_window, effective_poly)
                        except Exception as e:
                            logger.warning(f"Savitzky-Golay smoothing fallback: {e}")
                            kernel = np.ones(3) / 3.0
                            data["x_smooth"] = np.convolve(data["x"], kernel, mode="same")
                            data["y_smooth"] = np.convolve(data["y"], kernel, mode="same")
                            data["z_smooth"] = np.convolve(data["z"], kernel, mode="same")
                    else:
                        # Moving average filter
                        kernel = np.ones(3) / 3.0
                        data["x_smooth"] = np.convolve(data["x"], kernel, mode="same")
                        data["y_smooth"] = np.convolve(data["y"], kernel, mode="same")
                        data["z_smooth"] = np.convolve(data["z"], kernel, mode="same")

        # Reconstruct output frame dictionaries
        for i, f in enumerate(raw_frames):
            frame_raw = f["landmarks"]
            frame_smoothed: dict[str, dict[str, float]] = {}

            for lm_name in LANDMARK_MAPPING.keys():
                if lm_name in frame_raw:
                    frame_smoothed[lm_name] = {
                        "x": round(float(landmark_trajectories[lm_name]["x_smooth"][i]), 5),
                        "y": round(float(landmark_trajectories[lm_name]["y_smooth"][i]), 5),
                        "z": round(float(landmark_trajectories[lm_name]["z_smooth"][i]), 5),
                        "visibility": frame_raw[lm_name]["visibility"],
                    }

            smoothed_frames.append(
                {
                    "frame_index": f["frame_index"],
                    "timestamp_seconds": f["timestamp_seconds"],
                    "raw_landmarks": frame_raw,
                    "landmarks": frame_smoothed,
                }
            )

        return smoothed_frames


def get_pose_extractor() -> PoseExtractor:
    """Singleton/helper provider for PoseExtractor."""
    return PoseExtractor()
