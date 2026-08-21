"""Tests for kinematics calculations, pose extraction, and pipeline endpoints."""

import uuid

import numpy as np
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.athlete import AthleteProfile
from app.models.user import User
from app.services.kinematics_engine import KinematicsEngine
from tests.conftest import auth_header
from tests.test_videos import VALID_MP4_BYTES

# --- Unit Tests: Mathematical Formulas ---


def test_angle_90_degrees():
    """Verify 90-degree orthogonal angle calculation."""
    pt_a = {"x": 0.0, "y": 1.0, "z": 0.0}
    pt_b = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_c = {"x": 1.0, "y": 0.0, "z": 0.0}

    angle = KinematicsEngine.calculate_3point_angle(pt_a, pt_b, pt_c)
    assert angle is not None
    assert abs(angle - 90.0) < 1e-2


def test_angle_180_straight_angle():
    """Verify 180-degree straight line angle calculation."""
    pt_a = {"x": -1.0, "y": 0.0, "z": 0.0}
    pt_b = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_c = {"x": 1.0, "y": 0.0, "z": 0.0}

    angle = KinematicsEngine.calculate_3point_angle(pt_a, pt_b, pt_c)
    assert angle is not None
    assert abs(angle - 180.0) < 1e-2


def test_angle_0_collinear():
    """Verify 0-degree angle calculation when rays coincide."""
    pt_a = {"x": 1.0, "y": 0.0, "z": 0.0}
    pt_b = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_c = {"x": 2.0, "y": 0.0, "z": 0.0}

    angle = KinematicsEngine.calculate_3point_angle(pt_a, pt_b, pt_c)
    assert angle is not None
    assert abs(angle - 0.0) < 1e-2


def test_angle_zero_length_vector():
    """Verify safe handling of zero-length vector (point coincides with vertex)."""
    pt_a = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_b = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_c = {"x": 1.0, "y": 1.0, "z": 0.0}

    angle = KinematicsEngine.calculate_3point_angle(pt_a, pt_b, pt_c)
    assert angle is None


def test_cosine_numerical_clamping():
    """Verify that floating point imprecision (> 1.0) is safely clamped and doesn't raise math domain error."""
    # Near collinear points
    pt_a = {"x": 1.0000000000000002, "y": 0.0, "z": 0.0}
    pt_b = {"x": 0.0, "y": 0.0, "z": 0.0}
    pt_c = {"x": 2.0000000000000004, "y": 0.0, "z": 0.0}

    angle = KinematicsEngine.calculate_3point_angle(pt_a, pt_b, pt_c)
    assert angle is not None
    assert abs(angle - 0.0) < 1e-2


def test_derivative_angular_velocity():
    """Verify numerical derivative for angular velocity."""
    timestamps = [0.0, 0.1, 0.2, 0.3, 0.4]
    # Linear increase of 10 degrees every 0.1s -> velocity = 100 deg/s
    angles = [10.0, 20.0, 30.0, 40.0, 50.0]

    velocities = KinematicsEngine.calculate_derivative(angles, timestamps)
    assert len(velocities) == 5
    for vel in velocities:
        assert vel is not None
        assert abs(vel - 100.0) < 1e-2


def test_derivative_angular_acceleration():
    """Verify numerical derivative for angular acceleration."""
    timestamps = [0.0, 0.1, 0.2, 0.3, 0.4]
    # Linear increase in velocity (100, 110, 120, 130, 140) -> acceleration = 100 deg/s^2
    velocities = [100.0, 110.0, 120.0, 130.0, 140.0]

    accelerations = KinematicsEngine.calculate_derivative(velocities, timestamps)
    assert len(accelerations) == 5
    for acc in accelerations:
        assert acc is not None
        assert abs(acc - 100.0) < 1e-2


def test_asymmetry_index_zero():
    """Verify asymmetry index is 0.0% when bilateral values are identical."""
    ai = KinematicsEngine.calculate_asymmetry_index(90.0, 90.0)
    assert ai == 0.0


def test_asymmetry_index_known_value():
    """Verify asymmetry index: |100 - 80| / 90 * 100 = 22.22%."""
    ai = KinematicsEngine.calculate_asymmetry_index(100.0, 80.0)
    assert ai is not None
    assert abs(ai - 22.22) < 1e-2


def test_asymmetry_both_zero():
    """Verify asymmetry index handles 0.0 without division by zero error."""
    ai = KinematicsEngine.calculate_asymmetry_index(0.0, 0.0)
    assert ai == 0.0


def test_trunk_lean_and_tilt():
    """Verify trunk lean and lateral tilt formulas."""
    left_sh = {"x": 0.4, "y": 0.2, "z": 0.0}
    right_sh = {"x": 0.6, "y": 0.2, "z": 0.0}
    left_hip = {"x": 0.4, "y": 0.6, "z": 0.0}
    right_hip = {"x": 0.6, "y": 0.6, "z": 0.0}

    # Perfectly upright trunk
    lean = KinematicsEngine.calculate_trunk_lean(left_sh, right_sh, left_hip, right_hip)
    assert lean is not None
    assert abs(lean - 0.0) < 1e-2

    # Horizontal shoulders -> 0 degree tilt
    tilt = KinematicsEngine.calculate_trunk_lateral_tilt(left_sh, right_sh)
    assert tilt is not None
    assert abs(tilt - 0.0) < 1e-2


