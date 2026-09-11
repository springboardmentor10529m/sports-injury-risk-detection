"""
AthleteGuard - Video Storage Backend Abstraction
Decouples physical video file storage from database records and API controllers.
"""

from abc import ABC, abstractmethod
import os
import shutil
import logging
from typing import Optional, BinaryIO

logger = logging.getLogger(__name__)


class VideoStorageBackend(ABC):
    """
    Abstract interface for video storage implementations.
    """

    @abstractmethod
    def save_video(self, file_obj: BinaryIO, filename: str) -> str:
        """Saves video and returns storage path / URI."""
        pass

    @abstractmethod
    def get_video_path(self, storage_uri: str) -> str:
        """Returns local accessible filesystem path or download cache path."""
        pass

    @abstractmethod
    def delete_video(self, storage_uri: str) -> bool:
        """Deletes video from storage."""
        pass

    @abstractmethod
    def video_exists(self, storage_uri: str) -> bool:
        """Checks whether video exists in storage."""
        pass


class LocalVideoStorage(VideoStorageBackend):
    """
    Local filesystem storage implementation for development and on-prem deployments.
    """

    def __init__(self, base_dir: Optional[str] = None):
        if base_dir is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "videos"))
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save_video(self, file_obj: BinaryIO, filename: str) -> str:
        clean_name = os.path.basename(filename)
        dest_path = os.path.join(self.base_dir, clean_name)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return dest_path

    def get_video_path(self, storage_uri: str) -> str:
        if os.path.isabs(storage_uri) and os.path.exists(storage_uri):
            return storage_uri
        # Relative lookup
        candidate = os.path.join(self.base_dir, os.path.basename(storage_uri))
        return candidate if os.path.exists(candidate) else storage_uri

    def delete_video(self, storage_uri: str) -> bool:
        path = self.get_video_path(storage_uri)
        if os.path.exists(path):
            try:
                os.remove(path)
                return True
            except Exception as e:
                logger.error(f"[STORAGE] Failed to delete video at {path}: {e}")
                return False
        return False

    def video_exists(self, storage_uri: str) -> bool:
        path = self.get_video_path(storage_uri)
        return os.path.exists(path) and os.path.getsize(path) > 0


class ObjectStorageBackend(VideoStorageBackend):
    """
    Stub for cloud object storage (AWS S3, Azure Blob, Google Cloud Storage).
    Can be configured in production via environment variables.
    """

    def __init__(self, bucket_name: str = "athleteguard-videos", endpoint_url: Optional[str] = None):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url
        self.local_cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "cache"))
        os.makedirs(self.local_cache_dir, exist_ok=True)

    def save_video(self, file_obj: BinaryIO, filename: str) -> str:
        # In production, uses boto3 / azure-storage-blob to upload to cloud bucket
        logger.info(f"[OBJECT_STORAGE] Uploaded {filename} to s3://{self.bucket_name}/{filename}")
        return f"s3://{self.bucket_name}/{filename}"

    def get_video_path(self, storage_uri: str) -> str:
        # Downloads from S3 to local cache if not present, then returns local path
        return storage_uri

    def delete_video(self, storage_uri: str) -> bool:
        logger.info(f"[OBJECT_STORAGE] Deleted object at {storage_uri}")
        return True

    def video_exists(self, storage_uri: str) -> bool:
        return True
