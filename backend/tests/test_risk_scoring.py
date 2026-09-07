import math

import pytest

from app.services import risk_scoring


@pytest.mark.parametrize("score, expected", [
    (0, "LOW"), (35, "LOW"), (35.01, "MODERATE"), (35.5, "MODERATE"),
    (36, "MODERATE"), (60, "MODERATE"), (60.01, "HIGH"), (60.5, "HIGH"),
    (61, "HIGH"), (80, "HIGH"), (80.01, "CRITICAL"), (80.5, "CRITICAL"),
    (81, "CRITICAL"), (100, "CRITICAL"),
])
def test_risk_boundaries(score, expected):
    assert risk_scoring.risk_category(score) == expected


def test_every_hundredth_has_one_category():
    for hundredths in range(10001):
        score = hundredths / 100
        matches = [
            category for matches, category in [
                (0 <= score <= 35, "LOW"), (35 < score <= 60, "MODERATE"),
                (60 < score <= 80, "HIGH"), (80 < score <= 100, "CRITICAL"),
            ] if matches
        ]
        assert matches == [risk_scoring.risk_category(score)]
    for boundary in (35, 60, 80):
        assert risk_scoring.risk_category(math.nextafter(boundary, math.inf)) != risk_scoring.risk_category(boundary)


@pytest.mark.parametrize("score", [-1, 101, float("nan"), float("inf")])
def test_invalid_score_is_rejected(score):
    with pytest.raises(ValueError):
        risk_scoring.risk_category(score)


@pytest.mark.parametrize("score, category", [(35.5, "MODERATE"), (60.5, "HIGH"), (80.5, "CRITICAL")])
def test_weighted_risk_handles_former_gaps(monkeypatch, score, category):
    for name in ("biomechanical_deviation_score", "historical_injury_score",
                 "movement_asymmetry_score", "training_load_score", "fatigue_score"):
        monkeypatch.setattr(risk_scoring, name, lambda *args: score)
    result = risk_scoring.compute_risk({}, 0, None, False, 0, None)
    assert result["overall_risk_score"] == score
    assert result["risk_category"] == category
