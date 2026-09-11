from typing import List, Dict, Any, Optional
import numpy as np

def calculate_iou(boxA: List[float], boxB: List[float]) -> float:
    """
    Calculate Intersection over Union (IoU) of two bounding boxes [x1, y1, x2, y2].
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea == 0.0:
        return 0.0

    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    iou = interArea / float(boxAArea + boxBArea - interArea + 1e-6)
    return float(iou)


class PrimaryAthleteTracker:
    """
    Tracks the primary athlete across video frames using BBox area, pose confidence,
    and temporal IoU / centroid proximity to ensure person_id=1 remains sticky.
    """
    def __init__(self, iou_threshold: float = 0.2):
        self.iou_threshold = iou_threshold
        self.last_bbox: Optional[List[float]] = None
        self.tracked_person_id: int = 1

    def track(self, candidate_poses: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Given a list of detected person poses in a frame, returns the primary athlete's pose dict.
        Candidate pose format:
        {
            "bbox": [x1, y1, x2, y2],
            "keypoints": {...},
            "average_confidence": 0.85
        }
        """
        if not candidate_poses:
            return None

        # If only 1 candidate, select it
        if len(candidate_poses) == 1:
            chosen = candidate_poses[0]
            chosen["person_id"] = self.tracked_person_id
            self.last_bbox = chosen["bbox"]
            return chosen

        # If we have a previous tracking history, prioritize highest IoU with previous bbox
        if self.last_bbox is not None:
            best_iou = -1.0
            best_candidate = None

            for cand in candidate_poses:
                iou = calculate_iou(self.last_bbox, cand["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_candidate = cand

            if best_candidate and best_iou >= self.iou_threshold:
                best_candidate["person_id"] = self.tracked_person_id
                self.last_bbox = best_candidate["bbox"]
                return best_candidate

        # Fallback for initial frame or lost tracking: rank by score = area * confidence
        best_score = -1.0
        best_candidate = None

        for cand in candidate_poses:
            bbox = cand["bbox"]
            area = max(0.0, bbox[2] - bbox[0]) * max(0.0, bbox[3] - bbox[1])
            conf = cand.get("average_confidence", 0.5)
            score = area * conf

            if score > best_score:
                best_score = score
                best_candidate = cand

        if best_candidate:
            best_candidate["person_id"] = self.tracked_person_id
            self.last_bbox = best_candidate["bbox"]
            return best_candidate

        return None
