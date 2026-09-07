import pytest

from app.services.biomechanics import aggregate_biomechanics


def metrics(angles):
    return [{"detected": True, "knee_angle_left": angle, "knee_angle_right": angle}
            for angle in angles]


@pytest.mark.parametrize("first, last, expected", [
    ([100, 120, 140], [120, 120, 120], 100.0),  # zero final ROM is valid
    ([100, 120, 140], [100, 120, 140], 0.0),    # no decline is valid zero fatigue
    ([100, 120, 140], [100, 110, 120], 100.0),
    ([120, 120, 120], [120, 120, 120], None),   # zero baseline cannot normalize decline
    ([100, 120, 140], [None, None, None], None),
])
def test_fatigue_distinguishes_zero_from_missing(first, last, expected):
    result = aggregate_biomechanics(metrics(first + [110, 120, 130] + last), "squatting")
    assert result["fatigue_score"] == expected


def test_short_clip_has_no_fatigue_estimate():
    assert aggregate_biomechanics(metrics([100, 120] * 4), "squatting")["fatigue_score"] is None
