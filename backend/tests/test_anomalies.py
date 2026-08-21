"""Tests for Biomechanical Anomaly Detection, Independent Statistics, Baselines, and API."""
import uuid
import pytest
import numpy as np
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_header
from tests.test_kinematics import generate_test_video_bytes
from app.models.athlete import AthleteProfile
from app.models.user import User
from app.core.baselines import (
    MovementBaseline,
    BaselineRegistry,
    SeverityRuleConfig,
    DerivationStrategy,
    get_baseline_registry
)
from app.models.analysis import AnomalySeverity
from app.services.anomaly_detection_service import AnomalyDetectionService


# --- Unit Tests: Feature Extraction & Statistics ---

def test_feature_summary_calculation():
    """Verify statistical feature extraction: min, max, mean, median, std, range, velocity."""
    timestamps = [0.0, 0.1, 0.2, 0.3, 0.4]
    joint_angles = {
        "left_knee_angle": [80.0, 90.0, 100.0, 110.0, 120.0]
    }
    angular_velocities = {
        "left_knee_angle_velocity": [100.0, 100.0, 100.0, 100.0, 100.0]
    }

    summary = AnomalyDetectionService.extract_feature_summary(
        timestamps=timestamps,
        joint_angles=joint_angles,
        angular_velocities=angular_velocities,
    )

    assert "left_knee_angle" in summary
    stats = summary["left_knee_angle"]
    assert stats["min"] == 80.0
    assert stats["max"] == 120.0
    assert stats["mean"] == 100.0
    assert stats["median"] == 100.0
    assert stats["range"] == 40.0
    assert stats["peak_velocity"] == 100.0


def test_feature_summary_empty_and_nan():
    """Verify safe handling of empty and NaN values."""
    timestamps = [0.0, 0.1]
    joint_angles = {
        "left_knee_angle": [None, float("nan")]
    }

    summary = AnomalyDetectionService.extract_feature_summary(
        timestamps=timestamps,
        joint_angles=joint_angles
    )

    stats = summary["left_knee_angle"]
    assert stats["min"] is None
    assert stats["mean"] is None
    assert stats["range"] is None


def test_temporal_peaks_detection():
    """Verify accurate detection of peak timestamps."""
    timestamps = [0.0, 0.5, 1.0, 1.5, 2.0]
    joint_angles = {
        "trunk_lean": [10.0, 15.0, 32.5, 20.0, 12.0],  # Peak at t=1.0s (32.5 deg)
        "left_knee_valgus": [2.0, 3.0, 4.0, 14.2, 5.0],  # Peak at t=1.5s (14.2 deg)
    }

    peaks = AnomalyDetectionService.detect_temporal_peaks(
        timestamps=timestamps,
        joint_angles=joint_angles
    )

    assert peaks["trunk_lean"]["peak_value"] == 32.5
    assert peaks["trunk_lean"]["timestamp_seconds"] == 1.0

    assert peaks["left_knee_valgus"]["peak_value"] == 14.2
    assert peaks["left_knee_valgus"]["timestamp_seconds"] == 1.5


# --- Unit Tests: Independent Statistical Calculations ---

def test_independent_statistics_calculation():
    """Verify each metric (Z-score, percent deviation, range deviation) is calculated independently."""
    service = AnomalyDetectionService()
    baseline = MovementBaseline(
        metric_key="knee_flexion_rom",
        display_name="Knee Flexion ROM",
        category="Lower Limb Kinematics",
        unit="°",
        mean=120.0,
        std_dev=15.0,
        min_norm=90.0,
        max_norm=145.0
    )

    # Observed 104.2 deg:
    # Z = (104.2 - 120.0) / 15.0 = -1.053
    # Pct = |104.2 - 120.0| / 120.0 * 100 = 13.17%
    dev = service.calculate_deviation(104.2, baseline)

    assert dev["metric"] == "KNEE_FLEXION_ROM"
    assert dev["observed"] == 104.2
    assert dev["baseline_mean"] == 120.0
    assert dev["baseline_std"] == 15.0
    assert abs(dev["z_score"] - (-1.05)) < 1e-2
    assert abs(dev["percent_deviation"] - 13.17) < 1e-2
    assert dev["range_deviation"] == 0.0
    assert dev["is_out_of_range"] is False
    assert dev["severity"] == AnomalySeverity.MILD_DEVIATION.value
    assert "Z-score rule" in dev["severity_derivation_rule"]
    assert dev["baseline_type"] == "DEVELOPMENTAL"


