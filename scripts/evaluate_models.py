"""
AthleteGuard - Comprehensive Model Evaluation & Calibration Analysis
Generates ROC-AUC, PR-AUC, Sensitivity, Specificity, Brier Score, Confusion Matrix,
and publication-ready evaluation charts on held-out subject test splits.
"""

import os
import sys
import json
import logging
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import (
    roc_auc_score, average_precision_score, accuracy_score,
    precision_score, recall_score, f1_score, confusion_matrix,
    brier_score_loss, roc_curve, precision_recall_curve
)
from sklearn.calibration import calibration_curve

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("ModelEvaluator")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEST_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "test_split.parquet")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models", "trained")
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports", "model_evaluation")
os.makedirs(REPORTS_DIR, exist_ok=True)


def evaluate_models():
    logger.info("=" * 60)
    logger.info("AthleteGuard Model Evaluation & Calibration Suite")
    logger.info("=" * 60)

    if not os.path.exists(TEST_DATA_PATH):
        raise FileNotFoundError(f"Test split not found at {TEST_DATA_PATH}. Run scripts/train_models.py first.")

    # Load schema
    schema_path = os.path.join(MODELS_DIR, "feature_schema.json")
    with open(schema_path, "r") as f:
        schema = json.load(f)
    feature_cols = schema["feature_names"]

    # Load held-out test data
    test_df = pd.read_parquet(TEST_DATA_PATH)
    logger.info(f"Loaded unseen athlete test set: {len(test_df)} samples across {test_df['subject_id'].nunique()} athletes.")

    X_test = test_df[feature_cols].values
    y_test = test_df["injury_label"].values

    scaler = joblib.load(os.path.join(MODELS_DIR, "feature_scaler.joblib"))
    X_test_scaled = scaler.transform(X_test)

    # Load models
    models = {
        "Logistic Regression": (joblib.load(os.path.join(MODELS_DIR, "logistic_regression.joblib")), X_test_scaled),
        "Random Forest": (joblib.load(os.path.join(MODELS_DIR, "random_forest.joblib")), X_test),
        "XGBoost (Raw)": (joblib.load(os.path.join(MODELS_DIR, "xgboost.joblib")), X_test),
        "XGBoost (Calibrated)": (joblib.load(os.path.join(MODELS_DIR, "calibrated_xgboost.joblib")), X_test)
    }

    metrics_results = {}
    curves_data = {}

    for name, (model, feat_data) in models.items():
        logger.info(f"\nEvaluating: {name}...")
        y_probs = model.predict_proba(feat_data)[:, 1]

        # Use 0.5 default decision threshold
        y_pred = (y_probs >= 0.5).astype(int)

        # In case of imbalanced raw outputs with small positive rates, also calculate optimal F1 threshold
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

        roc_auc = roc_auc_score(y_test, y_probs)
        pr_auc = average_precision_score(y_test, y_probs)
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0) # Sensitivity
        spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0 # Specificity
        f1 = f1_score(y_test, y_pred, zero_division=0)
        brier = brier_score_loss(y_test, y_probs)

        # Calibration curve
        prob_true, prob_pred = calibration_curve(y_test, y_probs, n_bins=10, strategy="uniform")

        # ROC & PR curves
        fpr, tpr, _ = roc_curve(y_test, y_probs)
        pr_prec, pr_rec, _ = precision_recall_curve(y_test, y_probs)

        metrics_results[name] = {
            "roc_auc": round(float(roc_auc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "sensitivity_recall": round(float(rec), 4),
            "specificity": round(float(spec), 4),
            "f1_score": round(float(f1), 4),
            "brier_score": round(float(brier), 4),
            "confusion_matrix": {
                "true_positives": int(tp),
                "false_positives": int(fp),
                "true_negatives": int(tn),
                "false_negatives": int(fn)
            }
        }

        curves_data[name] = {
            "fpr": fpr, "tpr": tpr,
            "pr_prec": pr_prec, "pr_rec": pr_rec,
            "prob_true": prob_true, "prob_pred": prob_pred,
            "roc_auc": roc_auc, "pr_auc": pr_auc
        }

        logger.info(f"  ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | Brier: {brier:.4f}")
        logger.info(f"  Sensitivity: {rec:.4f} | Specificity: {spec:.4f} | F1: {f1:.4f}")

    # 1. Plot ROC Curves
    plt.figure(figsize=(8, 6), dpi=150)
    for name, data in curves_data.items():
        plt.plot(data["fpr"], data["tpr"], label=f"{name} (AUC = {data['roc_auc']:.3f})", lw=2)
    plt.plot([0, 1], [0, 1], 'k--', lw=1.5, label="Random Chance (AUC = 0.500)")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (1 - Specificity)", fontsize=11)
    plt.ylabel("True Positive Rate (Sensitivity)", fontsize=11)
    plt.title("Receiver Operating Characteristic (ROC) - Unseen Athlete Cohort", fontsize=12, fontweight="bold")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    roc_chart_path = os.path.join(REPORTS_DIR, "roc_curves.png")
    plt.savefig(roc_chart_path)
    plt.close()
    logger.info(f"Saved ROC curves chart to {roc_chart_path}")

    # 2. Plot Precision-Recall Curves
    plt.figure(figsize=(8, 6), dpi=150)
    baseline_prev = float(np.mean(y_test))
    for name, data in curves_data.items():
        plt.plot(data["pr_rec"], data["pr_prec"], label=f"{name} (PR-AUC = {data['pr_auc']:.3f})", lw=2)
    plt.axhline(baseline_prev, color="k", linestyle="--", lw=1.5, label=f"Prevalence Baseline ({baseline_prev:.2%})")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("Recall (Sensitivity)", fontsize=11)
    plt.ylabel("Precision (Positive Predictive Value)", fontsize=11)
    plt.title("Precision-Recall (PR) Curves - Highly Imbalanced Injury Cohort", fontsize=12, fontweight="bold")
    plt.legend(loc="upper right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    pr_chart_path = os.path.join(REPORTS_DIR, "pr_curves.png")
    plt.savefig(pr_chart_path)
    plt.close()
    logger.info(f"Saved PR curves chart to {pr_chart_path}")

    # 3. Plot Probability Calibration Curves
    plt.figure(figsize=(8, 6), dpi=150)
    plt.plot([0, 1], [0, 1], "k:", label="Perfectly Calibrated")
    for name in ["XGBoost (Raw)", "XGBoost (Calibrated)", "Logistic Regression"]:
        data = curves_data[name]
        plt.plot(data["prob_pred"], data["prob_true"], "s-", label=name, lw=2)
    plt.xlabel("Mean Predicted Probability", fontsize=11)
    plt.ylabel("Fraction of Positives (Observed Injury Rate)", fontsize=11)
    plt.title("Reliability Diagram: Platt Scaling Probability Calibration", fontsize=12, fontweight="bold")
    plt.legend(loc="upper left")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    cal_chart_path = os.path.join(REPORTS_DIR, "calibration_curves.png")
    plt.savefig(cal_chart_path)
    plt.close()
    logger.info(f"Saved calibration curves chart to {cal_chart_path}")

    # 4. Plot Feature Importances from XGBoost
    xgb_model = models["XGBoost (Raw)"][0]
    importances = xgb_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]

    plt.figure(figsize=(10, 6), dpi=150)
    plt.barh(range(len(sorted_idx)), importances[sorted_idx][::-1], color="#4f46e5", align="center")
    plt.yticks(range(len(sorted_idx)), [feature_cols[i] for i in sorted_idx][::-1], fontsize=9)
    plt.xlabel("Relative Feature Importance (Gain)", fontsize=11)
    plt.title("XGBoost Injury Prediction Feature Importances", fontsize=12, fontweight="bold")
    plt.grid(True, axis="x", alpha=0.3)
    plt.tight_layout()
    feat_chart_path = os.path.join(REPORTS_DIR, "feature_importance.png")
    plt.savefig(feat_chart_path)
    plt.close()
    logger.info(f"Saved feature importance chart to {feat_chart_path}")

    # Save metrics JSON summary
    summary_path = os.path.join(REPORTS_DIR, "metrics_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "evaluation_cohort": {
                "total_test_samples": len(test_df),
                "unseen_athletes_count": int(test_df["subject_id"].nunique()),
                "injury_cases": int(np.sum(y_test == 1)),
                "prevalence": round(float(baseline_prev), 4)
            },
            "models_evaluated": metrics_results
        }, f, indent=2)

    logger.info(f"\nSaved evaluation summary report to {summary_path}")
    logger.info("=" * 60)
    logger.info("Model Evaluation Successfully Complete")
    logger.info("=" * 60)


if __name__ == "__main__":
    evaluate_models()
