import os
import math
import numpy as np
import cv2
import logging
from typing import Dict, List, Any, Tuple
from ml.pose.pose_pipeline import PosePipeline
from ml.pose.skeleton import SKELETON_CONNECTIONS, COCO_KEYPOINT_NAMES
from ml.biomechanics.feature_extractor import BiomechanicsFeatureExtractor

logger = logging.getLogger(__name__)

class PoseEstimationEngine:
    """
    Real Pretrained RTMPose-M COCO 17-Keypoint Pose Estimation Engine.
    Processes video frames with person detection, tracking, temporal smoothing,
    and 3-point joint angle biomechanics.
    """

    def __init__(self, confidence_threshold: float = 0.35):
        self.confidence_threshold = confidence_threshold

    def process_video(self, video_path: str, sample_fps: int = 15) -> Dict[str, Any]:
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at '{video_path}'")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file '{video_path}'")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
        duration = total_frames / fps if fps > 0 else 0.0

        step = max(1, int(round(fps / sample_fps)))

        pipeline = PosePipeline(confidence_threshold=self.confidence_threshold)
        feature_extractor = BiomechanicsFeatureExtractor()

        frames_data = []
        confidences = []

        frame_idx = 0
        processed_count = 0
        valid_pose_count = 0

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % step == 0:
                    timestamp_sec = round(frame_idx / fps, 3)

                    # Real RTMPose-M deep learning inference
                    pose_result = pipeline.process_frame(frame, frame_idx, timestamp_sec)

                    if pose_result and pose_result.get("keypoints"):
                        valid_pose_count += 1
                        avg_conf = pose_result.get("average_confidence", 0.0)
                        confidences.append(avg_conf)

                        kps = pose_result.get("smoothed_keypoints") or pose_result.get("keypoints", {})

                        # Extract biomechanics
                        bio_data = feature_extractor.process_frame(kps, frame_width, frame_height, timestamp_sec)

                        formatted_kps = {}
                        for kp_name, kp_val in kps.items():
                            formatted_kps[kp_name] = {
                                "name": kp_name,
                                "x": round(kp_val.get("x", 0.0) / float(frame_width), 4),
                                "y": round(kp_val.get("y", 0.0) / float(frame_height), 4),
                                "pixel_x": kp_val.get("x", 0.0),
                                "pixel_y": kp_val.get("y", 0.0),
                                "visibility": kp_val.get("confidence", 0.9)
                            }

                        frames_data.append({
                            "frame_index": frame_idx,
                            "timestamp": timestamp_sec,
                            "person_id": pose_result.get("person_id", 1),
                            "average_confidence": avg_conf,
                            "bbox": pose_result.get("bounding_box", []),
                            "keypoints": formatted_kps,
                            "joint_angles": bio_data["joint_angles"],
                            "kinematics": bio_data["kinematics"],
                            "symmetry": bio_data["symmetry"]
                        })

                    processed_count += 1

                frame_idx += 1
        finally:
            cap.release()
            pipeline.close()

        mean_confidence = float(np.mean(confidences)) if confidences else 0.0
        valid_pose_ratio = (valid_pose_count / float(processed_count)) if processed_count > 0 else 0.0

        return {
            "status": "success",
            "pipeline_type": "AI Pose Estimation Pipeline (RTMPose-M COCO 17-Keypoint Model)",
            "video_metadata": {
                "duration": round(duration, 2),
                "fps": round(fps, 1),
                "resolution": f"{frame_width}x{frame_height}",
                "total_frames": total_frames,
                "processed_frames": processed_count,
                "valid_pose_frames": valid_pose_count,
                "valid_pose_frame_ratio": round(valid_pose_ratio, 3)
            },
            "pose_quality": {
                "average_pose_confidence": round(mean_confidence, 3),
                "pose_quality_score_pct": int(mean_confidence * 100),
                "tracked_frames": processed_count,
                "valid_pose_frames": valid_pose_count
            },
            "skeleton_topology": SKELETON_CONNECTIONS,
            "coco_keypoint_names": COCO_KEYPOINT_NAMES,
            "frames": frames_data
        }

pose_engine = PoseEstimationEngine()
