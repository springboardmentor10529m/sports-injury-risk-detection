from app.services.pose_estimation import _enforce_monotonic_timestamp


def test_enforce_monotonic_timestamp_keeps_values_strictly_increasing():
    assert _enforce_monotonic_timestamp(100, 100) == 101
    assert _enforce_monotonic_timestamp(100, 90) == 101
    assert _enforce_monotonic_timestamp(100, 150) == 150
    assert _enforce_monotonic_timestamp(150, 151) == 151
