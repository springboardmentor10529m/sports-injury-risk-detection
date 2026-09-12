import logging
import os
import cv2
import numpy as np
import torch
from typing import List, Dict, Any, Optional
from ..device import get_device
from .skeleton import COCO_KEYPOINT_NAMES

logger = logging.getLogger(__name__)

class RTMPoseModel:
    """
    Genuine RTMPose-M ONNX Deep Learning Human Pose Estimator (OpenMMLab).
    Primary engine: RTMPose-M SimCC ONNX via rtmlib on onnxruntime.
    Fallback engine: Torchvision Keypoint R-CNN (ResNet-50 FPN).
    Outputs 17 standard COCO keypoints [x, y, confidence] mapped to original frame coordinates.
    """
    def __init__(self, model_name: str = "rtmpose-m", confidence_threshold: float = 0.35):
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.device_str = get_device()
        self.active_backend = "none"
        self.rtm_body = None
        self.torch_model = None
        self._init_models()

    def _init_models(self):
        # 1. Attempt genuine RTMPose-M ONNX via rtmlib
        try:
            logger.info(f"[POSE] Initializing genuine RTMPose-M ONNX via rtmlib...")
            from rtmlib import Body
            device = "cpu" if self.device_str == "cpu" else "cuda"
            self.rtm_body = Body(mode="balanced", to_openpose=False, device=device)
            self.active_backend = "rtmpose-m-onnx"
            logger.info("[POSE] Successfully initialized RTMPose-M ONNX engine.")
            return
        except Exception as e:
            logger.warning(f"[POSE] Could not load RTMPose-M via rtmlib: {e}. Falling back to Keypoint R-CNN.")

        # 2. Fallback to Torchvision Keypoint R-CNN
        try:
            logger.info(f"[POSE] Initializing Torchvision Keypoint R-CNN fallback on {self.device_str}...")
            from torchvision.models.detection import keypointrcnn_resnet50_fpn, KeypointRCNN_ResNet50_FPN_Weights
            self.torch_device = torch.device(self.device_str)
            self.torch_model = keypointrcnn_resnet50_fpn(weights=KeypointRCNN_ResNet50_FPN_Weights.DEFAULT)
            self.torch_model.to(self.torch_device)
            self.torch_model.eval()
            self.active_backend = "keypoint-rcnn-torchvision"
            logger.info("[POSE] Keypoint R-CNN fallback initialized successfully.")
        except Exception as e:
            logger.error(f"[POSE] Error initializing pose estimator: {e}", exc_info=True)
            self.active_backend = "none"

    def estimate_pose(self, frame_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Processes a single OpenCV BGR image frame (H, W, 3).
        Detects people and outputs 17 COCO keypoints mapped to original frame pixel coordinates.
        """
        if frame_bgr is None:
            return []

        h, w, _ = frame_bgr.shape

        # Run RTMPose-M ONNX if active
        if self.active_backend == "rtmpose-m-onnx" and self.rtm_body is not None:
            try:
                kps_arr, scores_arr = self.rtm_body(frame_bgr)
                # kps_arr shape: [num_persons, 17, 2], scores_arr shape: [num_persons, 17]
                if len(kps_arr) == 0:
                    return []

                candidates = []
                for p_idx in range(len(kps_arr)):
                    p_kps = kps_arr[p_idx]
                    p_scores = scores_arr[p_idx] if scores_arr is not None else np.ones(17)

                    # Compute bounding box from detected keypoints
                    valid_mask = p_scores >= self.confidence_threshold
                    if np.any(valid_mask):
                        vx = p_kps[valid_mask, 0]
                        vy = p_kps[valid_mask, 1]
                        pad_x = max(10.0, (vx.max() - vx.min()) * 0.15)
                        pad_y = max(10.0, (vy.max() - vy.min()) * 0.15)
                        bbox = [
                            float(max(0.0, vx.min() - pad_x)),
                            float(max(0.0, vy.min() - pad_y)),
                            float(min(w, vx.max() + pad_x)),
                            float(min(h, vy.max() + pad_y))
                        ]
                    else:
                        bbox = [0.0, 0.0, float(w), float(h)]

                    kps_dict = {}
                    confidences = []
                    for idx, kp_name in enumerate(COCO_KEYPOINT_NAMES):
                        px = float(p_kps[idx][0])
                        py = float(p_kps[idx][1])
                        conf = float(p_scores[idx])

                        px = max(0.0, min(float(w), px))
                        py = max(0.0, min(float(h), py))

                        kps_dict[kp_name] = {
                            "x": round(px, 1),
                            "y": round(py, 1),
                            "confidence": round(conf, 3)
                        }
                        if conf >= self.confidence_threshold:
                            confidences.append(conf)

                    avg_conf = float(np.mean(confidences)) if confidences else float(np.mean(p_scores))
                    candidates.append({
                        "bbox": bbox,
                        "keypoints": kps_dict,
                        "average_confidence": round(avg_conf, 3),
                        "person_score": round(avg_conf, 3),
                        "model_used": "RTMPose-M (ONNX)"
                    })

                return candidates

            except Exception as e:
                logger.warning(f"[POSE] RTMPose-M execution error: {e}. Falling back to PyTorch.")

        # Fallback to Keypoint R-CNN
        if self.torch_model is not None:
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            tensor_img = torch.from_numpy(rgb).permute(2, 0, 1).float() / 255.0
            tensor_img = tensor_img.to(self.torch_device)

            with torch.no_grad():
                outputs = self.torch_model([tensor_img])[0]

            boxes = outputs["boxes"].cpu().numpy()
            labels = outputs["labels"].cpu().numpy()
            scores = outputs["scores"].cpu().numpy()
            keypoints_tensor = outputs["keypoints"].cpu().numpy()
            kp_scores = outputs.get("keypoint_scores", None)
            if kp_scores is not None:
                kp_scores = kp_scores.cpu().numpy()

            candidates = []
            for i in range(len(boxes)):
                if labels[i] != 1 or scores[i] < self.confidence_threshold:
                    continue

                bbox = [float(boxes[i][0]), float(boxes[i][1]), float(boxes[i][2]), float(boxes[i][3])]
                kps_raw = keypoints_tensor[i]
                kps_dict = {}
                confidences = []

                for idx, kp_name in enumerate(COCO_KEYPOINT_NAMES):
                    px = float(kps_raw[idx][0])
                    py = float(kps_raw[idx][1])
                    conf = float(kp_scores[i][idx]) if kp_scores is not None and len(kp_scores) > i else float(kps_raw[idx][2])

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
                    "person_score": float(scores[i]),
                    "model_used": "Keypoint R-CNN (Torchvision)"
                })

            return candidates

        return []

    def close(self):
        if self.torch_model is not None:
            del self.torch_model
            self.torch_model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        if self.rtm_body is not None:
            del self.rtm_body
            self.rtm_body = None
