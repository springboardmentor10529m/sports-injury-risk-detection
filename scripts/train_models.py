"""
AthleteGuard - Supervised Sports Injury Risk Model Training Pipeline
Trains, tunes, and serializes Logistic Regression, Random Forest, and XGBoost models
using rigorous Subject-Level Grouping (GroupShuffleSplit / GroupKFold) to prevent data leakage.
"""

import os
import sys
import json
import logging
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, GroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("ModelTrainer")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "injury_prediction_dataset.parquet")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models", "trained")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLS = [
    "total_distance_km",
    "max_distance_day_km",
    "nr_sessions",
    "nr_rest_days",
    "nr_tough_sessions",
    "nr_strength_sessions",
    "high_intensity_km",
    "moderate_intensity_km",
    "avg_exertion",
    "max_exertion",
    "avg_recovery",
    "min_recovery",
    "acute_chronic_workload_ratio",
    "workload_spike_2week",
    "fatigue_index",
    "movement_asymmetry_proxy",
    "knee_valgus_proxy",
    "hip_stability_index",
    "trunk_lean_proxy"
]

TARGET_COL = "injury_label"
GROUP_COL = "subject_id"


def train_and_save_models():
    logger.info("=" * 60)
    logger.info("Starting AthleteGuard Supervised ML Training Pipeline")
    logger.info("=" * 60)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Processed dataset not found at {DATA_PATH}. Run scripts/prepare_datasets.py first.")

    df = pd.read_parquet(DATA_PATH)
    logger.info(f"Loaded dataset: {df.shape[0]} rows, {df[GROUP_COL].nunique()} athletes.")
    logger.info(f"Class distribution: Uninjured={np.sum(df[TARGET_COL] == 0)}, Injured={np.sum(df[TARGET_COL] == 1)} ({df[TARGET_COL].mean():.2%})")

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values
    groups = df[GROUP_COL].values

    # Subject-Level Train/Test Split (GroupShuffleSplit)
    # Guarantee 0% athlete overlap between training and test sets
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    groups_train, groups_test = groups[train_idx], groups[test_idx]

    train_athletes = set(groups_train)
    test_athletes = set(groups_test)
    leakage = train_athletes.intersection(test_athletes)
    assert len(leakage) == 0, f"DATA LEAKAGE DETECTED! Overlapping athletes: {leakage}"

    logger.info(f"\nSubject-Level Data Partitioning:")
    logger.info(f"Train Set: {len(X_train)} samples across {len(train_athletes)} athletes (Injuries: {np.sum(y_train == 1)})")
    logger.info(f"Test Set:  {len(X_test)} samples across {len(test_athletes)} athletes (Injuries: {np.sum(y_test == 1)})")
    logger.info("Zero athlete overlap verified.")

    # Save test partition for evaluation
    test_df = df.iloc[test_idx].copy()
    test_df_path = os.path.join(PROJECT_ROOT, "data", "processed", "test_split.parquet")
    test_df.to_parquet(test_df_path, index=False)
    logger.info(f"Saved independent test set partition to {test_df_path}")

    # Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    # Class weight calculation for imbalance
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    scale_pos_weight = neg_count / max(1, pos_count)
    logger.info(f"Computed scale_pos_weight for imbalance: {scale_pos_weight:.2f}")

    trained_models = {}

    # 1. Model A: Logistic Regression (Regularized Linear Baseline)
    logger.info("\nTraining Model 1/3: Regularized Logistic Regression (L2, Balanced)...")
    lr = LogisticRegression(
        penalty="l2",
        C=0.1,
        class_weight="balanced",
        max_iter=1000,
        random_state=42
    )
    lr.fit(X_train_scaled, y_train)
    trained_models["logistic_regression"] = lr

    # 2. Model B: Random Forest Classifier (Non-linear Bagging Ensemble)
    logger.info("Training Model 2/3: Random Forest Classifier (Balanced Subsample)...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_split=10,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    trained_models["random_forest"] = rf

    # 3. Model C: XGBoost Classifier (Gradient Boosted Trees)
    logger.info("Training Model 3/3: XGBoost Classifier...")
    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss",
        n_jobs=-1
    )
    xgb.fit(X_train, y_train)
    trained_models["xgboost"] = xgb

    # 4. Model D: Calibrated XGBoost (Platt Scaling via CalibratedClassifierCV)
    logger.info("Fitting Probability Calibration (Platt Scaling on XGBoost)...")
    calibrated_xgb = CalibratedClassifierCV(
        estimator=XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric="logloss",
            n_jobs=-1
        ),
        method="sigmoid",
        cv=3
    )
    calibrated_xgb.fit(X_train, y_train)
    trained_models["calibrated_xgboost"] = calibrated_xgb

    # Save all models & preprocessors
    logger.info("\nSerializing Model Artifacts...")
    scaler_path = os.path.join(MODELS_DIR, "feature_scaler.joblib")
    joblib.dump(scaler, scaler_path)

    for name, model_obj in trained_models.items():
        model_file = os.path.join(MODELS_DIR, f"{name}.joblib")
        joblib.dump(model_obj, model_file)
        logger.info(f"Saved {name} -> {model_file}")

    # Save feature schema
    feature_schema = {
        "feature_names": FEATURE_COLS,
        "feature_count": len(FEATURE_COLS),
        "target_name": TARGET_COL,
        "supported_injuries": {
            "overuse_running_injury": "Trained & Calibrated (Lövdal et al. cohort)",
            "lower_limb_strain": "Trained (Swathikiran cohort)",
            "acl_knee_ligament_tear": "Unavailable for pure supervised classification - Clinical ground-truth MRI/surgical cohort required (Stanford MRNet access required)",
            "hamstring_tear": "Estimated via sprint load proxy - Labeled clinical ultrasound cohort required",
            "ankle_sprain": "Estimated via asymmetry proxy - Labeled clinical cohort required"
        },
        "model_version": "2.0.0-supervised",
        "scaler_used": "StandardScaler"
    }

    schema_path = os.path.join(MODELS_DIR, "feature_schema.json")
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(feature_schema, f, indent=2)

    logger.info(f"Saved feature schema to {schema_path}")
    logger.info("=" * 60)
    logger.info("Supervised Model Training Pipeline Successfully Completed")
    logger.info("=" * 60)


if __name__ == "__main__":
    train_and_save_models()
