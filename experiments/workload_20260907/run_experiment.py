"""Standalone synthetic-workload experiment; never imports application modules.

Run from the repository root with backend/venv/Scripts/python.exe -B
experiments/workload_20260907/run_experiment.py. No fitted model is saved.
"""
import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

OUTPUT = Path(__file__).resolve().parent
ROOT = OUTPUT.parent.parent
DOWNLOADS = ROOT.parent
TARGET = "Injury_Indicator"
EXCLUDED = ["Athlete_ID", "ACL_Risk_Score", "Load_Balance_Score",
            "Performance_Score", "Team_Contribution_Score"]
WORKLOAD = ["Training_Intensity", "Training_Hours_Per_Week", "Recovery_Days_Per_Week",
            "Match_Count_Per_Week", "Rest_Between_Events_Days", "Fatigue_Score"]
SEEDS = [42, 43, 44, 45, 46, 47, 48, 49, 50, 51]
METRICS = ["precision", "recall", "f1", "pr_auc_ap", "roc_auc"]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def measure(y, probability):
    prediction = (probability >= 0.5).astype(int)
    return {
        "precision": float(precision_score(y, prediction, zero_division=0)),
        "recall": float(recall_score(y, prediction, zero_division=0)),
        "f1": float(f1_score(y, prediction, zero_division=0)),
        "pr_auc_ap": float(average_precision_score(y, probability)),
        "roc_auc": float(roc_auc_score(y, probability)),
        "confusion_matrix": confusion_matrix(y, prediction, labels=[0, 1]).tolist(),
    }


def summarize(rows):
    return {key: {"mean": float(np.mean([r[key] for r in rows])),
                  "sd": float(np.std([r[key] for r in rows], ddof=1)),
                  "min": float(min(r[key] for r in rows)),
                  "max": float(max(r[key] for r in rows))} for key in METRICS}


def preprocessing(X):
    categorical = list(X.select_dtypes(include=["object"]).columns)
    numeric = [c for c in X.columns if c not in categorical]
    return ColumnTransformer([
        ("numeric", Pipeline([("impute", SimpleImputer(strategy="median")),
                               ("scale", StandardScaler())]), numeric),
        ("categorical", Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                                   ("encode", OneHotEncoder(handle_unknown="ignore"))]), categorical),
    ])


