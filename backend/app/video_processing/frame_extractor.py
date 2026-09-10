"""Real frame extraction via OpenCV. No mocking - reads actual video bytes
from disk and decodes frames with cv2.VideoCapture."""

from dataclasses import dataclass

import cv2
import numpy as np
from app.core.config import settings

MAX_WORKING_FRAME_DIMENSION = 1280


class VideoReadError(Exception):
    pass


@dataclass
class ExtractedFrame:
    frame: np.ndarray  # BGR image, as decoded by OpenCV
    timestamp_ms: int
    frame_index: int  # index within the original video


def extract_frames(video_path: str, sample_fps: float, stream: bool = False):
    """Decode `video_path` and return frames sampled at approximately
    `sample_fps` frames per second, plus metadata about the source video.

    Raises VideoReadError if the file can't be opened or has zero frames -
    we do not fabricate frames for an unreadable file.
    """
    cap = cv2.VideoCapture(video_path)
    try:
        metadata, step = _read_metadata(cap, sample_fps)
    finally:
        cap.release()
    frames = _decode_frames(video_path, metadata, step)
    return (frames if stream else list(frames)), metadata


def _read_metadata(cap, sample_fps):
    if not cap.isOpened():
        raise VideoReadError("Could not open this video. Upload a supported, playable video.")

    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    if not np.isfinite(source_fps) or source_fps <= 0:
        # Some containers (e.g. certain mobile MP4s) don't report fps reliably.
        # Fall back to a conservative assumption but flag it in metadata.
        source_fps = 30.0
        fps_estimated = True
    else:
        fps_estimated = False

    if total_frames / source_fps > settings.MAX_VIDEO_SECONDS:
        raise VideoReadError(f"Video exceeds the {settings.MAX_VIDEO_SECONDS}-second limit.")

    # Sample every Nth frame so the effective rate is close to sample_fps.
    step = max(1, round(source_fps / sample_fps))
    return {
        "source_fps": source_fps, "fps_estimated": fps_estimated,
        "total_frames_in_source": total_frames, "width": width, "height": height,
        "sampled_frame_count": 0, "effective_sample_fps": source_fps / step,
    }, step


def _decode_frames(video_path, metadata, step):
    cap = cv2.VideoCapture(video_path)
    try:
        yield from _sample_frames(cap, metadata, step)
    finally:
        cap.release()


def _sample_frames(cap, metadata, step):
    source_fps = metadata["source_fps"]
    idx = 0
    while True:
        ret, frame_bgr = cap.read()
        if not ret:
            break
        if idx / source_fps >= settings.MAX_VIDEO_SECONDS:
            raise VideoReadError(f"Video exceeds the {settings.MAX_VIDEO_SECONDS}-second limit.")
        if idx % step == 0:
            if metadata["sampled_frame_count"] >= settings.MAX_SAMPLED_FRAMES:
                raise VideoReadError("Video contains too many sampled frames. Upload a shorter clip.")
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
            metadata["sampled_frame_count"] += 1
            yield ExtractedFrame(frame=frame_bgr, timestamp_ms=timestamp_ms, frame_index=idx)
        idx += 1

    if not metadata["sampled_frame_count"]:
        raise VideoReadError("No decodable frames found. Upload a supported, playable video.")

    if metadata["total_frames_in_source"] <= 0:
        metadata["total_frames_in_source"] = idx
