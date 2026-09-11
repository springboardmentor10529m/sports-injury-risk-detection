import math
from typing import Tuple, Dict, Any, Optional

def calculate_angle_3pt(
    pA: Tuple[float, float],
    pB: Tuple[float, float],
    pC: Tuple[float, float]
) -> float:
    """
    Calculates the 2D interior angle at vertex point B formed by segments BA and BC in degrees [0, 180].
    pA, pB, pC are (x, y) coordinates.
    """
    ba = (pA[0] - pB[0], pA[1] - pB[1])
    bc = (pC[0] - pB[0], pC[1] - pB[1])

    dot_product = ba[0] * bc[0] + ba[1] * bc[1]
    magnitude_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    magnitude_bc = math.sqrt(bc[0]**2 + bc[1]**2)

    if magnitude_ba == 0.0 or magnitude_bc == 0.0:
        return 0.0

    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    # Clip to [-1.0, 1.0] to prevent math domain error due to floating point precision
    cosine_angle = max(-1.0, min(1.0, cosine_angle))

    angle_rad = math.acos(cosine_angle)
    return float(math.degrees(angle_rad))


def calculate_line_angle_horizontal(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculates tilt angle of line segment (p1 -> p2) relative to horizontal axis in degrees.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    angle_rad = math.atan2(dy, dx)
    return float(math.degrees(angle_rad))


def calculate_line_angle_vertical(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """
    Calculates lean angle of vector (p1 -> p2) relative to true vertical axis in degrees.
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    # Vertical axis vector is (0, -1) in screen space where Y points down
    dot = dy * (-1.0)
    mag = math.sqrt(dx**2 + dy**2)
    if mag == 0.0:
        return 0.0
    cos_val = max(-1.0, min(1.0, dot / mag))
    return float(math.degrees(math.acos(cos_val)))


def normalize_coordinates(
    keypoints: Dict[str, Dict[str, Any]],
    frame_width: int,
    frame_height: int
) -> Dict[str, Dict[str, Any]]:
    """
    Computes normalized (0.0 to 1.0) coordinates for all keypoints.
    """
    if frame_width <= 0 or frame_height <= 0:
        return keypoints

    normalized = {}
    for kp_name, data in keypoints.items():
        px = data.get("x", 0.0)
        py = data.get("y", 0.0)
        conf = data.get("confidence", 0.0)

        normalized[kp_name] = {
            "pixel_x": px,
            "pixel_y": py,
            "normalized_x": round(px / float(frame_width), 4),
            "normalized_y": round(py / float(frame_height), 4),
            "confidence": conf
        }

    return normalized
