from typing import Dict, Any, Optional, List

class KinematicsCalculator:
    """
    Computes image-derived joint angular velocities, angular accelerations,
    and relative normalized centroid movement velocities frame-to-frame.
    """
    def __init__(self):
        self.prev_angles: Optional[Dict[str, float]] = None
        self.prev_angular_velocities: Optional[Dict[str, float]] = None
        self.prev_centroid: Optional[List[float]] = None
        self.prev_centroid_velocity: float = 0.0
        self.prev_timestamp: Optional[float] = None

    def compute_kinematics(
        self,
        current_angles: Dict[str, float],
        normalized_keypoints: Dict[str, Dict[str, Any]],
        timestamp: float
    ) -> Dict[str, Any]:
        kinematics = {
            "angular_velocity": {},      # deg / sec
            "angular_acceleration": {},  # deg / sec^2
            "relative_movement_velocity": 0.0,      # norm_units / sec
            "relative_movement_acceleration": 0.0   # norm_units / sec^2
        }

        # Initialize defaults for all joint names
        for joint in current_angles.keys():
            kinematics["angular_velocity"][joint] = 0.0
            kinematics["angular_acceleration"][joint] = 0.0

        if self.prev_timestamp is None:
            self._update_state(current_angles, kinematics["angular_velocity"], normalized_keypoints, 0.0, timestamp)
            return kinematics

        dt = timestamp - self.prev_timestamp
        if dt <= 0.0:
            dt = 1e-4

        # 1. Angular Velocity and Acceleration
        angular_vels = {}
        angular_accels = {}

        for joint, curr_angle in current_angles.items():
            prev_angle = self.prev_angles.get(joint, curr_angle) if self.prev_angles else curr_angle
            omega = (curr_angle - prev_angle) / dt
            angular_vels[joint] = round(omega, 2)

            prev_omega = self.prev_angular_velocities.get(joint, omega) if self.prev_angular_velocities else omega
            alpha = (omega - prev_omega) / dt
            angular_accels[joint] = round(alpha, 2)

        kinematics["angular_velocity"] = angular_vels
        kinematics["angular_acceleration"] = angular_accels

        # 2. Relative Centroid Movement Velocity & Acceleration (Normalized units)
        xs = [v["normalized_x"] for v in normalized_keypoints.values() if "normalized_x" in v]
        ys = [v["normalized_y"] for v in normalized_keypoints.values() if "normalized_y" in v]

        if xs and ys:
            curr_centroid = [sum(xs) / len(xs), sum(ys) / len(ys)]
            if self.prev_centroid:
                dx = curr_centroid[0] - self.prev_centroid[0]
                dy = curr_centroid[1] - self.prev_centroid[1]
                dist = (dx**2 + dy**2) ** 0.5
                rel_vel = dist / dt
                rel_accel = (rel_vel - self.prev_centroid_velocity) / dt

                kinematics["relative_movement_velocity"] = round(rel_vel, 4)
                kinematics["relative_movement_acceleration"] = round(rel_accel, 4)
                self.prev_centroid_velocity = rel_vel
            self.prev_centroid = curr_centroid

        self._update_state(current_angles, angular_vels, normalized_keypoints, kinematics["relative_movement_velocity"], timestamp)
        return kinematics

    def _update_state(
        self,
        angles: Dict[str, float],
        angular_vels: Dict[str, float],
        normalized_kps: Dict[str, Dict[str, Any]],
        rel_vel: float,
        timestamp: float
    ):
        self.prev_angles = angles.copy()
        self.prev_angular_velocities = angular_vels.copy()
        self.prev_timestamp = timestamp
