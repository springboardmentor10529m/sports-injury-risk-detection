"""Real frame extraction via OpenCV. No mocking - reads actual video bytes
from disk and decodes frames with cv2.VideoCapture."""

from dataclasses import dataclass

import cv2
import numpy as np

MAX_WORKING_FRAME_DIMENSION = 1280


class VideoReadError(Exception):
    pass


@dataclass
class ExtractedFrame:
    frame: np.ndarray  # BGR image, as decoded by OpenCV
    timestamp_ms: int
    frame_index: int  # index within the original video


def extract_frames(video_path: str, sample_fps: float) -> tuple[list[ExtractedFrame], dict]:
    """Decode `video_path` and return frames sampled at approximately
    `sample_fps` frames per second, plus metadata about the source video.

    Raises VideoReadError if the file can't be opened or has zero frames -
    we do not fabricate frames for an unreadable file.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise VideoReadError(f"Could not open video file: {video_path}")

    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if source_fps <= 0:
        # Some containers (e.g. certain mobile MP4s) don't report fps reliably.
        # Fall back to a conservative assumption but flag it in metadata.
        source_fps = 30.0
        fps_estimated = True
    else:
        fps_estimated = False

    # Sample every Nth frame so the effective rate is close to sample_fps.
    step = max(1, round(source_fps / sample_fps))

    frames: list[ExtractedFrame] = []
    idx = 0
    while True:
        ret, frame_bgr = cap.read()
        if not ret:
            break
        if idx % step == 0:
            height, width = frame_bgr.shape[:2]
            longest_dimension = max(height, width)
            if longest_dimension > MAX_WORKING_FRAME_DIMENSION:
                scale = MAX_WORKING_FRAME_DIMENSION / longest_dimension
                frame_bgr = cv2.resize(
                    frame_bgr,
                    (round(width * scale), round(height * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            timestamp_ms = int((idx / source_fps) * 1000)
            frames.append(ExtractedFrame(frame=frame_bgr, timestamp_ms=timestamp_ms, frame_index=idx))
        idx += 1
    cap.release()

    if not frames:
        raise VideoReadError(f"No decodable frames found in: {video_path}")

    metadata = {
        "source_fps": source_fps,
        "fps_estimated": fps_estimated,
        "total_frames_in_source": total_frames if total_frames > 0 else idx,
        "width": width,
        "height": height,
        "sampled_frame_count": len(frames),
        "effective_sample_fps": source_fps / step,
    }
    return frames, metadata
