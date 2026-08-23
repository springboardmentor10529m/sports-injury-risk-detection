"""
SafeMove Phase 5B — Grouped Cross-Validation and Multi-Metric Evaluation.

Implements subject-level StratifiedGroupKFold cross-validation to strictly prevent
athlete-level data leakage across training and validation folds.
"""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold


def calculate_classification_metrics(
    y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray
) -> dict[str, float]:
    """
    Compute comprehensive research evaluation metrics for binary classification.

    Metrics:
    - Balanced Accuracy (handles class imbalance)
    - ROC-AUC (discrimination ability across thresholds)
    - PR-AUC (Precision-Recall Area under curve)
    - Precision, Recall/Sensitivity, Specificity
    - F1 Score
    - Brier Score (calibration quality)
    """
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)

    # 1. Confusion matrix for sensitivity & specificity
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    # 2. Specificity (TNR = TN / (TN + FP))
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    # 3. Sensitivity / Recall (TPR = TP / (TP + FN))
    sensitivity = float(recall_score(y_true, y_pred, zero_division=0.0))

    # 4. Precision & Balanced Accuracy
    precision = float(precision_score(y_true, y_pred, zero_division=0.0))
    if (tn + fp) > 0 and (tp + fn) > 0:
        bal_acc = float((sensitivity + specificity) / 2.0)
    else:
        bal_acc = float(np.mean(y_true == y_pred))
    f1 = float(f1_score(y_true, y_pred, zero_division=0.0))

    # 5. ROC-AUC and PR-AUC
    if len(np.unique(y_true)) > 1:
        roc_auc = float(roc_auc_score(y_true, y_prob))
        pr_auc = float(average_precision_score(y_true, y_prob))
    else:
        roc_auc = float("nan")
        pr_auc = float("nan")

    # 6. Brier Score Loss (lower is better, between 0.0 and 1.0)
    brier = float(brier_score_loss(y_true, y_prob))

    return {
        "balanced_accuracy": round(bal_acc, 4),
        "roc_auc": round(roc_auc, 4) if not np.isnan(roc_auc) else None,
        "pr_auc": round(pr_auc, 4) if not np.isnan(pr_auc) else None,
        "precision": round(precision, 4),
        "recall_sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "f1_score": round(f1, 4),
        "brier_score": round(brier, 4),
    }


class SubjectGroupedCV:
    """Performs subject-isolated Stratified Group K-Fold cross validation."""

    def __init__(self, n_splits: int = 4, random_state: int = 42):
        self.n_splits = n_splits
        self.random_state = random_state

    def evaluate_pipeline(
        self,
        pipeline: Any,
        x_mat: pd.DataFrame,
        y: pd.Series,
        groups: pd.Series,
    ) -> dict[str, Any]:
        """
        Evaluate a model pipeline across subject-isolated CV folds.

        Args:
            pipeline: scikit-learn Pipeline
            x_mat: Features DataFrame
            y: Binary target Series
            groups: Athlete / Subject ID Series

        Returns:
            Dictionary with per-fold metrics, aggregate mean/std, and fold splits validation.
        """
        # Determine valid number of splits given small cohort size
        min_class_count = min(np.bincount(y))
        effective_splits = min(self.n_splits, min_class_count)
        if effective_splits < 2:
            effective_splits = 2

        cv = StratifiedGroupKFold(
            n_splits=effective_splits, shuffle=True, random_state=self.random_state
        )

        fold_metrics: list[dict[str, Any]] = []
        oof_y_true: list[int] = []
        oof_y_pred: list[int] = []
        oof_y_prob: list[float] = []
        leakage_checks: list[dict[str, Any]] = []

        for fold_idx, (train_idx, val_idx) in enumerate(
            cv.split(x_mat, y, groups=groups)
        ):
            x_train, x_val = x_mat.iloc[train_idx], x_mat.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            groups_train = set(groups.iloc[train_idx])
            groups_val = set(groups.iloc[val_idx])

            # Explicit strict assertion of 0 cross-fold subject leakage
            subject_overlap = groups_train.intersection(groups_val)
            if subject_overlap:
                raise ValueError(
                    f"Subject leakage in fold {fold_idx + 1}: Overlapping subjects {subject_overlap}"
                )

            leakage_checks.append({
                "fold": fold_idx + 1,
                "train_subjects_count": len(groups_train),
                "val_subjects_count": len(groups_val),
                "overlap_count": len(subject_overlap),
                "leakage_free": True,
            })

            # Fit pipeline on training fold only (fits imputer + scaler + model)
            pipeline.fit(x_train, y_train)

            # Predict on validation fold
            val_pred = pipeline.predict(x_val)
            if hasattr(pipeline, "predict_proba"):
                val_prob = pipeline.predict_proba(x_val)[:, 1]
            else:
                val_prob = val_pred.astype(float)

            fold_metric = calculate_classification_metrics(
                y_true=y_val.to_numpy(), y_pred=val_pred, y_prob=val_prob
            )
            fold_metric["fold"] = fold_idx + 1
            fold_metric["val_samples"] = len(y_val)
            fold_metrics.append(fold_metric)

            oof_y_true.extend(y_val.tolist())
            oof_y_pred.extend(val_pred.tolist())
            oof_y_prob.extend(val_prob.tolist())

        # Overall Out-of-Fold (OOF) Aggregate Metrics
        overall_oof_metrics = calculate_classification_metrics(
            y_true=np.array(oof_y_true),
            y_pred=np.array(oof_y_pred),
            y_prob=np.array(oof_y_prob),
        )

        metric_keys = [
            "balanced_accuracy",
            "roc_auc",
            "pr_auc",
            "precision",
            "recall_sensitivity",
            "specificity",
            "f1_score",
            "brier_score",
        ]
        mean_metrics = {}
        std_metrics = {}
        for k in metric_keys:
            vals = [
                m[k] for m in fold_metrics if m.get(k) is not None and not np.isnan(m[k])
            ]
            mean_metrics[k] = round(float(np.mean(vals)), 4) if vals else None
            std_metrics[k] = round(float(np.std(vals)), 4) if vals else None

        return {
            "n_splits": effective_splits,
            "fold_metrics": fold_metrics,
            "mean_metrics": mean_metrics,
            "std_metrics": std_metrics,
            "overall_oof_metrics": overall_oof_metrics,
            "leakage_checks": leakage_checks,
        }