def test_severity_derivation_rule_execution():
    """Verify clearly documented severity derivation rule outputs."""
    service = AnomalyDetectionService()
    baseline = MovementBaseline(
        metric_key="test_metric",
        display_name="Test Metric",
        category="Test",
        unit="°",
        mean=100.0,
        std_dev=10.0,
        min_norm=80.0,
        max_norm=120.0
    )

    # Z = +0.5 <= 1.0 -> NORMAL
    dev_norm = service.calculate_deviation(105.0, baseline)
    assert dev_norm["severity"] == AnomalySeverity.NORMAL.value
    assert "<= 1.0 -> NORMAL" in dev_norm["severity_derivation_rule"]

    # Z = +2.5 in (2.0, 3.0] -> MODERATE_DEVIATION
    dev_mod = service.calculate_deviation(125.0, baseline)
    assert dev_mod["severity"] == AnomalySeverity.MODERATE_DEVIATION.value
    assert "MODERATE_DEVIATION" in dev_mod["severity_derivation_rule"]

    # Z = +3.5 > 3.0 -> HIGH_DEVIATION
    dev_high = service.calculate_deviation(135.0, baseline)
    assert dev_high["severity"] == AnomalySeverity.HIGH_DEVIATION.value
    assert "HIGH_DEVIATION" in dev_high["severity_derivation_rule"]


def test_configurable_severity_rules():
    """Verify that severity derivation rules are configurable at runtime."""
    service = AnomalyDetectionService()
    baseline = MovementBaseline(
        metric_key="test_metric",
        display_name="Test Metric",
        category="Test",
        unit="°",
        mean=100.0,
        std_dev=10.0,
        min_norm=80.0,
        max_norm=120.0
    )

    # Custom rule: strict Z-score threshold (mild = 0.5)
    strict_config = SeverityRuleConfig(z_score_mild=0.5, z_score_moderate=1.5, z_score_high=2.5)
    dev_strict = service.calculate_deviation(108.0, baseline, rule_config=strict_config)
    # Z = 0.8 > 0.5 -> MILD_DEVIATION under strict rules
    assert dev_strict["severity"] == AnomalySeverity.MILD_DEVIATION.value


def test_deviation_zero_baseline_mean():
    """Verify zero division safety when baseline mean is 0.0."""
    service = AnomalyDetectionService()
    baseline = MovementBaseline(
        metric_key="zero_mean_metric",
        display_name="Zero Mean Metric",
        category="Test",
        unit="°",
        mean=0.0,
        std_dev=2.0,
        min_norm=0.0,
        max_norm=5.0
    )

    dev = service.calculate_deviation(4.0, baseline)
    assert dev["absolute_deviation"] == 4.0
    assert dev["percent_deviation"] is None
    assert dev["z_score"] == 2.0
    assert dev["severity"] == AnomalySeverity.MILD_DEVIATION.value


def test_deviation_missing_observed_value():
    """Verify safe handling of None observed value."""
    service = AnomalyDetectionService()
    baseline = get_baseline_registry().get_baseline("knee_flexion_rom")
    assert baseline is not None

    dev = service.calculate_deviation(None, baseline)
    assert dev["observed"] is None
    assert dev["severity"] == AnomalySeverity.NORMAL.value


def test_baseline_registry_custom_override():
    """Verify that the baseline registry is configurable and swappable at runtime."""
    registry = BaselineRegistry()
    custom_baseline = MovementBaseline(
        metric_key="custom_sprint_rom",
        display_name="Custom Sprint Knee ROM",
        category="Sprint Kinematics",
        unit="°",
        mean=135.0,
        std_dev=10.0,
        min_norm=110.0,
        max_norm=160.0,
        notes="Custom test configuration"
    )
    registry.register_baseline(custom_baseline)

    retrieved = registry.get_baseline("custom_sprint_rom")
    assert retrieved is not None
    assert retrieved.mean == 135.0
    assert retrieved.baseline_type == "DEVELOPMENTAL"


