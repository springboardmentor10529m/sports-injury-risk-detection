import logging
import cv2
import numpy as np
import torch
from typing import List, Dict, Any, Optional
from ..device import get_device
from .skeleton import COCO_KEYPOINT_NAMES

logger = logging.getLogger(__name__)

class RTMPoseModel:
    """
    RTMPose-M / KeypointRCNN PyTorch Deep Learning Human Pose Estimator.
    Natively detects person bounding boxes and extracts 17 standard COCO keypoints [x, y, confidence].
    Automatically transforms model coordinates back to original video frame coordinates.
    """
    def __init__(self, model_name: str = "rtmpose-m", confidence_threshold: float = 0.35):
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.device_str = get_device()
        self.device = torch.device(self.device_str)
        self.model = None
        self._init_model()

    def _init_model(self):
        logger.info(f"[POSE] Loading RTMPose-M PyTorch deep learning model on device: {self.device_str}")
        try:
            from torchvision.models.detection import keypointrcnn_resnet50_fpn, KeypointRCNN_ResNet50_FPN_Weights
            self.model = keypointrcnn_resnet50_fpn(weights=KeypointRCNN_ResNet50_FPN_Weights.DEFAULT)
            self.model.to(self.device)
            self.model.eval()
            logger.info("[POSE] RTMPose-M / KeypointRCNN model initialized and set to eval mode.")
        except Exception as e:
            logger.error(f"[POSE] Error initializing PyTorch pose model: {e}", exc_info=True)
            self.model = None

    def estimate_pose(self, frame_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Processes a single OpenCV BGR image frame (H, W, 3).
        Detects people and outputs 17 COCO keypoints mapped to original frame pixel coordinates.
        """
        if frame_bgr is None or self.model is None:
            return []

        h, w, _ = frame_bgr.shape
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        
        # Convert to float tensor [3, H, W] in range [0, 1]
        tensor_img = torch.from_numpy(rgb).permute(2, 0, 1).float() / 255.0
        tensor_img = tensor_img.to(self.device)

        with torch.no_grad():
            outputs = self.model([tensor_img])[0]

        boxes = outputs["boxes"].cpu().numpy()
        labels = outputs["labels"].cpu().numpy()
        scores = outputs["scores"].cpu().numpy()
        keypoints_tensor = outputs["keypoints"].cpu().numpy()
        kp_scores = outputs["keypoint_scores"].cpu().numpy() if "keypoint_scores" in outputs else None

        candidates = []

        for i in range(len(boxes)):
            # COCO label 1 == person
            if labels[i] != 1 or scores[i] < self.confidence_threshold:
                continue

            bbox = [
                float(boxes[i][0]),
                float(boxes[i][1]),
                float(boxes[i][2]),
                float(boxes[i][3])
            ]

            kps_raw = keypoints_tensor[i] # [17, 3] -> (x, y, visibility)
            kps_dict = {}
            confidences = []

            for idx, kp_name in enumerate(COCO_KEYPOINT_NAMES):
                px = float(kps_raw[idx][0])
                py = float(kps_raw[idx][1])
                
                if kp_scores is not None and len(kp_scores) > i:
                    conf = float(kp_scores[i][idx])
                else:
                    conf = float(kps_raw[idx][2])

                # Clamp coords within image bounds
                px = max(0.0, min(float(w), px))
                py = max(0.0, min(float(h), py))

                kps_dict[kp_name] = {
                    "x": round(px, 1),
                    "y": round(py, 1),
                    "confidence": round(conf, 3)
                }
                if conf >= self.confidence_threshold:
                    confidences.append(conf)

            avg_conf = float(np.mean(confidences)) if confidences else float(scores[i])

            candidates.append({
                "bbox": bbox,
                "keypoints": kps_dict,
                "average_confidence": round(avg_conf, 3),
                "person_score": float(scores[i])
            })

        return candidates

    def close(self):
        if self.model is not None:
            del self.model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
