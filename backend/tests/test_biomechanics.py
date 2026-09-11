import pytest
from ml.biomechanics.geometry import calculate_angle_3pt, normalize_coordinates
from ml.biomechanics.joint_angles import compute_all_joint_angles
from ml.biomechanics.kinematics import KinematicsCalculator
from ml.biomechanics.symmetry import compute_symmetry_metrics
from ml.biomechanics.feature_extractor import BiomechanicsFeatureExtractor

def test_angle_3pt_right_angle():
    pA = (0.0, 1.0)
    pB = (0.0, 0.0)
    pC = (1.0, 0.0)
    angle = calculate_angle_3pt(pA, pB, pC)
    assert abs(angle - 90.0) < 0.1

def test_angle_3pt_straight_line():
    pA = (0.0, 1.0)
    pB = (0.0, 0.0)
    pC = (0.0, -1.0)
    angle = calculate_angle_3pt(pA, pB, pC)
    assert abs(angle - 180.0) < 0.1

def test_normalize_coordinates():
    kps = {
        "left_knee": {"x": 320.0, "y": 240.0, "confidence": 0.95}
    }
    norm = normalize_coordinates(kps, frame_width=640, frame_height=480)
    assert norm["left_knee"]["normalized_x"] == 0.5
    assert norm["left_knee"]["normalized_y"] == 0.5

def test_compute_all_joint_angles():
    kps = {
        "left_hip": {"x": 100, "y": 100},
        "left_knee": {"x": 100, "y": 200},
        "left_ankle": {"x": 200, "y": 200},
        "right_hip": {"x": 300, "y": 100},
        "right_knee": {"x": 300, "y": 200},
        "right_ankle": {"x": 400, "y": 200},
        "left_shoulder": {"x": 100, "y": 50},
        "right_shoulder": {"x": 300, "y": 50},
        "left_elbow": {"x": 50, "y": 50},
        "right_elbow": {"x": 350, "y": 50},
        "left_wrist": {"x": 50, "y": 100},
        "right_wrist": {"x": 350, "y": 100}
    }
    angles = compute_all_joint_angles(kps)
    assert "left_knee_angle" in angles
    assert "right_knee_angle" in angles
    assert "trunk_lean_angle" in angles
    assert "lower_limb_asymmetry_index" not in angles # Symmetry separate

def test_symmetry_metrics():
    angles = {
        "left_knee_angle": 120.0,
        "right_knee_angle": 130.0,
        "left_hip_angle": 170.0,
        "right_hip_angle": 165.0,
        "left_ankle_angle": 90.0,
        "right_ankle_angle": 90.0
    }
    sym = compute_symmetry_metrics(angles)
    assert sym["knee_asymmetry_deg"] == 10.0
    assert sym["hip_asymmetry_deg"] == 5.0
    assert sym["ankle_asymmetry_deg"] == 0.0

def test_kinematics_calculator():
    calc = KinematicsCalculator()
    kps = {"left_knee": {"normalized_x": 0.5, "normalized_y": 0.5}}
    angles1 = {"left_knee_angle": 90.0}
    angles2 = {"left_knee_angle": 100.0}

    kin1 = calc.compute_kinematics(angles1, kps, timestamp=0.0)
    kin2 = calc.compute_kinematics(angles2, kps, timestamp=0.1) # 10 deg in 0.1s = 100 deg/s

    assert kin2["angular_velocity"]["left_knee_angle"] == 100.0
