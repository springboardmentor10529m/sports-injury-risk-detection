"""
Tests for SafeMove Phase 5B Baseline ML Research Subsystem.

Verifies:
- Feature selection and strict identifier/target-leakage exclusion.
- Preprocessing pipeline construction and transformation integrity.
- Subject-isolated grouped cross-validation (0 cross-fold subject leakage).
- Baseline classifiers (Logistic Regression, Random Forest, XGBoost).
- Research metrics calculation (Balanced Accuracy, ROC-AUC, Specificity, Brier Score).
- Explainability / feature contribution extraction.
- End-to-end experiment runner, artifact persistence, and reproducibility.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.ml.risk.cross_validation import (
    SubjectGroupedCV,
    calculate_classification_metrics,
)
from app.ml.risk.experiment_runner import BaselineExperimentRunner
from app.ml.risk.explainability import ModelExplainer
from app.ml.risk.feature_selection import (
    EXCLUDED_COLUMNS,
    EXPERIMENT_A_FEATURES,
    FeatureSelector,
)
from app.ml.risk.models import (
    build_baseline_model,
    build_full_pipeline,
    get_model_hyperparameters,
)
from app.ml.risk.preprocessing import build_preprocessing_pipeline


@pytest.fixture
def sample_feature_df() -> pd.DataFrame:
    """Fixture providing a mock 10-subject biomechanical DataFrame."""
    np.random.seed(42)
    return pd.DataFrame({
        "sample_id": [f"SMP_{i:03d}" for i in range(10)],
        "athlete_id": [f"ATH_{i:03d}" for i in range(10)],
        "video_id": [f"VID_{i:03d}" for i in range(10)],
        "source_dataset": ["calgary"] * 10,
        "modality": ["BIOMECHANICAL_TABLE"] * 10,
        "sport": ["Running"] * 10,
        "movement_type": ["Running Gait"] * 10,
        "laterality": ["LEFT", "RIGHT"] * 5,
        "injury_type": ["PFPS", "HEALTHY"] * 5,
        "injury_label": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        "knee_flexion_rom_left": [40.0, 46.0, 39.0, 45.5, 41.2, 47.0, 38.5, 46.2, 39.8, 45.0],
        "peak_knee_flexion_left": [46.0, 52.0, 44.0, 51.0, 47.0, 53.0, 43.5, 52.5, 45.0, 50.5],
        "hip_flexion_rom_left": [36.0, 41.0, 35.0, 40.5, 37.0, 41.5, 34.0, 41.0, 36.5, 40.0],
        "ankle_dorsiflexion_rom_left": [20.0, 27.0, 19.0, 26.5, 21.0, 28.0, 18.0, 27.5, 20.5, 26.0],
        "trunk_lean_max": [12.0, 8.0, 11.5, 7.5, 13.0, 8.5, 14.0, 7.8, 12.5, 8.2],
        "hip_adduction_max": [18.0, 13.0, 19.5, 12.5, 17.5, 13.5, 20.0, 12.8, 18.5, 13.2],
        "hip_internal_rotation_max": [12.0, 7.0, 13.5, 6.8, 11.5, 7.2, 14.0, 6.5, 12.8, 7.5],
        "peak_vertical_grf": [2.6, 2.3, 2.7, 2.25, 2.65, 2.28, 2.8, 2.22, 2.72, 2.31],
        "vertical_loading_rate": [75.0, 53.0, 78.0, 52.0, 76.0, 54.0, 82.0, 51.0, 77.0, 55.0],
        "knee_valgus_proxy_left_max": [8.0, 4.0, 7.5, 3.8, 9.0, 4.2, 8.5, 3.9, 8.2, 4.1],
    })


def test_feature_selection_exclusion_rules(sample_feature_df: pd.DataFrame):
    """Verify that identifiers and outcome proxies are strictly rejected."""
    # Ensure excluded columns list is complete
    assert "athlete_id" in EXCLUDED_COLUMNS
    assert "sample_id" in EXCLUDED_COLUMNS
    assert "injury_type" in EXCLUDED_COLUMNS
    assert "injury_label" in EXCLUDED_COLUMNS

    feat_names = FeatureSelector.get_feature_names("A")
    assert "athlete_id" not in feat_names
    assert "injury_type" not in feat_names

    x_mat, y, groups = FeatureSelector.filter_dataframe(sample_feature_df, feat_names)
    assert x_mat.shape == (10, len(EXPERIMENT_A_FEATURES))
    assert len(y) == 10
    assert len(groups) == 10

    # Attempting to select excluded column must raise ValueError
    with pytest.raises(ValueError, match="Target leakage / identifier error"):
        FeatureSelector.filter_dataframe(sample_feature_df, ["athlete_id", "knee_flexion_rom_left"])


def test_experiment_feature_sets():
    """Verify feature sets for Experiments A, B, and C."""
    feats_a = FeatureSelector.get_feature_names("A")
    feats_b = FeatureSelector.get_feature_names("B")
    feats_c = FeatureSelector.get_feature_names("C")

    assert len(feats_a) == 9
    assert len(feats_b) == 10  # Core + valgus
    assert len(feats_c) == 12  # Core + valgus + 2 deviation proxies
    assert "knee_valgus_proxy_left_max" in feats_b
    assert "knee_flexion_deviation_proxy" in feats_c


def test_preprocessing_pipeline_construction():
    """Verify pipeline builds with imputer and standard/robust scaler."""
    pipe_std = build_preprocessing_pipeline(scaler_type="standard", imputer_strategy="median")
    assert "imputer" in pipe_std.named_steps
    assert "scaler" in pipe_std.named_steps

    pipe_none = build_preprocessing_pipeline(scaler_type="none")
    assert "scaler" not in pipe_none.named_steps

    with pytest.raises(ValueError, match="Unknown scaler_type"):
        build_preprocessing_pipeline(scaler_type="invalid_scaler")


def test_model_factory_and_hyperparameters():
    """Verify baseline model initialization with fixed seeds."""
    for model_name in ["logistic_regression", "random_forest", "xgboost"]:
        model = build_baseline_model(model_name=model_name, random_state=42)
        assert model is not None
        params = get_model_hyperparameters(model_name)
        assert isinstance(params, dict)

    with pytest.raises(ValueError, match="Unknown model_name"):
        build_baseline_model("svm_deep_net")


def test_classification_metrics_calculation():
    """Verify deterministic mathematical calculation of classification metrics."""
    y_true = np.array([0, 0, 1, 1])
    y_pred = np.array([0, 1, 0, 1])  # 1 TN, 1 FP, 1 FN, 1 TP
    y_prob = np.array([0.1, 0.8, 0.2, 0.9])

    metrics = calculate_classification_metrics(y_true, y_pred, y_prob)

    assert metrics["balanced_accuracy"] == 0.5
    assert metrics["precision"] == 0.5
    assert metrics["recall_sensitivity"] == 0.5
    assert metrics["specificity"] == 0.5
    assert metrics["brier_score"] is not None
    assert 0.0 <= metrics["brier_score"] <= 1.0


def test_subject_grouped_cv_leakage_free(sample_feature_df: pd.DataFrame):
    """Verify Stratified Group K-Fold guarantees 0 cross-fold subject leakage."""
    cv = SubjectGroupedCV(n_splits=3, random_state=42)
    pipe = build_full_pipeline("logistic_regression", random_state=42)

    x_mat = sample_feature_df[EXPERIMENT_A_FEATURES]
    y = sample_feature_df["injury_label"]
    groups = sample_feature_df["athlete_id"]

    results = cv.evaluate_pipeline(pipe, x_mat, y, groups)

    assert results["n_splits"] >= 2
    for check in results["leakage_checks"]:
        assert check["overlap_count"] == 0
        assert check["leakage_free"] is True

    assert "balanced_accuracy" in results["mean_metrics"]
    assert "balanced_accuracy" in results["overall_oof_metrics"]


def test_model_explainer(sample_feature_df: pd.DataFrame):
    """Verify feature importance extraction without causal claims."""
    x_mat = sample_feature_df[EXPERIMENT_A_FEATURES]
    y = sample_feature_df["injury_label"]

    pipe = build_full_pipeline("logistic_regression", random_state=42)
    pipe.fit(x_mat, y)

    df_imp = ModelExplainer.extract_feature_importance(
        model_pipeline=pipe, feature_names=EXPERIMENT_A_FEATURES, x_val=x_mat, y_val=y
    )

    assert len(df_imp) == len(EXPERIMENT_A_FEATURES)
    assert "model_contribution" in df_imp.columns
    assert "contribution_type" in df_imp.columns
    assert "permutation_importance_mean" in df_imp.columns


def test_end_to_end_experiment_runner(tmp_path: Path, sample_feature_df: pd.DataFrame):
    """Verify end-to-end Phase 5B baseline experiment execution and artifact generation."""
    feat_csv = tmp_path / "features.csv"
    sample_feature_df.to_csv(feat_csv, index=False)

    splits_dir = tmp_path / "splits"
    splits_dir.mkdir()
    test_manifest_path = splits_dir / "test_manifest.json"
    test_manifest_path.write_text(
        '[{"athlete_id": "ATH_008"}, {"athlete_id": "ATH_009"}]',
        encoding="utf-8",
    )

    out_dir = tmp_path / "models"

    runner = BaselineExperimentRunner(
        features_csv_path=feat_csv,
        splits_dir=splits_dir,
        output_dir=out_dir,
        random_state=42,
    )

    results = runner.run_experiments()

    assert "metadata" in results
    assert "best_model_selection" in results
    assert "cv_summary_table" in results
    assert "final_test_evaluation" in results

    # Verify generated artifact files
    assert (out_dir / "results.json").exists()
    assert (out_dir / "cv_results.csv").exists()
    assert (out_dir / "feature_importance.csv").exists()
    assert (out_dir / "model_metadata.json").exists()
    assert (out_dir / "best_model.joblib").exists()
