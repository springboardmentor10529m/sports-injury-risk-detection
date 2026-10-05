from pathlib import Path

import pandas as pd

try:
    from scripts.real_injury_pipeline import audit_target_timing, load_real_dataset, prepare_features
except ModuleNotFoundError:  # pragma: no cover - repo-root import fallback
    from backend.scripts.real_injury_pipeline import audit_target_timing, load_real_dataset, prepare_features


def test_target_timing_audit_uses_paper_defined_event_and_window():
    frame = pd.DataFrame(
        {
            "Athlete ID": ["a", "a", "a", "a"],
            "Date": [0, 1, 4, 8],
            "injury": [0, 1, 0, 1],
        }
    )

    audit = audit_target_timing(frame, "day")

    assert audit["positive_rows"] == 2
    assert audit["target_semantics"].startswith("Injury event")
    assert "day 0 is the day before the event" in audit["feature_window"]
    assert audit["feature_window_precedes_target"] is True
    assert audit["prospective_deployment_validated"] is False


def test_real_day_and_week_event_datasets_remain_separate():
    data_dir = Path(__file__).resolve().parents[1] / "data" / "raw"
    day_df = load_real_dataset(data_dir, "day")
    week_df = load_real_dataset(data_dir, "week")

    for df in (day_df, week_df):
        assert "injury" in df.columns
        assert "Athlete ID" in df.columns
        assert "Date" in df.columns
        assert df["injury"].nunique() == 2
        assert df["Athlete ID"].notna().all()
        assert not df.duplicated(["Athlete ID", "Date"]).any()

    assert len(day_df) == 42766
    assert int(day_df["injury"].sum()) == 583
    assert len(week_df) == 42798
    assert int(week_df["injury"].sum()) == 575

    day_X, day_y, day_groups = prepare_features(day_df)
    week_X, week_y, week_groups = prepare_features(week_df)
    assert (day_X.shape[0], day_X.shape[1]) == (len(day_y), 70)
    assert (week_X.shape[0], week_X.shape[1]) == (len(week_y), 69)
    assert day_groups.nunique() == week_groups.nunique() == 74

    assert audit_target_timing(day_df, "day")["feature_window_precedes_target"]
    assert audit_target_timing(week_df, "week")["feature_window_precedes_target"]
