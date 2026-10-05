"""Athlete-grouped evaluation of event-level running injury data."""

from __future__ import annotations

import json
import platform
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data" / "raw"
MODEL_DIR = ROOT_DIR / "data" / "models"
DEFAULT_MODEL_PATH = MODEL_DIR / "real_dataset_injury_risk_model.joblib"
DEFAULT_REPORT_PATH = MODEL_DIR / "real_dataset_evaluation.json"
TARGET_COLUMN = "injury"
GROUP_COLUMN = "Athlete ID"
EXCLUDED_COLUMNS = {TARGET_COLUMN, GROUP_COLUMN, "Date", "date"}
DATE_COLUMN = "Date"
SOURCE_PAPER = "L\u00f6vdal et al. (2021), https://doi.org/10.1123/ijspp.2020-0518"
SOURCE_DATASET = "DataverseNL, https://doi.org/10.34894/UWU9PV"
APPROACH_FILES = {
    "day": "day_approach_maskedID_timeseries.csv",
    "week": "week_approach_maskedID_timeseries.csv",
}


def find_real_dataset_paths(data_dir: Path | str | None = None) -> list[Path]:
    base_dir = Path(data_dir) if data_dir is not None else DATA_DIR
    return [base_dir / filename for filename in APPROACH_FILES.values() if (base_dir / filename).exists()]


def load_real_dataset(data_dir: Path | str | None = None, approach: str = "day") -> pd.DataFrame:
    if approach not in APPROACH_FILES:
        raise ValueError(f"Unsupported approach: {approach}. Choose one of {list(APPROACH_FILES)}.")

    base_dir = Path(data_dir) if data_dir is not None else DATA_DIR
    path = base_dir / APPROACH_FILES[approach]
    if not path.exists():
        raise FileNotFoundError(f"Expected the {approach} approach dataset at {path}.")

    frame = pd.read_csv(path)
    frame = frame.loc[:, ~frame.columns.duplicated()].copy()
    required_columns = [GROUP_COLUMN, TARGET_COLUMN, DATE_COLUMN]
    missing_columns = [column for column in required_columns if column not in frame.columns]
    if missing_columns:
        raise ValueError(f"Dataset {path.name} is missing required columns: {missing_columns}.")

    for column in required_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = frame.dropna(subset=required_columns).copy()
    if not frame[TARGET_COLUMN].isin([0, 1]).all():
        raise ValueError(f"Dataset {path.name} contains labels outside the expected binary values 0 and 1.")
    frame[TARGET_COLUMN] = frame[TARGET_COLUMN].astype(int)
    frame[GROUP_COLUMN] = frame[GROUP_COLUMN].astype(str)
    return frame.reset_index(drop=True)


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    feature_columns = []
    for column in df.columns:
        if column in EXCLUDED_COLUMNS:
            continue
        series = pd.to_numeric(df[column], errors="coerce")
        if series.notna().any():
            feature_columns.append(column)

    if not feature_columns:
        raise ValueError("No usable feature columns were found in the real dataset.")

    X = df[feature_columns].copy()
    y = df[TARGET_COLUMN].astype(int)
    groups = df[GROUP_COLUMN].astype(str)
    return X, y, groups


def audit_target_timing(df: pd.DataFrame, approach: str) -> dict:
    event_date_spacings: list[int] = []
    for _, athlete_rows in df.groupby(GROUP_COLUMN):
        athlete_rows = athlete_rows.sort_values(DATE_COLUMN)
        dates = athlete_rows[DATE_COLUMN].astype(int).to_numpy()
        event_date_spacings.extend(int(right - left) for left, right in zip(dates, dates[1:]) if right > left)

    feature_window = {
        "day": "Seven preceding days as seven ordered daily feature vectors; day 0 is the day before the event.",
        "week": "Three preceding weeks as three ordered weekly aggregates plus relative-volume features.",
    }[approach]

    return {
        "target_column": TARGET_COLUMN,
        "target_semantics": "Injury event: unable to complete the scheduled training session due to injury.",
        "healthy_event_definition": "Athlete was fully fit three weeks before and three weeks after the event day.",
        "injury_event_filter": "Injury events within three weeks of a preceding injury event were treated as the same injury and filtered.",
        "date_encoding": "Integer day index in the study timeline; rows are sampled event examples, not a complete daily panel.",
        "date_min": int(df[DATE_COLUMN].min()),
        "date_max": int(df[DATE_COLUMN].max()),
        "positive_rows": int(df[TARGET_COLUMN].sum()),
        "positive_athletes": int(df.loc[df[TARGET_COLUMN].eq(1), GROUP_COLUMN].nunique()),
        "event_rows": int(len(df)),
        "approach": approach,
        "event_date_spacing_median_days": float(np.median(event_date_spacings)) if event_date_spacings else None,
        "feature_window_precedes_target": True,
        "feature_window": feature_window,
        "source_paper": SOURCE_PAPER,
        "source_dataset": SOURCE_DATASET,
        "prospective_deployment_validated": False,
        "validation_note": "This pipeline uses athlete-held-out cross-validation; it is not external or prospective deployment validation.",
    }


