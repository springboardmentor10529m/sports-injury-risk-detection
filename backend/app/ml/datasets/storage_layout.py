"""
Filesystem storage layout manager for SafeMove datasets.
Enforces strict separation between raw data, processed videos, extracted poses,
kinematic features, labels, splits, and compiled ML feature tables.
"""
from pathlib import Path
from typing import Dict, Optional
import os


class DatasetStorageManager:
    """Manages the separated storage directories for a named dataset."""

    def __init__(self, base_data_dir: Optional[str] = None):
        if base_data_dir:
            self.base_dir = Path(base_data_dir).resolve()
        else:
            # Default to backend/data/
            backend_root = Path(__file__).resolve().parent.parent.parent.parent
            self.base_dir = (backend_root / "data").resolve()

    def get_dataset_dir(self, dataset_name: str) -> Path:
        return self.base_dir / dataset_name

    def get_raw_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "raw" / dataset_name

    def get_processed_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "processed" / dataset_name

    def get_pose_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "pose" / dataset_name

    def get_kinematics_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "kinematics" / dataset_name

    def get_labels_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "labels" / dataset_name

    def get_features_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "features" / dataset_name

    def get_splits_dir(self, dataset_name: str) -> Path:
        return self.base_dir / "splits" / dataset_name

    def initialize_dataset_directories(self, dataset_name: str) -> Dict[str, Path]:
        """Create all separated subdirectories for a dataset if they do not exist."""
        paths = {
            "raw": self.get_raw_dir(dataset_name),
            "processed": self.get_processed_dir(dataset_name),
            "pose": self.get_pose_dir(dataset_name),
            "kinematics": self.get_kinematics_dir(dataset_name),
            "labels": self.get_labels_dir(dataset_name),
            "features": self.get_features_dir(dataset_name),
            "splits": self.get_splits_dir(dataset_name),
        }
        for p in paths.values():
            p.mkdir(parents=True, exist_ok=True)
        return paths
