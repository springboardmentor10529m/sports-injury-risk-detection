"""
MediaPipe Pose Estimator Module
Extracts 33 body landmarks and provides skeleton drawing and coordinate normalization.
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class PoseEstimator:
    def __init__(
        self,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1
    ):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )

    def process_frame(self, frame_bgr: np.ndarray) -> Tuple[Optional[Dict[str, Any]], np.ndarray]:
        """
        Processes a single BGR image frame.
        Returns:
            (landmarks_dict, annotated_frame_bgr)
        """
        # Convert BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.pose.process(frame_rgb)
        
        annotated_frame = frame_bgr.copy()
        
        if not results.pose_landmarks:
            return None, annotated_frame

        # Draw skeleton landmarks on annotated frame
        self.mp_drawing.draw_landmarks(
            annotated_frame,
            results.pose_landmarks,
            self.mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
        )

        h, w, _ = frame_bgr.shape
        landmarks_raw = []
        named_landmarks = {}

        landmark_names = [
            "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
            "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
            "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT",
            "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW",
            "LEFT_WRIST", "RIGHT_WRIST", "LEFT_PINKY", "RIGHT_PINKY",
            "LEFT_INDEX", "RIGHT_INDEX", "LEFT_THUMB", "RIGHT_THUMB",
            "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE",
            "LEFT_ANKLE", "RIGHT_ANKLE", "LEFT_HEEL", "RIGHT_HEEL",
            "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX"
        ]

        for idx, lm in enumerate(results.pose_landmarks.landmark):
            lm_data = {
                "id": idx,
                "name": landmark_names[idx] if idx < len(landmark_names) else f"LM_{idx}",
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(lm.visibility),
                "pixel_x": int(lm.x * w),
                "pixel_y": int(lm.y * h)
            }
            landmarks_raw.append(lm_data)
            if idx < len(landmark_names):
                named_landmarks[landmark_names[idx]] = lm_data

        return {
            "all_landmarks": landmarks_raw,
            "keypoints": named_landmarks
        }, annotated_frame

    def close(self):
        """Releases MediaPipe resources."""
        if hasattr(self, "pose") and self.pose:
            self.pose.close()