MODEL_CANDIDATES = {
    "logistic_regression": lambda: Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "model",
                LogisticRegression(
                    max_iter=4000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    ),
    "hist_gradient_boosting": lambda: Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                HistGradientBoostingClassifier(
                    learning_rate=0.05,
                    max_depth=6,
                    max_iter=400,
                    random_state=42,
                    min_samples_leaf=20,
                ),
            ),
        ]
    ),
    "random_forest": lambda: Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    class_weight="balanced",
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    ),
}


def build_model(model_name: str = "logistic_regression") -> Pipeline:
    if model_name not in MODEL_CANDIDATES:
        raise ValueError(f"Unsupported model_name: {model_name}. Available: {list(MODEL_CANDIDATES)}")
    return MODEL_CANDIDATES[model_name]()


def evaluate_model(data_dir: Path | str | None = None, n_splits: int = 5) -> dict:
    results_by_model: dict[str, list[dict]] = {}
    feature_counts: dict[str, int] = {}
    approach_summaries: dict[str, dict] = {}

    for approach in APPROACH_FILES:
        df = load_real_dataset(data_dir, approach)
        X, y, groups = prepare_features(df)
        folds = GroupKFold(n_splits=min(n_splits, int(groups.nunique())))
        approach_summaries[approach] = {
            "rows": int(len(df)),
            "feature_count": int(X.shape[1]),
            "athlete_count": int(groups.nunique()),
            "positive_rate": float(y.mean()),
            "feature_columns": list(X.columns),
            "label_timing_audit": audit_target_timing(df, approach),
        }

        for model_name in MODEL_CANDIDATES:
            candidate_name = f"{approach}_{model_name}"
            results_by_model[candidate_name] = []
            feature_counts[candidate_name] = int(X.shape[1])
            for fold_index, (train_idx, test_idx) in enumerate(folds.split(X, y, groups), start=1):
                model = build_model(model_name)
                model.fit(X.iloc[train_idx], y.iloc[train_idx])

                probabilities = model.predict_proba(X.iloc[test_idx])[:, 1]
                predictions = (probabilities >= 0.5).astype(int)

                results_by_model[candidate_name].append(
                    {
                        "fold": fold_index,
                        "train_rows": int(len(train_idx)),
                        "test_rows": int(len(test_idx)),
                        "train_positive_rate": float(y.iloc[train_idx].mean()),
                        "test_positive_rate": float(y.iloc[test_idx].mean()),
                        "roc_auc": float(roc_auc_score(y.iloc[test_idx], probabilities)),
                        "average_precision": float(average_precision_score(y.iloc[test_idx], probabilities)),
                        "f1": float(f1_score(y.iloc[test_idx], predictions, zero_division=0)),
                        "precision": float(precision_score(y.iloc[test_idx], predictions, zero_division=0)),
                        "recall": float(recall_score(y.iloc[test_idx], predictions, zero_division=0)),
                        "decision_threshold": 0.5,
                        "confusion_matrix": confusion_matrix(y.iloc[test_idx], predictions, labels=[0, 1]).tolist(),
                    }
                )

    candidate_summary = {}
    for model_name, fold_metrics in results_by_model.items():
        candidate_summary[model_name] = {
            "feature_count": feature_counts[model_name],
            "mean_roc_auc": float(np.mean([item["roc_auc"] for item in fold_metrics])),
            "mean_average_precision": float(np.mean([item["average_precision"] for item in fold_metrics])),
            "mean_f1": float(np.mean([item["f1"] for item in fold_metrics])),
            "mean_precision": float(np.mean([item["precision"] for item in fold_metrics])),
            "mean_recall": float(np.mean([item["recall"] for item in fold_metrics])),
            "folds": fold_metrics,
        }

    best_model_name = max(
        candidate_summary,
        key=lambda name: candidate_summary[name]["mean_average_precision"],
    )
    best_approach, best_estimator_name = best_model_name.split("_", 1)
    selected_approach_summary = approach_summaries[best_approach]

    summary = {
        "rows": selected_approach_summary["rows"],
        "feature_count": feature_counts[best_model_name],
        "athlete_count": selected_approach_summary["athlete_count"],
        "positive_rate": selected_approach_summary["positive_rate"],
        "target_column": TARGET_COLUMN,
        "group_column": GROUP_COLUMN,
        "best_model": best_model_name,
        "best_approach": best_approach,
        "best_estimator": best_estimator_name,
        "model_selection_metric": "mean_average_precision",
        "model_selection_note": "Candidates are ranked on the same grouped folds used for reporting; selected-candidate performance is exploratory and may be optimistic.",
        "decision_threshold": 0.5,
        "prediction_scope": "Event-level injury classification from the preceding workload window, evaluated on held-out athletes.",
        "source_paper": SOURCE_PAPER,
        "source_dataset": SOURCE_DATASET,
        "approaches": approach_summaries,
        "candidate_summary": candidate_summary,
    }

    report = {
        "model_type": best_model_name,
        "cv_strategy": "GroupKFold by athlete; evaluates generalization to athletes absent from training folds.",
        "task_status": "event_prediction_research",
        "dataset_paths": {approach: f"backend/data/raw/{filename}" for approach, filename in APPROACH_FILES.items()},
        "summary": summary,
    }
    return report


