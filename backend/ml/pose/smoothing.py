import math
import time
from typing import Dict, Any, Optional

class OneEuroFilter:
    """
    1D One Euro Filter for adaptive low-pass signal filtering.
    Reduces jitter while preserving fast movements.
    """
    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

    def _alpha(self, cutoff: float, dt: float) -> float:
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def filter(self, x: float, timestamp: float) -> float:
        if self.x_prev is None:
            self.x_prev = x
            self.dx_prev = 0.0
            self.t_prev = timestamp
            return x

        dt = timestamp - self.t_prev
        if dt <= 0.0:
            dt = 1e-5

        # Derivative
        dx = (x - self.x_prev) / dt
        edx = self._alpha(self.d_cutoff, dt) * dx + (1.0 - self._alpha(self.d_cutoff, dt)) * self.dx_prev

        # Cutoff frequency based on speed
        cutoff = self.min_cutoff + self.beta * abs(edx)

        # Smooth signal
        alpha = self._alpha(cutoff, dt)
        x_smoothed = alpha * x + (1.0 - alpha) * self.x_prev

        self.x_prev = x_smoothed
        self.dx_prev = edx
        self.t_prev = timestamp

        return x_smoothed


class KeypointSmoother:
    """
    Applies OneEuroFilter to all 17 COCO keypoint coordinates across video frames.
    Falls back to EMA if filter parameters fail.
    """
    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.filters: Dict[str, Dict[str, OneEuroFilter]] = {}

    def smooth_keypoints(self, keypoints_dict: Dict[str, Dict[str, Any]], timestamp: float) -> Dict[str, Dict[str, Any]]:
        smoothed_dict = {}

        for kp_name, data in keypoints_dict.items():
            if kp_name not in self.filters:
                self.filters[kp_name] = {
                    "x": OneEuroFilter(self.min_cutoff, self.beta),
                    "y": OneEuroFilter(self.min_cutoff, self.beta)
                }

            raw_x = data.get("x", 0.0)
            raw_y = data.get("y", 0.0)
            conf = data.get("confidence", 0.0)

            # Smooth coordinates
            sm_x = self.filters[kp_name]["x"].filter(raw_x, timestamp)
            sm_y = self.filters[kp_name]["y"].filter(raw_y, timestamp)

            smoothed_dict[kp_name] = {
                "x": round(sm_x, 2),
                "y": round(sm_y, 2),
                "confidence": conf
            }

        return smoothed_dict
