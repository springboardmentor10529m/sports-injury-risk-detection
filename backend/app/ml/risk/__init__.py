"""
SafeMove Phase 5B — Injury Risk Baseline Machine Learning Subsystem.

Provides feature selection, preprocessing pipelines, model factories,
subject-isolated grouped cross-validation, and explainability for research baselines.
"""

from app.ml.risk.cross_validation import SubjectGroupedCV, calculate_classification_metrics
from app.ml.risk.experiment_runner import BaselineExperimentRunner
from app.ml.risk.explainability import ModelExplainer
from app.ml.risk.feature_selection import FeatureSelector
from app.ml.risk.models import build_baseline_model, build_full_pipeline, get_model_hyperparameters
from app.ml.risk.preprocessing import build_preprocessing_pipeline

__all__ = [
    "FeatureSelector",
    "build_preprocessing_pipeline",
    "build_baseline_model",
    "build_full_pipeline",
    "get_model_hyperparameters",
    "SubjectGroupedCV",
    "calculate_classification_metrics",
    "ModelExplainer",
    "BaselineExperimentRunner",
]
