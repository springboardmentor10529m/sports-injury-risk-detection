"""
app/services/video_processor.py
--------------------------------
OpenCV-based video validation and frame extraction service.

Responsibilities
----------------
- Open and validate a video file (checks it is readable, non-empty).
- Extract video metadata: FPS, total frame count, duration, width, height.
- Sample frames at a configurable rate (every Nth frame) up to a max cap.

Design
------
- No hardcoded paths — receives a Path object from the caller.
- No side-effects on the file system — frames are returned as in-memory
  numpy arrays.
- Raises ``VideoProcessingError`` for all failure cases so callers can
  distinguish video errors from generic exceptions.
- The implementation is self-contained: replacing or extending it does not
  require changes to the pose estimator or API layer.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ── Custom exception ──────────────────────────────────────────────────────────

class VideoProcessingError(Exception):
    """Raised when the video file cannot be opened or processed."""


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class VideoMetadata:
    """Metadata extracted from a video file via OpenCV."""
    fps: float
    frame_count: int
    duration_seconds: float
    width: int
    height: int


@dataclass
class ExtractedFrame:
    """A single sampled frame with its position information."""
    frame_number: int          # 0-indexed position in the original video
    timestamp_ms: float        # millisecond offset from video start
    image: np.ndarray          # BGR image array (H, W, 3)


@dataclass
class VideoExtractionResult:
    """Full result of a video processing run."""
    metadata: VideoMetadata
    frames: list[ExtractedFrame] = field(default_factory=list)


# ── Service ───────────────────────────────────────────────────────────────────

class VideoProcessingService:
    """
    Service that validates a video file and extracts sampled frames.

    Parameters
    ----------
    frame_sample_rate : int
        Process every Nth frame (e.g. 5 → frames 0, 5, 10, …).
        Must be ≥ 1.
    max_processed_frames : int
        Hard cap on the number of frames returned.  Processing stops after
        this many frames have been collected, regardless of video length.

    Usage
    -----
    ::

        svc = VideoProcessingService(frame_sample_rate=5, max_processed_frames=300)
        result = svc.process(Path("/app/uploads/abc_video.mp4"))
        # result.metadata.fps, result.frames[i].image, …
    """

    def __init__(
        self,
        frame_sample_rate: int = 5,
        max_processed_frames: int = 300,
    ) -> None:
        if frame_sample_rate < 1:
            raise ValueError("frame_sample_rate must be >= 1")
        if max_processed_frames < 1:
            raise ValueError("max_processed_frames must be >= 1")
        self._sample_rate = frame_sample_rate
        self._max_frames = max_processed_frames

    # ── Public API ────────────────────────────────────────────────────────────

    def process(self, video_path: Path) -> VideoExtractionResult:
        """
        Open *video_path*, validate it, read metadata, and extract frames.

        Parameters
        ----------
        video_path : Path
            Absolute path to the video file.

        Returns
        -------
        VideoExtractionResult
            Metadata + list of sampled frames.

        Raises
        ------
        VideoProcessingError
            If the file does not exist, cannot be opened by OpenCV, or
            contains no readable frames.
        """
        if not video_path.exists():
            raise VideoProcessingError(
                f"Video file not found: {video_path}"
            )

        cap = cv2.VideoCapture(str(video_path))

        try:
            if not cap.isOpened():
                raise VideoProcessingError(
                    f"OpenCV could not open video: {video_path.name}"
                )

            metadata = self._read_metadata(cap, video_path.name)
            frames = self._extract_frames(cap, metadata)

        finally:
            cap.release()

        if not frames:
            raise VideoProcessingError(
                "No frames could be read from the video file."
            )

        logger.info(
            "VideoProcessingService: processed %s — "
            "%.2f fps, %d total frames, %.2fs duration, "
            "%d×%d, %d frames sampled",
            video_path.name,
            metadata.fps,
            metadata.frame_count,
            metadata.duration_seconds,
            metadata.width,
            metadata.height,
            len(frames),
        )

        return VideoExtractionResult(metadata=metadata, frames=frames)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _read_metadata(
        self,
        cap: cv2.VideoCapture,
        filename: str,
    ) -> VideoMetadata:
        """Read video properties from the capture object."""
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if fps <= 0:
            logger.warning(
                "Video %s reported FPS=%.2f — defaulting to 30.0", filename, fps
            )
            fps = 30.0

        duration = total_frames / fps if fps > 0 else 0.0

        return VideoMetadata(
            fps=fps,
            frame_count=total_frames,
            duration_seconds=duration,
            width=width,
            height=height,
        )

    def _extract_frames(
        self,
        cap: cv2.VideoCapture,
        metadata: VideoMetadata,
    ) -> list[ExtractedFrame]:
        """
        Iterate through the video and collect every Nth frame up to the cap.

        OpenCV ``CAP_PROP_FRAME_COUNT`` can be inaccurate for some codecs,
        so we read frames sequentially rather than seeking.
        """
        extracted: list[ExtractedFrame] = []
        frame_index = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_index % self._sample_rate == 0:
                timestamp_ms = (
                    frame_index / metadata.fps * 1000
                    if metadata.fps > 0
                    else 0.0
                )
                extracted.append(
                    ExtractedFrame(
                        frame_number=frame_index,
                        timestamp_ms=timestamp_ms,
                        image=frame,
                    )
                )

                if len(extracted) >= self._max_frames:
                    logger.info(
                        "Reached MAX_PROCESSED_FRAMES (%d) at frame %d",
                        self._max_frames,
                        frame_index,
                    )
                    break

            frame_index += 1

        return extracted
