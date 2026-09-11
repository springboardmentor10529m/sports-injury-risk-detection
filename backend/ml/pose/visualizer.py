import cv2
import numpy as np
from typing import Dict, Any, Optional
from .skeleton import SKELETON_CONNECTIONS, CONNECTION_COLORS, COCO_KEYPOINT_NAMES

class SkeletonVisualizer:
    """
    Renders skeleton overlays, 17 COCO keypoints, bounding boxes, and athlete telemetry onto OpenCV frames.
    Strictly filters out low-confidence keypoints (< 0.35) to prevent invalid bone drawing.
    """
    def __init__(self, confidence_threshold: float = 0.35):
        self.confidence_threshold = confidence_threshold

    def draw_skeleton(
        self,
        frame: np.ndarray,
        pose_data: Optional[Dict[str, Any]],
        frame_number: int,
        timestamp: float,
        debug_mode: bool = False
    ) -> np.ndarray:
        if frame is None:
            return frame

        canvas = frame.copy()
        if not pose_data or "keypoints" not in pose_data:
            self._draw_telemetry_box(canvas, person_id="None", confidence=0.0, frame_number=frame_number, timestamp=timestamp, active=False)
            return canvas

        keypoints = pose_data.get("smoothed_keypoints") or pose_data.get("keypoints", {})
        bbox = pose_data.get("bbox") or pose_data.get("bounding_box")
        person_id = pose_data.get("person_id", 1)
        avg_conf = pose_data.get("average_confidence", 0.0)

        # 1. Draw Bounding Box (Primary Athlete Lock)
        if bbox and len(bbox) == 4:
            x1, y1, x2, y2 = [int(round(v)) for v in bbox]
            # Ensure valid bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(canvas.shape[1] - 1, x2), min(canvas.shape[0] - 1, y2)
            
            # Subtle corner-accent or rectangular bounding box
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (0, 255, 128), 2)
            
            # Label banner
            label_text = f"Athlete #{person_id} ({int(avg_conf * 100)}%)"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
            bg_y1 = max(0, y1 - th - 10)
            cv2.rectangle(canvas, (x1, bg_y1), (x1 + tw + 12, y1), (15, 25, 20), -1)
            cv2.rectangle(canvas, (x1, bg_y1), (x1 + tw + 12, y1), (0, 255, 128), 1)
            cv2.putText(
                canvas,
                label_text,
                (x1 + 6, max(th + 4, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 255, 128),
                2,
                cv2.LINE_AA
            )

        # 2. Draw Skeleton Bones ONLY IF both endpoints meet confidence threshold (Requirement 8)
        for idx, (idx1, idx2) in enumerate(SKELETON_CONNECTIONS):
            name1, name2 = COCO_KEYPOINT_NAMES[idx1], COCO_KEYPOINT_NAMES[idx2]
            kp1, kp2 = keypoints.get(name1), keypoints.get(name2)

            if kp1 and kp2:
                conf1 = kp1.get("confidence", 0.0)
                conf2 = kp2.get("confidence", 0.0)

                # Strict confidence filtering for both keypoints before connecting bone
                if conf1 >= self.confidence_threshold and conf2 >= self.confidence_threshold:
                    pt1 = (int(round(kp1["x"])), int(round(kp1["y"])))
                    pt2 = (int(round(kp2["x"])), int(round(kp2["y"])))
                    color = CONNECTION_COLORS[idx % len(CONNECTION_COLORS)]
                    cv2.line(canvas, pt1, pt2, color, 3, cv2.LINE_AA)

        # 3. Draw 17 COCO Keypoints (Joint Dots)
        for idx, kp_name in enumerate(COCO_KEYPOINT_NAMES):
            kp_data = keypoints.get(kp_name)
            if not kp_data:
                continue

            conf = kp_data.get("confidence", 0.0)
            if conf >= self.confidence_threshold:
                px, py = int(round(kp_data["x"])), int(round(kp_data["y"]))
                
                # Joint circle
                cv2.circle(canvas, (px, py), 5, (0, 255, 0), -1, cv2.LINE_AA)
                cv2.circle(canvas, (px, py), 6, (255, 255, 255), 1, cv2.LINE_AA)

                # Debug Mode: Render keypoint index, name, and confidence next to point (Requirement 5)
                if debug_mode:
                    label = f"{idx}:{kp_name} ({int(conf * 100)}%)"
                    cv2.putText(
                        canvas,
                        label,
                        (px + 8, py + 4),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.35,
                        (0, 255, 255),
                        1,
                        cv2.LINE_AA
                    )

        # 4. Telemetry Header Box
        self._draw_telemetry_box(canvas, person_id=person_id, confidence=avg_conf, frame_number=frame_number, timestamp=timestamp, active=True)

        return canvas

    def _draw_telemetry_box(
        self,
        canvas: np.ndarray,
        person_id: Any,
        confidence: float,
        frame_number: int,
        timestamp: float,
        active: bool = True
    ):
        h, w, _ = canvas.shape
        # Responsive sizing for full HD frames
        scale = max(0.9, min(w / 1280.0, 1.4))
        box_w = int(360 * scale)
        box_h = int(120 * scale)
        margin = int(15 * scale)

        overlay = canvas.copy()
        cv2.rectangle(overlay, (margin, margin), (margin + box_w, margin + box_h), (12, 16, 24), -1)
        cv2.addWeighted(overlay, 0.82, canvas, 0.18, 0, canvas)
        border_color = (0, 215, 255) if active else (100, 110, 120)
        cv2.rectangle(canvas, (margin, margin), (margin + box_w, margin + box_h), border_color, 1)

        conf_pct = int(confidence * 100)
        font_scale = 0.52 * scale
        lh = int(24 * scale)

        x_text = margin + int(14 * scale)
        y_text = margin + int(24 * scale)

        # Line 1: AI Pose Engine
        cv2.putText(canvas, "AI Pose Engine: RTMPose-M", (x_text, y_text), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 215, 255), 1, cv2.LINE_AA)
        
        # Line 2: Detected Athlete
        y_text += lh
        if active and person_id not in (None, "None"):
            cv2.putText(canvas, f"Detected Athlete: Athlete #{person_id} (Locked)", (x_text, y_text), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 1, cv2.LINE_AA)
        else:
            cv2.putText(canvas, "Detected Athlete: Searching...", (x_text, y_text), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (160, 160, 160), 1, cv2.LINE_AA)

        # Line 3: Pose Confidence
        y_text += lh
        conf_color = (0, 255, 128) if conf_pct >= 50 else ((0, 200, 255) if conf_pct >= 30 else (120, 120, 240))
        conf_label = f"Pose Confidence: {conf_pct}%" if active else "Pose Confidence: -- (Unavailable)"
        cv2.putText(canvas, conf_label, (x_text, y_text), cv2.FONT_HERSHEY_SIMPLEX, font_scale, conf_color, 1, cv2.LINE_AA)

        # Line 4: Frame / Time
        y_text += lh
        cv2.putText(canvas, f"Frame: {frame_number} | Time: {timestamp:.2f}s", (x_text, y_text), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (200, 200, 200), 1, cv2.LINE_AA)
