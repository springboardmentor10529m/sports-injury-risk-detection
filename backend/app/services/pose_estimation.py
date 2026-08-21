"""Pose estimation service interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class Keypoint:
    name: str
    x: float
    y: float
    z: float
    confidence: float


@dataclass
class PoseResult:
    keypoints: list[Keypoint]
    timestamp: float


class PoseEstimationBase(ABC):
    """
    Interface for pose estimation.
    Supported keypoints: head, left_shoulder, right_shoulder, left_elbow, right_elbow,
    left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle,
    right_ankle, left_foot, right_foot.
    """

    @abstractmethod
    def estimate_poses(self, video_path: str) -> list[PoseResult]:
        """Estimate poses for all frames in a video."""
        pass

    @abstractmethod
    def extract_keypoints(self, frame: np.ndarray) -> list[Keypoint]:
        """Extract keypoints from a single frame."""
        pass


class PoseEstimationService(PoseEstimationBase):
    def estimate_poses(self, video_path: str) -> list[PoseResult]:
        raise NotImplementedError("Phase 2 implementation")

    def extract_keypoints(self, frame: np.ndarray) -> list[Keypoint]:
        raise NotImplementedError("Phase 2 implementation")