def main():
    paths = [DOWNLOADS / "collegiate_athlete_injury_dataset.csv",
             DOWNLOADS / "sports_multimodal_data.csv"]
    protected = paths + list((ROOT / "backend/app/ml_models").glob("*"))
    before = {str(p): sha(p) for p in protected if p.is_file()}
    collegiate, multimodal = [pd.read_csv(p) for p in paths]
    assert collegiate.Athlete_ID.is_unique, "Repeated athletes require grouped splitting."
    assert set(collegiate[TARGET].unique()) == {0, 1}
    features = [c for c in collegiate if c not in EXCLUDED + [TARGET]]
    assert len(features) == 11 and not set(features) & set(EXCLUDED + [TARGET])
    assert not collegiate[features + [TARGET]].duplicated().any()

    audit = {}
    for path, data, target in zip(paths, [collegiate, multimodal], [TARGET, "injury_risk"]):
        audit[path.name] = {
            "sha256": sha(path), "rows": len(data), "columns": list(data.columns),
            "class_counts": {str(k): int(v) for k, v in data[target].value_counts().items()},
            "positive_rate": float(data[target].mean()),
            "missing_cells": int(data.isna().sum().sum()),
            "duplicate_rows": int(data.duplicated().sum()),
        }
    audit[paths[0].name]["acl_threshold_diagnostic"] = {
        "rule": "ACL_Risk_Score > 75 (diagnostic only, not an experiment input)",
        "confusion_matrix": confusion_matrix(collegiate[TARGET], collegiate.ACL_Risk_Score > 75).tolist(),
        "all_positives_have_acl_score_at_least_70": bool((collegiate.loc[collegiate[TARGET] == 1, "ACL_Risk_Score"] >= 70).all()),
        "positive_count_among_score_at_least_70": int(collegiate.loc[collegiate.ACL_Risk_Score >= 70, TARGET].sum()),
        "row_count_score_at_least_70": int((collegiate.ACL_Risk_Score >= 70).sum()),
    }
    s = multimodal
    flag_score = (3 * (s.heart_rate > 85).astype(int) + 4 * (s.emg_amplitude > .7).astype(int)
                  + 3 * (s.ground_reaction_force > 700).astype(int)
                  + 2 * (s.fatigue_index > 65).astype(int) + (s.previous_injury_history == 1).astype(int))
    audit[paths[1].name]["indicator_rule_diagnostic"] = {
        "rule": "3*(heart_rate>85) + 4*(emg_amplitude>0.7) + 3*(ground_reaction_force>700) + 2*(fatigue_index>65) + (previous_injury_history==1) >= 7",
        "mismatches": int(((flag_score >= 7) != s.injury_risk).sum()),
        "confusion_matrix": confusion_matrix(s.injury_risk, flag_score >= 7).tolist(),
        "interpretation": "Post-hoc reconstruction on all rows, not held-out model performance or proof of original generator code.",
    }
    audit[paths[1].name]["seed42_heart_rate_max_absolute_error"] = float(np.abs(
        np.random.RandomState(42).normal(70, 10, len(s)) - s.heart_rate).max())
    audit[paths[1].name]["range_flags"] = {
        "spo2_above_100": int((s.spo2 > 100).sum()),
        "negative_training_duration": int((s.training_duration < 0).sum()),
        "negative_jump_height": int((s.jump_height < 0).sum()),
    }

    candidates = {
        "prior_baseline": (features, DummyClassifier(strategy="prior")),
        "logistic_balanced": (features, LogisticRegression(C=1, class_weight="balanced", max_iter=2000, random_state=42)),
        "random_forest_balanced": (features, RandomForestClassifier(n_estimators=300, max_depth=5,
                                    min_samples_leaf=3, class_weight="balanced", random_state=42, n_jobs=1)),
        "workload_only_logistic": (WORKLOAD, LogisticRegression(C=1, class_weight="balanced", max_iter=2000, random_state=42)),
    }
    folds, predictions, results = [], [], {}
    y = collegiate[TARGET]
    for name, (columns, estimator) in candidates.items():
        X = collegiate[columns]
        pipeline = Pipeline([("preprocess", preprocessing(X)), ("model", estimator)])
        repeat_results = []
        for seed in SEEDS:
            out_of_fold = np.empty(len(y))
            for fold, (train, test) in enumerate(StratifiedKFold(5, shuffle=True, random_state=seed).split(X, y), 1):
                assert not set(train) & set(test)
                fitted = clone(pipeline).fit(X.iloc[train], y.iloc[train])
                probabilities = fitted.predict_proba(X.iloc[test])[:, 1]
                out_of_fold[test] = probabilities
                folds.append(dict(model=name, seed=seed, fold=fold, train_rows=len(train),
                                  train_positive=int(y.iloc[train].sum()), test_rows=len(test),
                                  test_positive=int(y.iloc[test].sum()), **measure(y.iloc[test], probabilities)))
                if seed == 42:
                    predictions.extend(dict(model=name, row_index=int(index), fold=fold,
                                            target=int(y.iloc[index]), probability=float(probability),
                                            prediction=int(probability >= .5)) for index, probability in zip(test, probabilities))
            repeat_results.append(dict(seed=seed, **measure(y, out_of_fold)))
        primary = [r for r in folds if r["model"] == name and r["seed"] == 42]
        results[name] = dict(features=columns, primary_fold_summary=summarize(primary),
                             primary_oof=repeat_results[0], repeat_oof_summary=summarize(repeat_results),
                             repeat_oof_metrics=repeat_results)
        print(name, json.dumps(results[name]["primary_oof"]), flush=True)

    report = dict(
        protocol={"target": TARGET, "excluded": EXCLUDED, "primary_seed": 42,
                  "folds": 5, "sensitivity_seeds": SEEDS, "threshold": .5,
                  "pr_auc_definition": "Average precision (non-trapezoidal); positive class 1.",
                  "confusion_matrix_layout": "[[TN, FP], [FN, TP]]",
                  "preprocessing": "Training-fold-only median imputation, numeric standardization, categorical most-frequent imputation and one-hot encoding.",
                  "tuning": "None. Fixed candidate settings; no resampling, feature selection, threshold optimization or calibration.",
                  "uncertainty": "SD/min/max are descriptive variability, not confidence intervals; repeats reuse the same 200 rows.",
                  "scope": "Synthetic-data experiment only; no prospective injury horizon or external test set."},
        versions={"python": platform.python_version(), "numpy": np.__version__,
                  "pandas": pd.__version__, "scikit_learn": sklearn.__version__},
        audit=audit, results=results, folds=folds, primary_out_of_fold_predictions=predictions,
        protected_file_hashes=before)
    assert all(sha(Path(p)) == digest for p, digest in before.items()), "Input or model artifact changed."
    (OUTPUT / "results.json").write_text(json.dumps(report, indent=2, allow_nan=False), encoding="utf-8")
    print("Saved results.json; source datasets and existing model artifacts unchanged.", flush=True)


if __name__ == "__main__":
    main()
