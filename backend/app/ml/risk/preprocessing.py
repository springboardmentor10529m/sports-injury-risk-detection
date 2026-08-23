"""
SafeMove Phase 5B — Preprocessing Pipeline Module.

Constructs scikit-learn Pipelines for missing value imputation and feature scaling.
Enforces strict prevention of data leakage by ensuring all fit operations occur
solely within training folds.
"""

from typing import Any

from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, StandardScaler


def build_preprocessing_pipeline(
    scaler_type: str = "standard", imputer_strategy: str = "median"
) -> Pipeline:
    """
    Construct a scikit-learn preprocessing Pipeline.

    Args:
        scaler_type: 'standard' for StandardScaler, 'robust' for RobustScaler, or 'none'
        imputer_strategy: Strategy for SimpleImputer ('median', 'mean')

    Returns:
        Configured scikit-learn Pipeline
    """
    steps: list[tuple[str, Any]] = [
        ("imputer", SimpleImputer(strategy=imputer_strategy))
    ]

    if scaler_type.lower() == "standard":
        steps.append(("scaler", StandardScaler()))
    elif scaler_type.lower() == "robust":
        steps.append(("scaler", RobustScaler()))
    elif scaler_type.lower() != "none":
        raise ValueError(
            f"Unknown scaler_type '{scaler_type}'. Choose from 'standard', 'robust', or 'none'."
        )

    return Pipeline(steps)
