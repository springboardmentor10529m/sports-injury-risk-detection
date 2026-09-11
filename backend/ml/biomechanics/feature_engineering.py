"""
AthleteGuard - Biomechanical Feature Engineering Module
Centralized extraction of reliable 2D biomechanical features from COCO 17-keypoint pose data.

DISCLAIMER & SCOPE:
All angles and metrics in this module are computed from 2D plane projections (x, y coordinates
in video frame space). They represent 2D biomechanical screening proxies and NOT 3D clinical kinematics.
No 3D joint centers are inferred.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Tuple
import math
from .geometry import calculate_angle_3pt, calculate_line_angle_horizontal, calculate_line_angle_vertical, normalize_coordinates
from .joint_angles import compute_all_joint_angles
from .symmetry import compute_symmetry_metrics
from .kinematics import KinematicsCalculator


@dataclass
class BiomechanicalFeatureVector:
    """
    Standardized dataclass for a discrete biomechanical feature calculation.
    """
    feature_name: str
    value: float
    unit: str
    confidence: float
    timestamp: float
    frame: int
    source_keypoints: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BiomechanicalFeatureEngineer:
    """
    Centralized feature engineering engine extracting 20 reliable 2D COCO keypoint features
    per video frame with temporal tracking across the movement sequence.
    """

    def __init__(self):
        self.kinematics_calc = KinematicsCalculator()
        self.history_window: List[Dict[str, float]] = []
        self.max_window_size = 15  # ~1 second at 15 fps for moving window metrics
        self.prev_knee_flexion_vel: Dict[str, float] = {"left": 0.0, "right": 0.0}

    def _get_kp(self, keypoints: Dict[str, Any], name: str) -> Tuple[float, float, float]:
        """Returns (x, y, confidence) for named keypoint or defaults."""
        if name in keypoints:
            k = keypoints[name]
            return float(k.get("x", 0.0)), float(k.get("y", 0.0)), float(k.get("confidence", 0.0))
        return 0.0, 0.0, 0.0

    def extract_frame_features(
        self,
        keypoints: Dict[str, Any],
        frame_width: int,
        frame_height: int,
        timestamp: float,
        frame_idx: int
    ) -> Dict[str, BiomechanicalFeatureVector]:
        """
        Extracts 20 standardized 2D biomechanical features for a single frame.
        """
        # 1. Base joint angles and normalized coordinates
        angles = compute_all_joint_angles(keypoints)
        norm_kps = normalize_coordinates(keypoints, frame_width, frame_height)
        symmetry = compute_symmetry_metrics(angles)
        kinematics = self.kinematics_calc.compute_kinematics(angles, norm_kps, timestamp)

        features: Dict[str, BiomechanicalFeatureVector] = {}

        # Helper to compute group confidence
        def get_conf(*kp_names: str) -> float:
            confs = [self._get_kp(keypoints, name)[2] for name in kp_names if name in keypoints]
            return float(sum(confs) / len(confs)) if confs else 0.5

        # --- 1. Knee Valgus Proxy (2D Frontal Projection Angle Deviation) ---
        # Hip -> Knee vector compared with Knee -> Ankle vector in coronal/frontal projection
        # In standard 2D view, deviation of knee joint center inward relative to hip-ankle line
        l_hip, l_knee, l_ankle = self._get_kp(keypoints, "left_hip"), self._get_kp(keypoints, "left_knee"), self._get_kp(keypoints, "left_ankle")
        r_hip, r_knee, r_ankle = self._get_kp(keypoints, "right_hip"), self._get_kp(keypoints, "right_knee"), self._get_kp(keypoints, "right_ankle")

        def compute_2d_valgus(hip: Tuple[float, float, float], knee: Tuple[float, float, float], ankle: Tuple[float, float, float], is_left: bool) -> float:
            if hip[2] < 0.2 or knee[2] < 0.2 or ankle[2] < 0.2:
                return 0.0
            # Line from hip to ankle
            dx = ankle[0] - hip[0]
            dy = ankle[1] - hip[1]
            seg_len = math.sqrt(dx**2 + dy**2)
            if seg_len <= 1e-4:
                return 0.0
            # Perpendicular distance of knee to hip-ankle line (signed)
            cross = (knee[0] - hip[0]) * dy - (knee[1] - hip[1]) * dx
            norm_dev = cross / seg_len
            # In standard anatomical frontal view:
            # For Left Leg (camera viewing front, athlete left is screen left/right depending on orientation):
            # Medial collapse corresponds to inward movement. We approximate degrees of deviation:
            valgus_deg = math.degrees(math.atan2(abs(norm_dev), seg_len * 0.5))
            return min(45.0, max(0.0, valgus_deg))

        left_valgus = compute_2d_valgus(l_hip, l_knee, l_ankle, is_left=True)
        right_valgus = compute_2d_valgus(r_hip, r_knee, r_ankle, is_left=False)
        knee_valgus_max = max(left_valgus, right_valgus)

        features["knee_valgus_angle"] = BiomechanicalFeatureVector(
            feature_name="knee_valgus_angle",
            value=round(knee_valgus_max, 2),
            unit="degrees",
            confidence=round(min(get_conf("left_hip", "left_knee", "left_ankle"), get_conf("right_hip", "right_knee", "right_ankle")), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"]
        )

        # --- 2 & 3. Left / Right Knee Angles ---
        features["left_knee_angle"] = BiomechanicalFeatureVector(
            feature_name="left_knee_angle",
            value=round(angles.get("left_knee_angle", 180.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_hip", "left_knee", "left_ankle"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_hip", "left_knee", "left_ankle"]
        )
        features["right_knee_angle"] = BiomechanicalFeatureVector(
            feature_name="right_knee_angle",
            value=round(angles.get("right_knee_angle", 180.0), 2),
            unit="degrees",
            confidence=round(get_conf("right_hip", "right_knee", "right_ankle"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["right_hip", "right_knee", "right_ankle"]
        )

        # --- 4 & 5. Left / Right Hip Angles ---
        features["left_hip_angle"] = BiomechanicalFeatureVector(
            feature_name="left_hip_angle",
            value=round(angles.get("left_hip_angle", 180.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_shoulder", "left_hip", "left_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_shoulder", "left_hip", "left_knee"]
        )
        features["right_hip_angle"] = BiomechanicalFeatureVector(
            feature_name="right_hip_angle",
            value=round(angles.get("right_hip_angle", 180.0), 2),
            unit="degrees",
            confidence=round(get_conf("right_shoulder", "right_hip", "right_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["right_shoulder", "right_hip", "right_knee"]
        )

        # --- 6 & 7. Left / Right Ankle Angles ---
        features["left_ankle_angle"] = BiomechanicalFeatureVector(
            feature_name="left_ankle_angle",
            value=round(angles.get("left_ankle_angle", 90.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_knee", "left_ankle"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee", "left_ankle"]
        )
        features["right_ankle_angle"] = BiomechanicalFeatureVector(
            feature_name="right_ankle_angle",
            value=round(angles.get("right_ankle_angle", 90.0), 2),
            unit="degrees",
            confidence=round(get_conf("right_knee", "right_ankle"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["right_knee", "right_ankle"]
        )

        # --- 8. Trunk Lean Angle (lean relative to vertical) ---
        features["trunk_lean"] = BiomechanicalFeatureVector(
            feature_name="trunk_lean",
            value=round(angles.get("trunk_lean_angle", 0.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_shoulder", "right_shoulder", "left_hip", "right_hip"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_shoulder", "right_shoulder", "left_hip", "right_hip"]
        )

        # --- 9. Hip Stability (Pelvic Tilt from Horizontal) ---
        features["hip_stability"] = BiomechanicalFeatureVector(
            feature_name="hip_stability",
            value=round(angles.get("hip_alignment_angle", 0.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_hip", "right_hip"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_hip", "right_hip"]
        )

        # --- 10, 11, 12. Bilateral Asymmetries ---
        features["bilateral_knee_asymmetry"] = BiomechanicalFeatureVector(
            feature_name="bilateral_knee_asymmetry",
            value=round(symmetry.get("knee_asymmetry_deg", 0.0), 2),
            unit="degrees",
            confidence=round(min(get_conf("left_knee"), get_conf("right_knee")), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee", "right_knee"]
        )
        features["bilateral_hip_asymmetry"] = BiomechanicalFeatureVector(
            feature_name="bilateral_hip_asymmetry",
            value=round(symmetry.get("hip_asymmetry_deg", 0.0), 2),
            unit="degrees",
            confidence=round(min(get_conf("left_hip"), get_conf("right_hip")), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_hip", "right_hip"]
        )
        features["bilateral_ankle_asymmetry"] = BiomechanicalFeatureVector(
            feature_name="bilateral_ankle_asymmetry",
            value=round(symmetry.get("ankle_asymmetry_deg", 0.0), 2),
            unit="degrees",
            confidence=round(min(get_conf("left_ankle"), get_conf("right_ankle")), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_ankle", "right_ankle"]
        )

        # --- 13. Shoulder Asymmetry / Alignment ---
        features["shoulder_asymmetry"] = BiomechanicalFeatureVector(
            feature_name="shoulder_asymmetry",
            value=round(angles.get("shoulder_alignment_angle", 0.0), 2),
            unit="degrees",
            confidence=round(get_conf("left_shoulder", "right_shoulder"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_shoulder", "right_shoulder"]
        )

        # Maintain window for moving statistics (Variability, Range of Motion)
        current_state = {
            "l_knee": angles.get("left_knee_angle", 180.0),
            "r_knee": angles.get("right_knee_angle", 180.0),
            "trunk": angles.get("trunk_lean_angle", 0.0),
            "vel": kinematics.get("relative_movement_velocity", 0.0)
        }
        self.history_window.append(current_state)
        if len(self.history_window) > self.max_window_size:
            self.history_window.pop(0)

        # --- 14. Range of Motion (Windowed Max - Min of Knee Flexion) ---
        l_knees = [w["l_knee"] for w in self.history_window]
        rom = max(l_knees) - min(l_knees) if len(l_knees) > 1 else 0.0
        features["range_of_motion"] = BiomechanicalFeatureVector(
            feature_name="range_of_motion",
            value=round(rom, 2),
            unit="degrees",
            confidence=round(get_conf("left_knee", "right_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee"]
        )

        # --- 15. Joint-Angle Velocity (Mean Absolute Lower-Limb Angular Velocity) ---
        ang_vels = kinematics.get("angular_velocity", {})
        knee_vel = max(abs(ang_vels.get("left_knee_angle", 0.0)), abs(ang_vels.get("right_knee_angle", 0.0)))
        features["joint_angle_velocity"] = BiomechanicalFeatureVector(
            feature_name="joint_angle_velocity",
            value=round(knee_vel, 2),
            unit="deg/sec",
            confidence=round(get_conf("left_knee", "right_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee", "right_knee"]
        )

        # --- 16. Joint-Angle Acceleration ---
        ang_accels = kinematics.get("angular_acceleration", {})
        knee_accel = max(abs(ang_accels.get("left_knee_angle", 0.0)), abs(ang_accels.get("right_knee_angle", 0.0)))
        features["joint_angle_acceleration"] = BiomechanicalFeatureVector(
            feature_name="joint_angle_acceleration",
            value=round(knee_accel, 2),
            unit="deg/sec^2",
            confidence=round(get_conf("left_knee", "right_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee", "right_knee"]
        )

        # --- 17. Movement Variability (Standard Deviation in Window) ---
        if len(l_knees) >= 3:
            mean_k = sum(l_knees) / len(l_knees)
            var = sum((x - mean_k)**2 for x in l_knees) / len(l_knees)
            std_k = math.sqrt(var)
        else:
            std_k = 0.0
        features["movement_variability"] = BiomechanicalFeatureVector(
            feature_name="movement_variability",
            value=round(std_k, 2),
            unit="degrees_std",
            confidence=round(get_conf("left_knee"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee"]
        )

        # --- 18. Postural Stability Score (0.0 to 100.0, derived from trunk sway & centroid jerk) ---
        trunk_dev = abs(angles.get("trunk_lean_angle", 0.0))
        postural_stability = max(0.0, min(100.0, 100.0 - (trunk_dev * 2.5 + std_k * 1.5)))
        features["postural_stability"] = BiomechanicalFeatureVector(
            feature_name="postural_stability",
            value=round(postural_stability, 2),
            unit="score_0_100",
            confidence=round(get_conf("left_shoulder", "right_shoulder", "left_hip", "right_hip"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_shoulder", "right_shoulder", "left_hip", "right_hip"]
        )

        # --- 19. Landing / Deceleration Indicators ---
        # Sharp knee flexion deceleration coupled with high angular acceleration indicates rapid impact absorption
        is_flexing = ang_vels.get("left_knee_angle", 0.0) < -150.0 or ang_vels.get("right_knee_angle", 0.0) < -150.0
        decel_indicator = 1.0 if (is_flexing and knee_accel > 600.0) else 0.0
        features["landing_deceleration_indicator"] = BiomechanicalFeatureVector(
            feature_name="landing_deceleration_indicator",
            value=round(decel_indicator, 2),
            unit="binary_indicator",
            confidence=round(get_conf("left_knee", "right_knee", "left_ankle", "right_ankle"), 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=["left_knee", "right_knee", "left_ankle", "right_ankle"]
        )

        # --- 20. Keypoint Confidence & Movement Quality ---
        all_confs = [k.get("confidence", 0.0) for k in keypoints.values() if isinstance(k, dict)]
        mean_kp_conf = float(sum(all_confs) / len(all_confs)) if all_confs else 0.0

        # Frame Movement Quality: starts at 100, penalized by valgus, extreme asymmetry, and poor posture
        quality_score = 100.0 - (knee_valgus_max * 1.2) - (symmetry.get("knee_asymmetry_deg", 0.0) * 0.8) - (trunk_dev * 0.6)
        quality_score = max(20.0, min(100.0, quality_score * (mean_kp_conf if mean_kp_conf > 0.3 else 0.5)))

        features["keypoint_confidence"] = BiomechanicalFeatureVector(
            feature_name="keypoint_confidence",
            value=round(mean_kp_conf, 3),
            unit="probability",
            confidence=1.0,
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=list(keypoints.keys())
        )

        features["frame_movement_quality"] = BiomechanicalFeatureVector(
            feature_name="frame_movement_quality",
            value=round(quality_score, 1),
            unit="score_0_100",
            confidence=round(mean_kp_conf, 3),
            timestamp=round(timestamp, 3),
            frame=frame_idx,
            source_keypoints=list(keypoints.keys())
        )

        return features
