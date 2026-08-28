from app.services.injury_ml_model import train_model, predict_injury_risk


def test_train_and_predict_baseline_model():
    metrics = train_model()

    assert "accuracy" in metrics
    assert "f1" in metrics
    assert metrics["accuracy"] >= 0.5

    prediction = predict_injury_risk({
        "weekly_training_hours": 18.0,
        "acute_chronic_ratio": 1.6,
        "previous_injury_count": 2,
        "days_since_last_injury": 90,
        "current_pain_flag": True,
        "fatigue_score": 78.0,
        "symmetry_score": 72.0,
        "knee_valgus_avg_pct": 12.0,
        "trunk_lean_avg_deg": 16.0,
    })

    assert 0.0 <= prediction["probability"] <= 1.0
    assert prediction["risk_level"] in {"LOW", "MODERATE", "HIGH", "CRITICAL"}
