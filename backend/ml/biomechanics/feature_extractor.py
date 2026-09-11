from typing import Dict, Any, Optional
from .geometry import normalize_coordinates
from .joint_angles import compute_all_joint_angles
from .kinematics import KinematicsCalculator
from .symmetry import compute_symmetry_metrics

class BiomechanicsFeatureExtractor:
    """
    Frame-by-frame biomechanics feature extractor aggregating 2D pixel coordinates,
    normalized coordinates, 3-point joint angles, kinematics, and symmetry.
    """
    def __init__(self):
        self.kinematics_calculator = KinematicsCalculator()

    def process_frame(
        self,
        keypoints: Dict[str, Dict[str, Any]],
        frame_width: int,
        frame_height: int,
        timestamp: float
    ) -> Dict[str, Any]:

        # 1. Normalize positions
        normalized_kps = normalize_coordinates(keypoints, frame_width, frame_height)

        # 2. Compute joint angles & alignments
        angles = compute_all_joint_angles(keypoints)

        # 3. Compute kinematics
        kinematics = self.kinematics_calculator.compute_kinematics(angles, normalized_kps, timestamp)

        # 4. Compute symmetry metrics
        symmetry = compute_symmetry_metrics(angles)

        return {
            "timestamp": round(timestamp, 2),
            "normalized_keypoints": normalized_kps,
            "joint_angles": angles,
            "kinematics": kinematics,
            "symmetry": symmetry
        }