# --- Integration Tests: Anomaly Assessment API ---

@pytest.fixture
async def athlete_profile_main(db_session: AsyncSession, test_user: User) -> AthleteProfile:
    profile = AthleteProfile(
        id=uuid.uuid4(),
        user_id=test_user.id,
        sport="Basketball"
    )
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.fixture
async def athlete_profile_other(db_session: AsyncSession) -> AthleteProfile:
    from app.core.security import hash_password
    from app.core.rbac import UserRole
    second_user = User(
        id=uuid.uuid4(),
        email="other_athlete_p4@test.com",
        password_hash=hash_password("testpass123"),
        full_name="Other Athlete P4",
        role=UserRole.ATHLETE
    )
    db_session.add(second_user)
    await db_session.commit()
    await db_session.refresh(second_user)

    profile = AthleteProfile(
        id=uuid.uuid4(),
        user_id=second_user.id,
        sport="Tennis"
    )
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile


@pytest.mark.asyncio
async def test_anomalies_api_unauthorized_access(
    client: AsyncClient,
    test_user: User,
    athlete_profile_other: AthleteProfile,
    coach_user: User
):
    """Test: Athlete 1 cannot view Athlete 2's biomechanical anomaly analysis."""
    # Coach uploads video for Athlete 2
    upload_res = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("drill.mp4", generate_test_video_bytes(), "video/mp4")},
        data={"athlete_id": str(athlete_profile_other.id)},
        headers=auth_header(coach_user)
    )
    assert upload_res.status_code == 201
    video_id = upload_res.json()["id"]

    # Athlete 1 tries to fetch Athlete 2's anomalies -> 403
    anom_res = await client.get(
        f"/api/v1/analysis/{video_id}/anomalies",
        headers=auth_header(test_user)
    )
    assert anom_res.status_code == 403


@pytest.mark.asyncio
async def test_anomalies_api_missing_video(client: AsyncClient, test_user: User):
    """Test: Querying anomalies for non-existent video returns 404."""
    random_id = str(uuid.uuid4())
    res = await client.get(f"/api/v1/analysis/{random_id}/anomalies", headers=auth_header(test_user))
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_anomalies_api_full_pipeline(
    client: AsyncClient,
    test_user: User,
    athlete_profile_main: AthleteProfile
):
    """Test: Upload real video, run process pipeline, and fetch complete anomaly assessment."""
    real_video = generate_test_video_bytes()

    # 1. Upload video
    upload_res = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("jump_test.mp4", real_video, "video/mp4")},
        data={"sport_type": "Jump Landing"},
        headers=auth_header(test_user)
    )
    assert upload_res.status_code == 201
    video_id = upload_res.json()["id"]

    # 2. Process video
    process_res = await client.post(
        f"/api/v1/videos/{video_id}/process",
        headers=auth_header(test_user)
    )
    assert process_res.status_code == 200

    # 3. Retrieve Biomechanical Anomalies
    anom_res = await client.get(
        f"/api/v1/analysis/{video_id}/anomalies",
        headers=auth_header(test_user)
    )
    assert anom_res.status_code == 200
    anom_data = anom_res.json()

    assert anom_data["video_id"] == video_id
    assert "overall_status" in anom_data
    assert "feature_summary" in anom_data
    assert "metric_deviations" in anom_data
    assert "anomalies" in anom_data
    assert "baseline_metadata" in anom_data
    assert anom_data["baseline_metadata"]["baseline_type"] == "DEVELOPMENTAL"

    # Check metric deviations structure
    deviations = anom_data["metric_deviations"]
    for key, dev in deviations.items():
        assert "metric" in dev
        assert "baseline_mean" in dev
        assert "baseline_std" in dev
        assert "severity" in dev
        assert "severity_derivation_rule" in dev
        assert dev["baseline_type"] == "DEVELOPMENTAL"
