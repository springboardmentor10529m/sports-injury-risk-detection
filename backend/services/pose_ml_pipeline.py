import os
import json
import time
import cv2
import logging
import numpy as np
from typing import Dict, List, Any
from ml.pose.pose_pipeline import PosePipeline
from ml.pose.skeleton import SKELETON_CONNECTIONS, COCO_KEYPOINT_NAMES
from ml.biomechanics.feature_extractor import BiomechanicsFeatureExtractor

logger = logging.getLogger(__name__)

RESULTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pose_results"))

class PoseMLPipeline:
    """
    Real Pretrained RTMPose-M COCO 17-Keypoint Estimation & Biomechanics Engine.
    Processes video frames, extracts real RTMPose detections, calculates exact pose quality metrics,
    and persists full JSON results to backend/pose_results/video_<id>.json.
    """

    def __init__(self, confidence_threshold: float = 0.35):
        self.confidence_threshold = confidence_threshold
        os.makedirs(RESULTS_DIR, exist_ok=True)

    def get_model_info(self) -> Dict[str, Any]:
        """Returns metadata for the active RTMPose-M model pipeline."""
        return {
            "status": "active",
            "model_name": "RTMPose Human Pose Estimation (RTMPose-M)",
            "pipeline_description": "RTMPose-M • COCO 17-Keypoint Model with One Euro Filter Smoothing",
            "keypoints_count": 17,
            "coco_keypoint_names": COCO_KEYPOINT_NAMES,
            "confidence_threshold": self.confidence_threshold
        }

    def process_video_ml(self, video_path: str, video_id: str = "default", sample_fps: int = 15) -> Dict[str, Any]:
        """
        Runs real pretrained RTMPose-M pose estimation frame-by-frame on video.
        Outputs 17 COCO keypoint coordinates, tracking bounding boxes, and biomechanics.
        """
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
        valid_confidences = []

        frame_idx = 0
        processed_count = 0
        valid_pose_count = 0
        tracked_count = 0

        t0 = time.time()

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % step == 0:
                    timestamp_sec = round(frame_idx / fps, 3)

                    # 1. Real RTMPose-M inference + primary athlete tracking + smoothing
                    pose_result = pipeline.process_frame(frame, frame_idx, timestamp_sec)

                    if pose_result and pose_result.get("keypoints"):
                        processed_count += 1
                        is_valid = pose_result.get("valid_pose", False)

                        if is_valid:
                            valid_pose_count += 1
                            mean_conf = pose_result.get("mean_valid_confidence", 0.0)
                            valid_confidences.append(mean_conf)

                        if pose_result.get("person_id") == 1:
                            tracked_count += 1

                        kps = pose_result.get("smoothed_keypoints") or pose_result.get("keypoints", {})

                        # 2. Extract Biomechanics
                        bio_data = feature_extractor.process_frame(kps, frame_width, frame_height, timestamp_sec)

                        # 3. Format keypoints as an array in strict COCO 0..16 index order (Requirement 6 & 7)
                        kps_list = []
                        kps_map_dict = {}

                        for idx, kp_name in enumerate(COCO_KEYPOINT_NAMES):
                            kp_val = kps.get(kp_name, {})
                            px = kp_val.get("x", 0.0)
                            py = kp_val.get("y", 0.0)
                            conf = kp_val.get("confidence", 0.0)

                            kp_item = {
                                "id": idx,
                                "name": kp_name,
                                "x": round(px / float(frame_width), 4), # Normalized coordinate (0..1)
                                "y": round(py / float(frame_height), 4),
                                "pixel_x": round(px, 1),
                                "pixel_y": round(py, 1),
                                "confidence": round(conf, 3),
                                "visibility": round(conf, 3)
                            }
                            kps_list.append(kp_item)
                            kps_map_dict[kp_name] = kp_item

                        frames_data.append({
                            "frame_index": frame_idx,
                            "timestamp": timestamp_sec,
                            "person_id": pose_result.get("person_id", 1),
                            "person_confidence": pose_result.get("person_confidence", 0.0),
                            "valid_pose": is_valid,
                            "bbox": pose_result.get("bounding_box", []),
                            "keypoints": kps_list, # Strict Array order 0..16
                            "keypoints_dict": kps_map_dict,
                            "joint_angles": bio_data["joint_angles"],
                            "kinematics": bio_data["kinematics"],
                            "symmetry": bio_data["symmetry"]
                        })

                frame_idx += 1
        finally:
            cap.release()
            pipeline.close()

        inference_time = max(0.01, time.time() - t0)
        actual_analysis_fps = round(processed_count / inference_time, 1)

        mean_confidence = float(np.mean(valid_confidences)) if valid_confidences else 0.0
        pose_quality_display = f"{int(round(mean_confidence * 100))}%" if valid_pose_count > 0 else "N/A"

        result_payload = {
            "status": "success",
            "model": "RTMPose-M",
            "keypoint_format": "COCO-17",
            "pipeline_type": "AI Pose Estimation Pipeline (RTMPose-M COCO 17-Keypoint Model)",
            "video_metadata": {
                "video_id": video_id,
                "duration": round(duration, 2),
                "fps": round(fps, 1),
                "resolution": f"{frame_width}x{frame_height}",
                "total_frames": total_frames,
                "processed_frames": processed_count,
                "valid_pose_frames": valid_pose_count,
                "tracked_frames": tracked_count,
                "analysis_fps": actual_analysis_fps
            },
            "pose_quality": {
                "mean_keypoint_confidence": round(mean_confidence, 3),
                "pose_quality_display": pose_quality_display,
                "processed_frames": processed_count,
                "valid_pose_frames": valid_pose_count,
                "tracked_frames": tracked_count
            },
            "skeleton_topology": SKELETON_CONNECTIONS,
            "coco_keypoint_names": COCO_KEYPOINT_NAMES,
            "frames": frames_data
        }

        # Save actual JSON result file to backend/pose_results/video_<id>.json (Requirement 6)
        out_json_path = os.path.join(RESULTS_DIR, f"video_{video_id}.json")
        try:
            with open(out_json_path, "w", encoding="utf-8") as f:
                json.dump(result_payload, f, indent=2)
            logger.info(f"[POSE] Saved full RTMPose JSON result to {out_json_path}")
        except Exception as e:
            logger.error(f"[POSE] Failed to save JSON result: {e}")

        return result_payload

pose_ml_pipeline = PoseMLPipeline()
