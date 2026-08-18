import os
import cv2
from typing import Dict, Any

def extract_video_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extracts video FPS, duration, resolution and quality score using OpenCV.
    """
    default_metadata = {
        "fps": 30,
        "duration": 0.0,
        "resolution": "1920x1080",
        "quality_score": 90.0,
    }

    if not os.path.exists(file_path):
        return default_metadata

    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return default_metadata

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        cap.release()

        if fps <= 0:
            fps = 30
        
        duration = round(frame_count / fps, 2) if frame_count > 0 else 0.0
        resolution = f"{width}x{height}" if (width > 0 and height > 0) else "1920x1080"
        
        # Simple quality calculation based on resolution and framerate
        pixels = width * height if (width > 0 and height > 0) else 1920 * 1080
        quality_score = min(100.0, round((pixels / (1920 * 1080)) * 70 + (fps / 60) * 30, 1))

        return {
            "fps": fps,
            "duration": duration,
            "resolution": resolution,
            "quality_score": max(50.0, quality_score),
        }
    except Exception as e:
        print(f"Error extracting video metadata with cv2: {e}")
        return default_metadata
