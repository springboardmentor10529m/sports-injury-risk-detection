"""Storage service for video file management."""

import logging
import os
import uuid
from pathlib import Path

import cv2

from app.config import get_settings

logger = logging.getLogger("uvicorn.error")


class StorageService:
    def __init__(self):
        self.settings = get_settings()
        self.storage_dir = Path(self.settings.VIDEO_STORAGE_PATH).resolve()
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_extension(self, filename: str) -> str:
        """Extract and sanitize file extension."""
        _, ext = os.path.splitext(filename)
        ext = ext.lower().strip()
        if not ext.startswith("."):
            ext = f".{ext}"
        return ext

    def save_video_file(
        self, file_content: bytes, original_filename: str, video_id: uuid.UUID
    ) -> tuple[str, str, float | None, float | None, str | None]:
        """
        Save video file securely to local storage directory.

        Returns:
            (safe_filename, relative_storage_path, fps, duration_seconds, resolution)
        """
        ext = self._sanitize_extension(original_filename)
        safe_filename = f"{video_id}{ext}"
        destination_path = (self.storage_dir / safe_filename).resolve()

        # Security: Prevent directory traversal attack
        if not str(destination_path).startswith(str(self.storage_dir)):
            raise ValueError("Path traversal attempt detected in filename.")

        # Write binary content
        with open(destination_path, "wb") as f:
            f.write(file_content)

        relative_path = f"storage/videos/{safe_filename}"

        # Probe video properties via OpenCV
        fps = None
        duration_seconds = None
        resolution = None

        try:
            cap = cv2.VideoCapture(str(destination_path))
            if cap.isOpened():
                detected_fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()

                if detected_fps and detected_fps > 0:
                    fps = round(float(detected_fps), 2)
                    if frame_count and frame_count > 0:
                        duration_seconds = round(float(frame_count / detected_fps), 2)
                if width > 0 and height > 0:
                    resolution = f"{width}x{height}"
        except Exception as e:
            logger.debug(f"OpenCV metadata probe skipped: {e}")

        return safe_filename, relative_path, fps, duration_seconds, resolution

    def get_video_file_path(self, storage_path: str) -> Path | None:
        """
        Resolve storage path and verify it is located safely inside storage directory.
        """
        if not storage_path:
            return None

        # Clean relative prefixes if passed
        clean_path = storage_path.replace("storage/videos/", "").replace("storage/videos\\", "")
        file_path = (self.storage_dir / clean_path).resolve()

        # Directory traversal security check
        if not str(file_path).startswith(str(self.storage_dir)):
            logger.warning(f"Unauthorized path access attempt: {storage_path}")
            return None

        if file_path.is_file():
            return file_path
        return None

    def delete_video_file(self, storage_path: str) -> bool:
        """Delete video file from storage."""
        file_path = self.get_video_file_path(storage_path)
        if file_path and file_path.exists():
            try:
                file_path.unlink()
                return True
            except OSError as e:
                logger.error(f"Failed to delete video file {file_path}: {e}")
        return False


_storage_service_instance: StorageService | None = None


def get_storage_service() -> StorageService:
    global _storage_service_instance
    if _storage_service_instance is None:
        _storage_service_instance = StorageService()
    return _storage_service_instance
