"""
Biomechanical Analysis Engine
Computes joint kinematics, dynamic knee valgus, trunk lean, bilateral asymmetry, and ROM.
"""

import math
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

class BiomechanicsAnalyzer:
    @staticmethod
    def _calculate_angle_3d(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """
        Calculates angle at vertex p2 formed by points p1 - p2 - p3 in 3D degrees.
        """
        v1 = p1 - p2
        v2 = p3 - p2
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        cos_angle = np.dot(v1, v2) / (norm1 * norm2)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        return float(np.degrees(np.arccos(cos_angle)))

    @staticmethod
    def _calculate_angle_2d(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """
        Calculates 2D planar angle at vertex p2 (x, y projection).
        """
        v1 = p1[:2] - p2[:2]
        v2 = p3[:2] - p2[:2]
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        cos_angle = np.dot(v1, v2) / (norm1 * norm2)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        return float(np.degrees(np.arccos(cos_angle)))

    @staticmethod
    def _calculate_valgus_angle(hip: np.ndarray, knee: np.ndarray, ankle: np.ndarray, is_left: bool) -> float:
        """
        Estimates dynamic knee valgus angle in the coronal plane (in degrees).
        Positive values indicate medial collapse (inward bowing / valgus),
        0 represents neutral alignment, negative represents varus (bow-legged).
        """
        # Vector from Hip to Ankle (ideal leg axis)
        leg_axis = ankle[:2] - hip[:2]
        axis_len = np.linalg.norm(leg_axis)
        if axis_len == 0:
            return 0.0
            
        unit_leg = leg_axis / axis_len
        # Perpendicular normal pointing medially (towards body center)
        # In image coords: x increases to the right.
        # For Left leg (viewer's right or subject's left): medial is towards center.
        # For subject's left leg, hip.x is greater than mid-hip, so medial points to the left (-x).
        # For subject's right leg, medial points to the right (+x).
        
        # 2D angle between thigh (hip->knee) and shank (knee->ankle)
        v_thigh = knee[:2] - hip[:2]
        v_shank = ankle[:2] - knee[:2]
        
        norm_t = np.linalg.norm(v_thigh)
        norm_s = np.linalg.norm(v_shank)
        if norm_t == 0 or norm_s == 0:
            return 0.0
            
        angle_straight = float(np.degrees(np.arccos(np.clip(np.dot(v_thigh, v_shank) / (norm_t * norm_s), -1.0, 1.0))))
        
        # Cross product in 2D to determine direction of deviation
        cross_prod = v_thigh[0] * v_shank[1] - v_thigh[1] * v_shank[0]
        
        # In image coordinates where Y goes down:
        # For left leg: positive cross indicates medial displacement (valgus)
        # For right leg: negative cross indicates medial displacement (valgus)
        valgus_deviation = angle_straight if (cross_prod > 0 if is_left else cross_prod < 0) else -angle_straight
        return float(round(valgus_deviation, 2))

    def analyze_frame_kinematics(self, keypoints: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes instantaneous kinematics from a single frame's named keypoints.
        """
        def get_pt(name: str) -> Optional[np.ndarray]:
            if name in keypoints and keypoints[name]["visibility"] >= 0.4:
                return np.array([keypoints[name]["x"], keypoints[name]["y"], keypoints[name]["z"]])
            return None

        l_hip, r_hip = get_pt("LEFT_HIP"), get_pt("RIGHT_HIP")
        l_knee, r_knee = get_pt("LEFT_KNEE"), get_pt("RIGHT_KNEE")
        l_ankle, r_ankle = get_pt("LEFT_ANKLE"), get_pt("RIGHT_ANKLE")
        l_foot, r_foot = get_pt("LEFT_FOOT_INDEX"), get_pt("RIGHT_FOOT_INDEX")
        l_shldr, r_shldr = get_pt("LEFT_SHOULDER"), get_pt("RIGHT_SHOULDER")

        kinematics = {}

        # 1. Left & Right Knee Flexion Angle
        if l_hip is not None and l_knee is not None and l_ankle is not None:
            kinematics["knee_angle_left"] = round(self._calculate_angle_3d(l_hip, l_knee, l_ankle), 2)
            kinematics["knee_valgus_left"] = self._calculate_valgus_angle(l_hip, l_knee, l_ankle, is_left=True)
        else:
            kinematics["knee_angle_left"] = None
            kinematics["knee_valgus_left"] = None

        if r_hip is not None and r_knee is not None and r_ankle is not None:
            kinematics["knee_angle_right"] = round(self._calculate_angle_3d(r_hip, r_knee, r_ankle), 2)
            kinematics["knee_valgus_right"] = self._calculate_valgus_angle(r_hip, r_knee, r_ankle, is_left=False)
        else:
            kinematics["knee_angle_right"] = None
            kinematics["knee_valgus_right"] = None

        # 2. Left & Right Ankle Flexion
        if l_knee is not None and l_ankle is not None and l_foot is not None:
            kinematics["ankle_angle_left"] = round(self._calculate_angle_3d(l_knee, l_ankle, l_foot), 2)
        else:
            kinematics["ankle_angle_left"] = None

        if r_knee is not None and r_ankle is not None and r_foot is not None:
            kinematics["ankle_angle_right"] = round(self._calculate_angle_3d(r_knee, r_ankle, r_foot), 2)
        else:
            kinematics["ankle_angle_right"] = None

        # 3. Left & Right Hip Flexion
        if l_shldr is not None and l_hip is not None and l_knee is not None:
            kinematics["hip_angle_left"] = round(self._calculate_angle_3d(l_shldr, l_hip, l_knee), 2)
        else:
            kinematics["hip_angle_left"] = None

        if r_shldr is not None and r_hip is not None and r_knee is not None:
            kinematics["hip_angle_right"] = round(self._calculate_angle_3d(r_shldr, r_hip, r_knee), 2)
        else:
            kinematics["hip_angle_right"] = None

        # 4. Trunk Lean Angle (relative to vertical gravity vector [0, -1])
        if l_shldr is not None and r_shldr is not None and l_hip is not None and r_hip is not None:
            mid_shldr = (l_shldr + r_shldr) / 2.0
            mid_hip = (l_hip + r_hip) / 2.0
            trunk_v = mid_shldr[:2] - mid_hip[:2]  # in 2D
            vert_v = np.array([0.0, -1.0])
            norm_t = np.linalg.norm(trunk_v)
            if norm_t > 0:
                trunk_angle = float(np.degrees(np.arccos(np.clip(np.dot(trunk_v, vert_v) / norm_t, -1.0, 1.0))))
                kinematics["trunk_lean_deg"] = round(trunk_angle, 2)
            else:
                kinematics["trunk_lean_deg"] = 0.0
        else:
            kinematics["trunk_lean_deg"] = None

        # 5. Bilateral Knee Asymmetry (%)
        kl, kr = kinematics.get("knee_angle_left"), kinematics.get("knee_angle_right")
        if kl is not None and kr is not None:
            denom = max(kl, kr, 1.0)
            asymmetry = (abs(kl - kr) / denom) * 100.0
            kinematics["bilateral_knee_asymmetry_pct"] = round(asymmetry, 2)
        else:
            kinematics["bilateral_knee_asymmetry_pct"] = None

        return kinematics
