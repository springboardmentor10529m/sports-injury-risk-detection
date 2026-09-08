"""
Video Processor Module
Handles video loading, validation, frame sampling, quality scoring, and annotated video generation.
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, List, Tuple, Generator, Optional

class VideoProcessor:
    def __init__(self, target_fps: int = 15, max_duration_sec: float = 120.0, min_duration_sec: float = 0.8):
        self.target_fps = target_fps
        self.max_duration_sec = max_duration_sec
        self.min_duration_sec = min_duration_sec

    def extract_metadata(self, video_path: str) -> Dict[str, Any]:
        """Reads video metadata using OpenCV."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        if fps <= 0 or total_frames <= 0:
            raise ValueError("Invalid video stream: non-positive FPS or frame count.")

        duration_sec = total_frames / fps

        return {
            "file_name": os.path.basename(video_path),
            "file_size_bytes": os.path.getsize(video_path),
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "width": width,
            "height": height,
            "duration_sec": round(duration_sec, 2),
            "resolution": f"{width}x{height}",
            "aspect_ratio": f"{width}:{height}" if height > 0 else "N/A"
        }

    def validate_video(self, metadata: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Checks duration and resolution limits."""
        duration = metadata.get("duration_sec", 0.0)
        if duration < self.min_duration_sec:
            return False, f"Video duration ({duration:.1f}s) is too short. Minimum is {self.min_duration_sec}s."
        if duration > self.max_duration_sec:
            return False, f"Video duration ({duration:.1f}s) exceeds maximum allowed ({self.max_duration_sec}s)."
        if metadata.get("width", 0) < 240 or metadata.get("height", 0) < 240:
            return False, f"Resolution {metadata.get('resolution')} is too low for reliable kinematic analysis."
        return True, None

    def assess_video_quality(self, video_path: str, num_sample_frames: int = 10) -> Dict[str, Any]:
        """Calculates blur variance, brightness, and contrast across sampled frames."""
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if total_frames <= 0:
            cap.release()
            return {"quality_tier": "Low", "blur_score": 0.0, "brightness": 0.0, "is_acceptable": False}

        step = max(1, total_frames // (num_sample_frames + 1))
        blur_scores = []
        brightness_scores = []
        contrast_scores = []

        for i in range(1, num_sample_frames + 1):
            frame_idx = i * step
            if frame_idx >= total_frames:
                break
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Blur score via Laplacian variance
            lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_scores.append(lap_var)
            
            # Brightness and contrast
            brightness_scores.append(float(np.mean(gray)))
            contrast_scores.append(float(np.std(gray)))

        cap.release()

        avg_blur = float(np.mean(blur_scores)) if blur_scores else 0.0
        avg_brightness = float(np.mean(brightness_scores)) if brightness_scores else 0.0
        avg_contrast = float(np.mean(contrast_scores)) if contrast_scores else 0.0

        # Quality scoring heuristic:
        # lap_var > 100: sharp; < 50: blurry
        # brightness between 40 and 220: good illumination
        is_acceptable = avg_blur >= 30.0 and 25.0 <= avg_brightness <= 240.0
        if avg_blur >= 120.0 and 50.0 <= avg_brightness <= 200.0:
            tier = "High"
        elif avg_blur >= 50.0:
            tier = "Moderate"
        else:
            tier = "Low"

        return {
            "blur_score": round(avg_blur, 2),
            "brightness_score": round(avg_brightness, 2),
            "contrast_score": round(avg_contrast, 2),
            "quality_tier": tier,
            "is_acceptable": is_acceptable
        }

    def frame_generator(self, video_path: str, max_frames: Optional[int] = None) -> Generator[Tuple[int, float, np.ndarray], None, None]:
        """
        Yields (frame_index, timestamp_sec, frame_bgr) at target sample rate.
        """
        cap = cv2.VideoCapture(video_path)
        source_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        
        # Sampling step based on source fps vs target fps
        step = max(1, int(round(source_fps / self.target_fps)))
        frame_idx = 0
        yielded_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            if frame_idx % step == 0:
                timestamp = frame_idx / source_fps
                yield frame_idx, round(timestamp, 3), frame
                yielded_count += 1
                if max_frames and yielded_count >= max_frames:
                    break

            frame_idx += 1

        cap.release()
