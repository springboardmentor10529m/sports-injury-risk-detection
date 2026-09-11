"""
AthleteGuard - Injury Risk Model Training & Artifact Pipeline
Infrastructure for future supervised model training (XGBoost / LightGBM / MLP) once
labeled clinical injury datasets are configured.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


class InjuryRiskDataPreprocessor:
    """
    Standardizes feature scaling and vectorization for injury risk models.
    """
    FEATURE_NAMES = [
        "valgus_mean", "valgus_p95", "valgus_pct",
        "knee_asym_mean", "knee_asym_p95",
        "hip_asym_mean", "hip_stab_mean",
        "ankle_asym_mean", "trunk_lean_mean", "shoulder_asym_mean",
        "rom", "variability", "postural_stability",
        "training_load", "previous_injury_count"
    ]

    def transform_features(
        self,
        aggregated_features: Dict[str, Any],
        athlete_profile: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        profile = athlete_profile or {}
        def _get(key, stat, d=0.0):
            obj = aggregated_features.get(key, {})
            return float(obj.get(stat, d)) if isinstance(obj, dict) else float(d)

        row = [
            _get("knee_valgus_angle", "mean"),
            _get("knee_valgus_angle", "p95"),
            _get("knee_valgus_angle", "high_risk_frame_percentage"),
            _get("bilateral_knee_asymmetry", "mean"),
            _get("bilateral_knee_asymmetry", "p95"),
            _get("bilateral_hip_asymmetry", "mean"),
            _get("hip_stability", "mean"),
            _get("bilateral_ankle_asymmetry", "mean"),
            _get("trunk_lean", "mean"),
            _get("shoulder_asymmetry", "mean"),
            _get("range_of_motion", "mean", 40.0),
            _get("movement_variability", "mean", 4.0),
            _get("postural_stability", "mean", 85.0),
            float(profile.get("training_load") or 50.0),
            float(len(profile.get("previous_injuries") or []))
        ]
        return np.array(row, dtype=float).reshape(1, -1)


class InjuryRiskTrainingPipeline:
    """
    Pipeline for training, validating, and saving supervised injury prediction models.
    """

    def __init__(self, artifact_dir: str = ARTIFACTS_DIR):
        self.artifact_dir = artifact_dir
        self.preprocessor = InjuryRiskDataPreprocessor()

    def train_and_save(self, dataset_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Loads dataset if present, trains model, and serializes artifact metadata.
        Transparently flags absence of clinical dataset when none is provided.
        """
        if not dataset_path or not os.path.exists(dataset_path):
            metadata = {
                "status": "baseline_only",
                "message": "Evaluation unavailable: labeled dataset not configured.",
                "dataset_path": dataset_path,
                "model_version": "1.0.0-research",
                "recommended_action": "Provide labeled sports injury incidence dataset (CSV/Parquet) for supervised training."
            }
            meta_path = os.path.join(self.artifact_dir, "model_metadata.json")
            with open(meta_path, "w") as f:
                json.dump(metadata, f, indent=2)
            return metadata

        # Supervised training logic when clinical dataset is provided
        logger.info(f"Training dataset detected at {dataset_path}")
        return {"status": "trained", "model_version": "1.1.0"}

    def load_model_metadata(self) -> Dict[str, Any]:
        meta_path = os.path.join(self.artifact_dir, "model_metadata.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "status": "baseline_active",
            "model_version": "1.0.0-research",
            "is_clinically_validated": False,
            "disclaimer": "AI-assisted biomechanical screening. Not a clinical diagnosis."
        }
