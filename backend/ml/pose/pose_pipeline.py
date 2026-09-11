import os
import json
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from .pose_model import RTMPoseModel
from .tracker import PrimaryAthleteTracker
from .smoothing import KeypointSmoother
from .skeleton import COCO_KEYPOINT_NAMES

logger = logging.getLogger(__name__)

REQUIRED_BIOMECH_KEYPOINTS = [
    "left_shoulder", "right_shoulder",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle"
]

def is_anatomically_sane(keypoints: Dict[str, Dict[str, Any]], bbox: List[float]) -> bool:
    """
    Automated anatomical sanity check (Requirement 13).
    Rejects impossible poses (e.g. knee above shoulder, ankle far outside bbox).
    """
    l_sh = keypoints.get("left_shoulder")
    r_sh = keypoints.get("right_shoulder")
    l_knee = keypoints.get("left_knee")
    r_knee = keypoints.get("right_knee")

    # If knees and shoulders detected, knee Y should be below shoulder Y in screen space (Y increases downwards)
    if l_sh and l_knee and l_sh.get("confidence", 0.0) >= 0.35 and l_knee.get("confidence", 0.0) >= 0.35:
        if l_knee["y"] < l_sh["y"]: # Knee above shoulder -> Impossible
            return False

    if r_sh and r_knee and r_sh.get("confidence", 0.0) >= 0.35 and r_knee.get("confidence", 0.0) >= 0.35:
        if r_knee["y"] < r_sh["y"]: # Knee above shoulder -> Impossible
            return False

    # Check keypoints within bbox boundaries (+20% margin)
    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = bbox
        bw = max(10.0, x2 - x1)
        bh = max(10.0, y2 - y1)
        margin_x = bw * 0.3
        margin_y = bh * 0.3

        for kp in keypoints.values():
            if kp.get("confidence", 0.0) >= 0.35:
                kx, ky = kp["x"], kp["y"]
                if kx < (x1 - margin_x) or kx > (x2 + margin_x) or ky < (y1 - margin_y) or ky > (y2 + margin_y):
                    return False

    return True


class PosePipeline:
    """
    Coordinates pose detection, primary athlete tracking, anatomical sanity checks,
    temporal smoothing, and detailed logging across frame sequences.
    """
    def __init__(self, confidence_threshold: float = 0.35, min_cutoff: float = 1.0, beta: float = 0.007):
        self.confidence_threshold = confidence_threshold
        self.pose_model = RTMPoseModel(confidence_threshold=confidence_threshold)
        self.tracker = PrimaryAthleteTracker(iou_threshold=0.2)
        self.smoother = KeypointSmoother(min_cutoff=min_cutoff, beta=beta)

    def is_valid_pose(self, candidate: Dict[str, Any]) -> Tuple[bool, int, float]:
        """
        Determines if a candidate pose is valid (Requirement 2).
        Frame is valid if:
        1. person confidence >= 0.35
        2. AND at least 8 of 17 keypoints have confidence >= 0.35
           OR required biomechanics keypoints (shoulders, hips, knees, ankles) are valid.
        """
        person_conf = candidate.get("person_score", candidate.get("average_confidence", 0.0))
        if person_conf < self.confidence_threshold:
            return False, 0, 0.0

        keypoints = candidate.get("keypoints", {})
        valid_kps = [kp for kp in keypoints.values() if kp.get("confidence", 0.0) >= self.confidence_threshold]
        valid_count = len(valid_kps)

        valid_confs = [kp["confidence"] for kp in valid_kps]
        mean_valid_conf = float(np.mean(valid_confs)) if valid_confs else 0.0

        # Check required biomech keypoints
        biomech_valid_count = sum(
            1 for kp_name in REQUIRED_BIOMECH_KEYPOINTS
            if keypoints.get(kp_name, {}).get("confidence", 0.0) >= self.confidence_threshold
        )

        is_valid = (valid_count >= 8 or biomech_valid_count >= 6)
        return is_valid, valid_count, round(mean_valid_conf, 3)

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        frame_number: int,
        timestamp: float
    ) -> Optional[Dict[str, Any]]:
        if frame_bgr is None:
            return None

        h, w, _ = frame_bgr.shape

        # 1. Detect candidate people
        candidates = self.pose_model.estimate_pose(frame_bgr)
        if not candidates:
            logger.debug(f"FRAME {frame_number}: person_detected=False, valid_pose=False")
            return None

        # 2. Track primary athlete (person_id = 1)
        primary_athlete = self.tracker.track(candidates)
        if not primary_athlete:
            logger.debug(f"FRAME {frame_number}: person_detected=True, tracking_lost=True")
            return None

        raw_keypoints = primary_athlete["keypoints"]
        bbox = primary_athlete.get("bbox", [])

        # 3. Anatomical Sanity Check (Requirement 13)
        sane = is_anatomically_sane(raw_keypoints, bbox)
        if not sane:
            logger.warning(f"FRAME {frame_number}: Anatomical sanity check failed for candidate pose.")

        # 4. Valid Pose Definition (Requirement 2)
        valid_pose, num_valid_kps, mean_valid_conf = self.is_valid_pose(primary_athlete)

        # 5. Temporal Smoothing (One Euro Filter)
        smoothed_keypoints = self.smoother.smooth_keypoints(raw_keypoints, timestamp)

        # 6. Detailed Logging (Requirement 1)
        logger.info(
            f"FRAME {frame_number} (t={timestamp:.2f}s): person_detected=True, "
            f"person_confidence={primary_athlete.get('person_score', 0.0):.2f}, "
            f"num_keypoints=17, valid_keypoints={num_valid_kps}, "
            f"mean_confidence={mean_valid_conf:.2f}, valid_pose={valid_pose}, sane={sane}, "
            f"bbox={bbox}, orig_size={w}x{h}"
        )

        return {
            "frame_number": frame_number,
            "timestamp": round(timestamp, 2),
            "person_id": primary_athlete.get("person_id", 1),
            "person_confidence": round(primary_athlete.get("person_score", primary_athlete.get("average_confidence", 0.0)), 3),
            "valid_pose": valid_pose and sane,
            "valid_keypoints_count": num_valid_kps,
            "mean_valid_confidence": mean_valid_conf,
            "keypoints": raw_keypoints,
            "smoothed_keypoints": smoothed_keypoints,
            "bbox": bbox,
            "bounding_box": bbox,
            "average_confidence": primary_athlete.get("average_confidence", 0.0)
        }

    def close(self):
        self.pose_model.close()
