"""
SafeMove Phase 5B — Baseline ML Models Factory.

Provides initial baseline classifiers:
A. Logistic Regression (L2 regularization, balanced weighting)
B. Random Forest Classifier (shallow trees to prevent overfitting on small cohorts)
C. XGBoost Classifier (constrained depth and gradient boosting)
"""

from typing import Any

from sklearn.base import BaseEstimator
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from app.ml.risk.preprocessing import build_preprocessing_pipeline


def get_model_hyperparameters(model_name: str) -> dict[str, Any]:
    """Return dictionary of fixed baseline hyperparameters for reproducibility."""
    name = model_name.lower().strip()
    if name in ["logistic_regression", "lr", "logreg"]:
        return {
            "C": 1.0,
            "class_weight": "balanced",
            "solver": "lbfgs",
            "max_iter": 1000,
        }
    elif name in ["random_forest", "rf"]:
        return {
            "n_estimators": 50,
            "max_depth": 3,
            "min_samples_split": 2,
            "class_weight": "balanced",
            "bootstrap": True,
        }
    elif name in ["xgboost", "xgb"]:
        return {
            "n_estimators": 30,
            "max_depth": 2,
            "learning_rate": 0.1,
            "eval_metric": "logloss",
            "subsample": 0.8,
            "colsample_bytree": 0.8,
        }
    else:
        raise ValueError(
            f"Unknown model_name '{model_name}'. Choose from 'logistic_regression', 'random_forest', 'xgboost'."
        )


def build_baseline_model(model_name: str, random_state: int = 42) -> BaseEstimator:
    """
    Instantiate a baseline classifier with fixed seed and conservative hyperparameters.

    Args:
        model_name: 'logistic_regression', 'random_forest', or 'xgboost'
        random_state: Integer seed for reproducible initialization
    """
    name = model_name.lower().strip()
    params = get_model_hyperparameters(name)

    if name in ["logistic_regression", "lr", "logreg"]:
        return LogisticRegression(random_state=random_state, **params)
    elif name in ["random_forest", "rf"]:
        return RandomForestClassifier(random_state=random_state, **params)
    elif name in ["xgboost", "xgb"]:
        return XGBClassifier(random_state=random_state, **params)
    else:
        raise ValueError(
            f"Unknown model_name '{model_name}'. Choose from 'logistic_regression', 'random_forest', 'xgboost'."
        )


def build_full_pipeline(
    model_name: str,
    scaler_type: str = "standard",
    imputer_strategy: str = "median",
    random_state: int = 42,
) -> Pipeline:
    """
    Construct a complete end-to-end scikit-learn Pipeline with preprocessor + classifier.

    Args:
        model_name: 'logistic_regression', 'random_forest', or 'xgboost'
        scaler_type: 'standard', 'robust', or 'none'
        imputer_strategy: 'median' or 'mean'
        random_state: Integer random state
    """
    preprocessor = build_preprocessing_pipeline(
        scaler_type=scaler_type, imputer_strategy=imputer_strategy
    )
    classifier = build_baseline_model(model_name=model_name, random_state=random_state)

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])
