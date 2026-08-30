"""
Pose Service — MediaPipe Pose Keypoint Extraction & Skeletal Visualization
Week 3 Implementation
"""
import os
import math
import cv2
import numpy as np
import urllib.request
from typing import Dict, Any, List, Tuple, Optional

# MediaPipe Task API check
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.vision import PoseLandmark
    HAS_MEDIAPIPE = True
except Exception:
    HAS_MEDIAPIPE = False

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
MODEL_PATH = "pose_landmarker_full.task"

# MediaPipe 33 Landmark Indices
KEYPOINT_MAP = {
    0: "nose",
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow",    14: "right_elbow",
    15: "left_wrist",    16: "right_wrist",
    23: "left_hip",      24: "right_hip",
    25: "left_knee",     26: "right_knee",
    27: "left_ankle",    28: "right_ankle",
    29: "left_heel",     30: "right_heel",
    31: "left_foot_index", 32: "right_foot_index"
}

# Skeleton Bone Connections
SKELETON_CONNECTIONS = [
    # Torso & Shoulders
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    # Left Arm
    ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"),
    # Right Arm
    ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"),
    # Left Leg
    ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"),
    ("left_ankle", "left_heel"),
    ("left_heel", "left_foot_index"),
    # Right Leg
    ("right_hip", "right_knee"),
    ("right_knee", "right_ankle"),
    ("right_ankle", "right_heel"),
    ("right_heel", "right_foot_index")
]

class PoseService:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.has_mediapipe = HAS_MEDIAPIPE
        self._ensure_model_file()

    def _ensure_model_file(self) -> bool:
        """Download MediaPipe task model if missing."""
        if not os.path.exists(self.model_path):
            try:
                print(f"Downloading MediaPipe model to {self.model_path}...")
                req = urllib.request.Request(MODEL_URL, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(self.model_path, 'wb') as out_file:
                    out_file.write(response.read())
                return True
            except Exception as e:
                print(f"Failed to download MediaPipe pose landmarker: {str(e)}")
                return False
        return True

    def calculate_2d_angle(self, a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
        """Calculate joint angle in degrees at vertex b between lines ab and bc."""
        a_arr = np.array(a)
        b_arr = np.array(b)
        c_arr = np.array(c)

        radians = np.arctan2(c_arr[1] - b_arr[1], c_arr[0] - b_arr[0]) - np.arctan2(a_arr[1] - b_arr[1], a_arr[0] - b_arr[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0:
            angle = 360.0 - angle
        return round(float(angle), 1)

    def draw_skeleton_overlay(
        self,
        frame: np.ndarray,
        landmarks_dict: Dict[str, Dict[str, float]],
        knee_angles: Optional[Tuple[float, float]] = None,
        trunk_lean: Optional[float] = None,
        frame_idx: Optional[int] = None,
        confidence: Optional[float] = None
    ) -> np.ndarray:
        """Renders skeleton bones, joint dots, HUD metrics, and landmark tags on an OpenCV BGR frame."""
        h, w, _ = frame.shape
        pixel_coords = {}

        # 0. Draw top HUD info box if frame_idx or confidence provided
        if frame_idx is not None or confidence is not None:
            cv2.rectangle(frame, (10, 10), (220, 50), (15, 23, 42), -1)
            cv2.rectangle(frame, (10, 10), (220, 50), (6, 182, 212), 1)
            hud_text = f"Frame: {frame_idx if frame_idx is not None else 0}"
            if confidence is not None:
                hud_text += f" | Conf: {confidence:.2f}"
            cv2.putText(frame, hud_text, (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        # 1. Calculate joint pixel coordinates
        for joint_name, data in landmarks_dict.items():
            px = int(data["x"] * w)
            py = int(data["y"] * h)
            pixel_coords[joint_name] = (px, py)

        # 2. Draw connections (bones)
        for p1, p2 in SKELETON_CONNECTIONS:
            if p1 in pixel_coords and p2 in pixel_coords:
                pt1 = pixel_coords[p1]
                pt2 = pixel_coords[p2]
                
                # Color code: cyan for legs, emerald for torso/arms
                if "knee" in p1 or "ankle" in p1 or "knee" in p2 or "ankle" in p2:
                    color = (255, 230, 0) # Cyan (BGR)
                    thickness = 3
                else:
                    color = (100, 255, 100) # Emerald green
                    thickness = 2
                cv2.line(frame, pt1, pt2, color, thickness, cv2.LINE_AA)

        # 3. Draw joint keypoint nodes
        for joint_name, pt in pixel_coords.items():
            if "knee" in joint_name:
                cv2.circle(frame, pt, 7, (0, 0, 255), -1, cv2.LINE_AA) # Red circle for knees
                cv2.circle(frame, pt, 9, (255, 255, 255), 2, cv2.LINE_AA)
            elif "hip" in joint_name or "ankle" in joint_name:
                cv2.circle(frame, pt, 6, (0, 215, 255), -1, cv2.LINE_AA) # Gold/Amber
            else:
                cv2.circle(frame, pt, 4, (255, 255, 255), -1, cv2.LINE_AA)

        # 4. Draw Angle Text Labels
        if knee_angles:
            l_knee_angle, r_knee_angle = knee_angles
            if "left_knee" in pixel_coords:
                lx, ly = pixel_coords["left_knee"]
                cv2.putText(frame, f"L Knee: {l_knee_angle:.1f}deg", (lx + 10, ly - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 2, cv2.LINE_AA)
            if "right_knee" in pixel_coords:
                rx, ry = pixel_coords["right_knee"]
                cv2.putText(frame, f"R Knee: {r_knee_angle:.1f}deg", (rx + 10, ry - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 2, cv2.LINE_AA)

        if trunk_lean is not None and "left_shoulder" in pixel_coords:
            sx, sy = pixel_coords["left_shoulder"]
            cv2.putText(frame, f"Trunk Lean: {trunk_lean:.1f}deg", (sx - 40, sy - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 200, 100), 2, cv2.LINE_AA)

        return frame

    def process_frame(
        self,
        frame_rgb: np.ndarray,
        detector: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Extract 33 MediaPipe pose keypoints from RGB numpy image array."""
        h, w, _ = frame_rgb.shape
        landmarks_data = {}
        pose_confidence = 0.0

        if self.has_mediapipe and detector is not None:
            try:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                result = detector.detect(mp_image)

                if result and result.pose_landmarks and len(result.pose_landmarks) > 0:
                    pose = result.pose_landmarks[0]
                    conf_sum = 0.0

                    for idx, name in KEYPOINT_MAP.items():
                        if idx < len(pose):
                            lm = pose[idx]
                            visibility = getattr(lm, "visibility", 0.9)
                            presence = getattr(lm, "presence", 0.9)
                            conf = (visibility + presence) / 2.0
                            conf_sum += conf
                            
                            landmarks_data[name] = {
                                "x": float(lm.x),
                                "y": float(lm.y),
                                "z": float(lm.z),
                                "visibility": round(float(conf), 3)
                            }

                    pose_confidence = round(conf_sum / max(1, len(landmarks_data)), 3)
            except Exception as err:
                print(f"MediaPipe detection error on frame: {err}")

        return {
            "has_landmarks": len(landmarks_data) > 0,
            "confidence": pose_confidence,
            "landmarks": landmarks_data
        }

pose_service = PoseService()