# --- Integration Tests: Video Processing Pipeline ---


@pytest.fixture
async def athlete_profile_1(db_session: AsyncSession, test_user: User) -> AthleteProfile:
    """Create athlete profile for test_user."""
    profile = AthleteProfile(id=uuid.uuid4(), user_id=test_user.id, sport="Basketball", position="Guard")
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.fixture
async def athlete_profile_2(db_session: AsyncSession) -> AthleteProfile:
    """Create a second athlete profile."""
    from app.core.rbac import UserRole
    from app.core.security import hash_password

    second_user = User(
        id=uuid.uuid4(),
        email="athlete_other@test.com",
        password_hash=hash_password("testpass123"),
        full_name="Athlete Other",
        role=UserRole.ATHLETE,
    )
    db_session.add(second_user)
    await db_session.commit()
    await db_session.refresh(second_user)

    profile = AthleteProfile(id=uuid.uuid4(), user_id=second_user.id, sport="Soccer")
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.mark.asyncio
async def test_pipeline_unauthorized_processing(
    client: AsyncClient,
    test_user: User,
    athlete_profile_2: AthleteProfile,
    coach_user: User,
):
    """Test: Athlete 1 cannot trigger processing on Athlete 2's video."""
    # Coach uploads video for Athlete 2
    upload_res = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("drill.mp4", VALID_MP4_BYTES, "video/mp4")},
        data={"athlete_id": str(athlete_profile_2.id)},
        headers=auth_header(coach_user),
    )
    assert upload_res.status_code == 201
    video_id = upload_res.json()["id"]

    # Athlete 1 attempts to process Athlete 2's video -> 403
    process_res = await client.post(f"/api/v1/videos/{video_id}/process", headers=auth_header(test_user))
    assert process_res.status_code == 403


@pytest.mark.asyncio
async def test_pipeline_missing_video(client: AsyncClient, test_user: User):
    """Test: Processing non-existent video returns 404."""
    random_id = str(uuid.uuid4())
    res = await client.post(f"/api/v1/videos/{random_id}/process", headers=auth_header(test_user))
    assert res.status_code == 404


def generate_test_video_bytes() -> bytes:
    """Generate a minimal real 10-frame MP4 video binary using OpenCV."""
    import os
    import tempfile

    import cv2

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(tmp_path, fourcc, 10.0, (320, 240))
        for i in range(10):
            frame = np.zeros((240, 320, 3), dtype=np.uint8)
            # Draw a simple stick figure for detection
            cv2.circle(frame, (160, 40), 15, (255, 255, 255), -1)  # Head
            cv2.line(frame, (160, 55), (160, 140), (255, 255, 255), 3)  # Torso
            cv2.line(frame, (160, 70), (120, 100), (255, 255, 255), 2)  # Left arm
            cv2.line(frame, (160, 70), (200, 100), (255, 255, 255), 2)  # Right arm
            cv2.line(frame, (160, 140), (130, 200), (255, 255, 255), 2)  # Left leg
            cv2.line(frame, (160, 140), (190, 200), (255, 255, 255), 2)  # Right leg
            out.write(frame)
        out.release()

        with open(tmp_path, "rb") as f:
            data = f.read()
        return data
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@pytest.mark.asyncio
async def test_pipeline_real_processing_and_retrieval(
    client: AsyncClient, test_user: User, athlete_profile_1: AthleteProfile
):
    """Test: Upload valid video, run process pipeline, and fetch keypoints + kinematics."""
    real_video_bytes = generate_test_video_bytes()

    # 1. Upload video
    upload_res = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("jump.mp4", real_video_bytes, "video/mp4")},
        data={"sport_type": "Jump Test"},
        headers=auth_header(test_user),
    )
    assert upload_res.status_code == 201
    video_id = upload_res.json()["id"]

    # 2. Trigger pipeline processing
    process_res = await client.post(f"/api/v1/videos/{video_id}/process", headers=auth_header(test_user))
    assert process_res.status_code == 200
    p_data = process_res.json()
    assert p_data["id"] == video_id
    assert p_data["status"] == "ANALYZED"

    # 3. Retrieve Keypoints
    keypoints_res = await client.get(f"/api/v1/videos/{video_id}/keypoints", headers=auth_header(test_user))
    assert keypoints_res.status_code == 200
    kp_data = keypoints_res.json()
    assert kp_data["video_id"] == video_id
    assert "frames" in kp_data
    assert len(kp_data["frames"]) > 0
    assert "landmarks" in kp_data["frames"][0]

    # 4. Retrieve Kinematics
    kinematics_res = await client.get(f"/api/v1/analysis/{video_id}/kinematics", headers=auth_header(test_user))
    assert kinematics_res.status_code == 200
    kin_data = kinematics_res.json()
    assert kin_data["video_id"] == video_id
    assert "joint_angle_curves" in kin_data
    assert "left_knee_angle" in kin_data["joint_angle_curves"]
    assert "right_knee_angle" in kin_data["joint_angle_curves"]
    assert "asymmetry_metrics" in kin_data
    assert "knee_flexion_asymmetry" in kin_data["asymmetry_metrics"]
