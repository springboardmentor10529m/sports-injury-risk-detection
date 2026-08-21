"""
SafeMove Kinematics Engine.
Computes mathematical 3-point joint angles, angular velocities,
accelerations, and bilateral asymmetry indexes from landmark timeseries.
"""
import math
from typing import Dict, List, Any, Optional, Tuple
import numpy as np


class KinematicsEngine:
    """Mathematical biomechanics engine for athletic movement analysis."""

    @staticmethod
    def calculate_3point_angle(
        point_a: Dict[str, float],
        point_b: Dict[str, float],
        point_c: Dict[str, float],
        dimension: int = 3
    ) -> Optional[float]:
        """
        Calculate the angle at vertex point_b formed by segments (A-B) and (C-B).
        
        Formula:
            theta = arccos( (u . v) / (||u|| * ||v||) )
            
        Args:
            point_a: First endpoint (e.g. Hip)
            point_b: Joint center vertex (e.g. Knee)
            point_c: Second endpoint (e.g. Ankle)
            dimension: 2 for planar (x, y) or 3 for spatial (x, y, z)
            
        Returns:
            Angle in degrees [0.0, 180.0], or None if points are invalid or zero-length.
        """
        if not point_a or not point_b or not point_c:
            return None

        # Check visibility / presence if provided
        for pt in [point_a, point_b, point_c]:
            if pt.get("visibility", 1.0) < 0.2:
                return None

        if dimension == 2:
            u = np.array([point_a["x"] - point_b["x"], point_a["y"] - point_b["y"]], dtype=np.float64)
            v = np.array([point_c["x"] - point_b["x"], point_c["y"] - point_b["y"]], dtype=np.float64)
        else:
            u = np.array([
                point_a["x"] - point_b["x"],
                point_a["y"] - point_b["y"],
                point_a.get("z", 0.0) - point_b.get("z", 0.0)
            ], dtype=np.float64)
            v = np.array([
                point_c["x"] - point_b["x"],
                point_c["y"] - point_b["y"],
                point_c.get("z", 0.0) - point_b.get("z", 0.0)
            ], dtype=np.float64)

        norm_u = np.linalg.norm(u)
        norm_v = np.linalg.norm(v)

        # Handle zero-length vectors safely
        if norm_u < 1e-7 or norm_v < 1e-7:
            return None

        # Numerical clamping to [-1.0, 1.0] before arccos
        cos_theta = np.dot(u, v) / (norm_u * norm_v)
        cos_theta = max(-1.0, min(1.0, float(cos_theta)))

        angle_rad = math.acos(cos_theta)
        return round(math.degrees(angle_rad), 2)

    @staticmethod
    def calculate_trunk_lean(
        left_shoulder: Dict[str, float],
        right_shoulder: Dict[str, float],
        left_hip: Dict[str, float],
        right_hip: Dict[str, float]
    ) -> Optional[float]:
        """
        Calculate forward trunk lean (angle of spine vector relative to vertical).
        """
        if not left_shoulder or not right_shoulder or not left_hip or not right_hip:
            return None

        # Mid-shoulder and mid-hip points
        mid_shoulder = {
            "x": (left_shoulder["x"] + right_shoulder["x"]) / 2.0,
            "y": (left_shoulder["y"] + right_shoulder["y"]) / 2.0,
            "z": (left_shoulder.get("z", 0.0) + right_shoulder.get("z", 0.0)) / 2.0,
        }
        mid_hip = {
            "x": (left_hip["x"] + right_hip["x"]) / 2.0,
            "y": (left_hip["y"] + right_hip["y"]) / 2.0,
            "z": (left_hip.get("z", 0.0) + right_hip.get("z", 0.0)) / 2.0,
        }

        # Spine vector (from hip pointing up to shoulder)
        spine = np.array([
            mid_shoulder["x"] - mid_hip["x"],
            mid_shoulder["y"] - mid_hip["y"],
            mid_shoulder["z"] - mid_hip["z"]
        ], dtype=np.float64)

        # In image coords, up is (0, -1, 0)
        vertical = np.array([0.0, -1.0, 0.0], dtype=np.float64)

        norm_spine = np.linalg.norm(spine)
        if norm_spine < 1e-7:
            return None

        cos_angle = np.dot(spine, vertical) / norm_spine
        cos_angle = max(-1.0, min(1.0, float(cos_angle)))
        return round(math.degrees(math.acos(cos_angle)), 2)

    @staticmethod
    def calculate_trunk_lateral_tilt(
        left_shoulder: Dict[str, float],
        right_shoulder: Dict[str, float]
    ) -> Optional[float]:
        """
        Calculate lateral shoulder tilt relative to horizontal ground line.
        """
        if not left_shoulder or not right_shoulder:
            return None

        dx = right_shoulder["x"] - left_shoulder["x"]
        dy = right_shoulder["y"] - left_shoulder["y"]

        norm = math.hypot(dx, dy)
        if norm < 1e-7:
            return None

        # Angle relative to horizontal (dy / dx)
        tilt_deg = math.degrees(math.atan2(dy, dx))
        return round(abs(tilt_deg), 2)

    @staticmethod
    def calculate_knee_valgus_proxy(
        hip: Dict[str, float],
        knee: Dict[str, float],
        ankle: Dict[str, float]
    ) -> Optional[float]:
        """
        Calculate 2D frontal plane projection angle deviation (Knee Valgus / Varus Proxy).
        Deviation from straight line (180 - angle_2d).
        """
        angle_2d = KinematicsEngine.calculate_3point_angle(hip, knee, ankle, dimension=2)
        if angle_2d is None:
            return None
        # Valgus displacement deviation in degrees
        return round(abs(180.0 - angle_2d), 2)

    @staticmethod
    def calculate_asymmetry_index(left_val: Optional[float], right_val: Optional[float]) -> Optional[float]:
        """
        Compute Bilateral Asymmetry Index percentage:
            AI (%) = |L - R| / ((|L| + |R|) / 2) * 100
        """
        if left_val is None or right_val is None:
            return None

        denom = (abs(left_val) + abs(right_val)) / 2.0
        if denom < 1e-7:
            return 0.0

        return round((abs(left_val - right_val) / denom) * 100.0, 2)

    @staticmethod
    def calculate_derivative(values: List[Optional[float]], timestamps: List[float]) -> List[Optional[float]]:
        """
        Calculate numerical derivative (dValues / dt) handling irregular timestamps and missing entries.
        """
        n = len(values)
        if n < 2 or len(timestamps) != n:
            return [None] * n

        derivatives: List[Optional[float]] = [None] * n

        for i in range(n):
            if values[i] is None:
                continue

            if i == 0:
                # Forward difference
                if values[1] is not None:
                    dt = max(1e-4, timestamps[1] - timestamps[0])
                    derivatives[0] = round((values[1] - values[0]) / dt, 2)
            elif i == n - 1:
                # Backward difference
                if values[n - 2] is not None:
                    dt = max(1e-4, timestamps[n - 1] - timestamps[n - 2])
                    derivatives[n - 1] = round((values[n - 1] - values[n - 2]) / dt, 2)
            else:
                # Central difference
                prev_val = values[i - 1]
                next_val = values[i + 1]
                if prev_val is not None and next_val is not None:
                    dt = max(1e-4, timestamps[i + 1] - timestamps[i - 1])
                    derivatives[i] = round((next_val - prev_val) / dt, 2)
                elif next_val is not None:
                    dt = max(1e-4, timestamps[i + 1] - timestamps[i])
                    derivatives[i] = round((next_val - values[i]) / dt, 2)
                elif prev_val is not None:
                    dt = max(1e-4, timestamps[i] - timestamps[i - 1])
                    derivatives[i] = round((values[i] - prev_val) / dt, 2)

        return derivatives

    def process_frames(self, pose_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute full kinematic angle curves, velocities, accelerations, and asymmetries
        for an entire pose landmark sequence.
        """
        frames = pose_data.get("frames", [])
        if not frames:
            raise ValueError("Pose landmark frames are empty.")

        timestamps = [f["timestamp_seconds"] for f in frames]
        n_frames = len(frames)

        # Initialize joint angle curves
        curves: Dict[str, List[Optional[float]]] = {
            "left_knee_angle": [],
            "right_knee_angle": [],
            "left_hip_angle": [],
            "right_hip_angle": [],
            "left_ankle_angle": [],
            "right_ankle_angle": [],
            "trunk_lean": [],
            "trunk_lateral_tilt": [],
            "left_knee_valgus": [],
            "right_knee_valgus": []
        }

        for frame in frames:
            lm = frame.get("landmarks", {})

            # Knee Flexion/Extension (Hip - Knee - Ankle)
            lk_angle = self.calculate_3point_angle(
                lm.get("LEFT_HIP"), lm.get("LEFT_KNEE"), lm.get("LEFT_ANKLE")
            )
            rk_angle = self.calculate_3point_angle(
                lm.get("RIGHT_HIP"), lm.get("RIGHT_KNEE"), lm.get("RIGHT_ANKLE")
            )
            curves["left_knee_angle"].append(lk_angle)
            curves["right_knee_angle"].append(rk_angle)

            # Hip Flexion (Shoulder - Hip - Knee)
            lh_angle = self.calculate_3point_angle(
                lm.get("LEFT_SHOULDER"), lm.get("LEFT_HIP"), lm.get("LEFT_KNEE")
            )
            rh_angle = self.calculate_3point_angle(
                lm.get("RIGHT_SHOULDER"), lm.get("RIGHT_HIP"), lm.get("RIGHT_KNEE")
            )
            curves["left_hip_angle"].append(lh_angle)
            curves["right_hip_angle"].append(rh_angle)

            # Ankle Angle (Knee - Ankle - Foot Index)
            la_angle = self.calculate_3point_angle(
                lm.get("LEFT_KNEE"), lm.get("LEFT_ANKLE"), lm.get("LEFT_FOOT_INDEX")
            )
            ra_angle = self.calculate_3point_angle(
                lm.get("RIGHT_KNEE"), lm.get("RIGHT_ANKLE"), lm.get("RIGHT_FOOT_INDEX")
            )
            curves["left_ankle_angle"].append(la_angle)
            curves["right_ankle_angle"].append(ra_angle)

            # Trunk lean and tilt
            t_lean = self.calculate_trunk_lean(
                lm.get("LEFT_SHOULDER"), lm.get("RIGHT_SHOULDER"),
                lm.get("LEFT_HIP"), lm.get("RIGHT_HIP")
            )
            t_tilt = self.calculate_trunk_lateral_tilt(
                lm.get("LEFT_SHOULDER"), lm.get("RIGHT_SHOULDER")
            )
            curves["trunk_lean"].append(t_lean)
            curves["trunk_lateral_tilt"].append(t_tilt)

            # Knee Valgus deviation proxy
            lv_angle = self.calculate_knee_valgus_proxy(
                lm.get("LEFT_HIP"), lm.get("LEFT_KNEE"), lm.get("LEFT_ANKLE")
            )
            rv_angle = self.calculate_knee_valgus_proxy(
                lm.get("RIGHT_HIP"), lm.get("RIGHT_KNEE"), lm.get("RIGHT_ANKLE")
            )
            curves["left_knee_valgus"].append(lv_angle)
            curves["right_knee_valgus"].append(rv_angle)

        # Compute Angular Velocities (deg/s) and Accelerations (deg/s^2)
        velocities: Dict[str, List[Optional[float]]] = {}
        accelerations: Dict[str, List[Optional[float]]] = {}

        for key, angle_series in curves.items():
            vel = self.calculate_derivative(angle_series, timestamps)
            acc = self.calculate_derivative(vel, timestamps)
            velocities[f"{key}_velocity"] = vel
            accelerations[f"{key}_acceleration"] = acc

        # Bilateral Asymmetry Timeseries & Peak Metrics
        knee_asymmetry_series = [
            self.calculate_asymmetry_index(lk, rk)
            for lk, rk in zip(curves["left_knee_angle"], curves["right_knee_angle"])
        ]
        hip_asymmetry_series = [
            self.calculate_asymmetry_index(lh, rh)
            for lh, rh in zip(curves["left_hip_angle"], curves["right_hip_angle"])
        ]
        valgus_asymmetry_series = [
            self.calculate_asymmetry_index(lv, rv)
            for lv, rv in zip(curves["left_knee_valgus"], curves["right_knee_valgus"])
        ]

        def get_valid_stats(series: List[Optional[float]]) -> Dict[str, Optional[float]]:
            valid = [v for v in series if v is not None]
            if not valid:
                return {"min": None, "max": None, "mean": None, "range": None}
            return {
                "min": round(float(np.min(valid)), 2),
                "max": round(float(np.max(valid)), 2),
                "mean": round(float(np.mean(valid)), 2),
                "range": round(float(np.ptp(valid)), 2)
            }

        summary_metrics = {
            "left_knee": get_valid_stats(curves["left_knee_angle"]),
            "right_knee": get_valid_stats(curves["right_knee_angle"]),
            "left_hip": get_valid_stats(curves["left_hip_angle"]),
            "right_hip": get_valid_stats(curves["right_hip_angle"]),
            "trunk_lean": get_valid_stats(curves["trunk_lean"]),
            "trunk_lateral_tilt": get_valid_stats(curves["trunk_lateral_tilt"]),
            "left_knee_valgus": get_valid_stats(curves["left_knee_valgus"]),
            "right_knee_valgus": get_valid_stats(curves["right_knee_valgus"]),
            "peak_knee_velocity_left": get_valid_stats(velocities["left_knee_angle_velocity"]).get("max"),
            "peak_knee_velocity_right": get_valid_stats(velocities["right_knee_angle_velocity"]).get("max"),
        }

        asymmetry_metrics = {
            "knee_flexion_asymmetry": {
                "timeseries": knee_asymmetry_series,
                "mean": get_valid_stats(knee_asymmetry_series).get("mean"),
                "peak": get_valid_stats(knee_asymmetry_series).get("max")
            },
            "hip_flexion_asymmetry": {
                "timeseries": hip_asymmetry_series,
                "mean": get_valid_stats(hip_asymmetry_series).get("mean"),
                "peak": get_valid_stats(hip_asymmetry_series).get("max")
            },
            "knee_valgus_asymmetry": {
                "timeseries": valgus_asymmetry_series,
                "mean": get_valid_stats(valgus_asymmetry_series).get("mean"),
                "peak": get_valid_stats(valgus_asymmetry_series).get("max")
            }
        }

        return {
            "timestamps": timestamps,
            "joint_angle_curves": curves,
            "angular_velocities": velocities,
            "angular_accelerations": accelerations,
            "asymmetry_metrics": asymmetry_metrics,
            "summary_metrics": summary_metrics
        }


def get_kinematics_engine() -> KinematicsEngine:
    """Singleton/helper provider for KinematicsEngine."""
    return KinematicsEngine()