def train_final_model(
    data_dir: Path | str | None = None,
    model_path: Path | str | None = None,
    evaluation_report: dict | None = None,
) -> dict:
    report = evaluation_report or evaluate_model(data_dir)
    summary = report["summary"]
    candidate_name = summary["best_model"]
    approach, model_name = candidate_name.split("_", 1)
    df = load_real_dataset(data_dir, approach)
    X, y, groups = prepare_features(df)
    final_model = build_model(model_name)
    final_model.fit(X, y)

    candidate_scores = {
        name: metrics["mean_average_precision"]
        for name, metrics in summary["candidate_summary"].items()
    }
    threshold = 0.5

    output_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": final_model,
        "feature_columns": list(X.columns),
        "target_column": TARGET_COLUMN,
        "group_column": GROUP_COLUMN,
        "data_type": "real_workload_dataset",
        "source_paper": SOURCE_PAPER,
        "source_dataset": SOURCE_DATASET,
        "prediction_scope": "Event-level injury classification using the preceding workload window; research only.",
        "best_model_name": model_name,
        "best_candidate": candidate_name,
        "approach": approach,
        "model_selection_metric": "mean_average_precision",
        "decision_threshold": float(threshold),
        "candidate_scores": candidate_scores,
        "python_version": platform.python_version(),
        "scikit_learn_version": sklearn.__version__,
    }
    joblib.dump(artifact, output_path)

    return {
        "model_path": str(output_path),
        "feature_count": int(X.shape[1]),
        "rows": int(len(df)),
        "athlete_count": int(groups.nunique()),
        "positive_rate": float(y.mean()),
        "best_model_name": model_name,
        "best_candidate": candidate_name,
        "approach": approach,
        "decision_threshold": float(threshold),
        "candidate_scores": {k: float(v) for k, v in candidate_scores.items()},
        "scikit_learn_version": sklearn.__version__,
    }


def write_evaluation_report(report: dict, output_path: Path | str | None = None) -> Path:
    target_path = Path(output_path) if output_path else DEFAULT_REPORT_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return target_path


def main() -> dict:
    report = evaluate_model()
    write_evaluation_report(report)
    train_final_model(evaluation_report=report)
    return report


if __name__ == "__main__":
    main()
