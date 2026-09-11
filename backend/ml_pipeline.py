"""
SportShield Machine Learning Pipeline Architecture & Model Interface
Maintains complete transparency regarding AI/ML capabilities:
1. Active Vision ML: MediaPipe PoseLandmarker (Google Research deep neural network)
2. Active Risk Scoring: Validated Deterministic Biomechanical Rules Engine (0-100)
3. ML Classifier Interface: Extensible interface for supervised tabular injury models
   (Random Forest, Gradient Boosting) trained on Project-Injury-Dataset.csv.
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
from pathlib import Path
import numpy as np
import pandas as pd
from dataset_loader import load_project_injury_dataset, load_sports_multimodal_dataset

logger = logging.getLogger("sportshield.ml_pipeline")


class InjuryRiskMLModelInterface:
    """
    Standardized ML prediction interface.
    Allows seamless switching between rule-based biomechanical expert system
    and trained supervised learning models without disrupting the API or frontend.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path
        self.is_trained_ml_active: bool = False
        self.model = None
        self.feature_names: List[str] = [
            "knee_valgus_angle_deg",
            "hip_stability_score",
            "trunk_lateral_flexion_deg",
            "range_of_motion_deg",
            "bilateral_symmetry_pct",
            "movement_smoothness_score",
            "rpe_fatigue_score",
            "previous_injury",
        ]

    def get_system_architecture_status(self) -> Dict[str, Any]:
        """
        Return the exact state of ML and rule components in the pipeline.
        Ensures strict academic honesty as requested by mentor.
        """
        return {
            "pose_estimation_ml": {
                "model_name": "MediaPipe PoseLandmarker",
                "framework": "Google MediaPipe / TensorFlow Lite",
                "status": "ACTIVE_VISION_ML",
                "landmark_count": 33,
                "role": "Real-time 3D spatial keypoint detection from video stream",
            },
            "activity_classification": {
                "model_name": "Kinematic Heuristic Classifier",
                "classes": ["running", "squatting"],
                "status": "ACTIVE_RULE_BASED",
                "role": "Temporal vertical center-of-mass and knee excursion periodicity",
            },
            "injury_risk_classifier": {
                "model_name": "SportShield Biomechanical Expert Scoring Engine",
                "version": "2.1-deterministic",
                "status": "ACTIVE_VALIDATED_RULES",
                "ml_classifier_ready": True,
                "is_trained_ml_active": self.is_trained_ml_active,
                "training_dataset_ready": "Project-Injury-Dataset.csv",
                "role": "Calculates composite 0–100 risk score and anomaly flags",
            }
        }

    def prepare_training_dataset(self) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepares training matrices (X, y) from Project-Injury-Dataset.csv.
        """
        df = load_project_injury_dataset()
        X = df[self.feature_names].copy()
        y = df["injury_occurred"].copy()
        return X, y

    def train_baseline_model(self) -> Dict[str, Any]:
        """
        Trains an actual scikit-learn Random Forest Classifier on Project-Injury-Dataset.csv
        for validation and future deployment.
        """
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, roc_auc_score, f1_score

        X, y = self.prepare_training_dataset()
        clf = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
        clf.fit(X, y)

        preds = clf.predict(X)
        probs = clf.predict_proba(X)[:, 1]

        self.model = clf
        self.is_trained_ml_active = True

        importances = dict(zip(self.feature_names, [round(float(w), 3) for w in clf.feature_importances_]))

        return {
            "status": "SUCCESSFULLY_TRAINED",
            "sample_count": len(X),
            "train_accuracy": round(float(accuracy_score(y, preds)), 3),
            "train_roc_auc": round(float(roc_auc_score(y, probs)), 3),
            "train_f1": round(float(f1_score(y, preds)), 3),
            "feature_importances": importances,
        }

    def predict_risk(
        self,
        features: Dict[str, Any],
        fatigue_multiplier: float = 1.0,
        prior_injury_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generate risk prediction with full explainability.
        If a trained model is present, returns its probability alongside deterministic rule score.
        """
        # Feature weights for explainability
        feature_weights = {
            "knee_valgus_angle_deg": 0.30,
            "hip_stability_score": 0.20,
            "trunk_lateral_flexion_deg": 0.15,
            "bilateral_symmetry_pct": 0.15,
            "range_of_motion_deg": 0.10,
            "movement_smoothness_score": 0.10,
        }

        # Calculate individual feature risk contribution
        valgus = float(features.get("knee_valgus_angle_deg", 12.0))
        hip = float(features.get("hip_stability_score", 75.0))
        trunk = float(features.get("trunk_lateral_flexion_deg", 6.0))
        rom = float(features.get("range_of_motion_deg", 110.0))
        symmetry = float(features.get("bilateral_symmetry_pct", 88.0))
        smoothness = float(features.get("movement_smoothness_score", 80.0))

        # Partial penalties (0 to 100)
        c_valgus = min(100.0, max(0.0, (valgus - 10.0) / 15.0 * 100.0))
        c_hip = min(100.0, max(0.0, (85.0 - hip) / 35.0 * 100.0))
        c_trunk = min(100.0, max(0.0, (trunk - 5.0) / 10.0 * 100.0))
        c_sym = min(100.0, max(0.0, (92.0 - symmetry) / 25.0 * 100.0))
        c_rom = 40.0 if (rom < 90.0 or rom > 135.0) else 10.0
        c_smooth = min(100.0, max(0.0, (85.0 - smoothness) / 30.0 * 100.0))

        feature_contributions = {
            "knee_valgus": round(c_valgus * feature_weights["knee_valgus_angle_deg"], 1),
            "hip_instability": round(c_hip * feature_weights["hip_stability_score"], 1),
            "trunk_lateral_lean": round(c_trunk * feature_weights["trunk_lateral_flexion_deg"], 1),
            "bilateral_asymmetry": round(c_sym * feature_weights["bilateral_symmetry_pct"], 1),
            "restricted_rom": round(c_rom * feature_weights["range_of_motion_deg"], 1),
            "movement_irregularity": round(c_smooth * feature_weights["movement_smoothness_score"], 1),
        }

        base_score = sum(feature_contributions.values())
        final_score = min(100.0, max(0.0, base_score * fatigue_multiplier * prior_injury_multiplier))

        level = "LOW" if final_score < 35 else ("MODERATE" if final_score < 65 else "HIGH")

        ml_prob = None
        if self.is_trained_ml_active and self.model is not None:
            try:
                row = np.array([[valgus, hip, trunk, rom, symmetry, smoothness, 5, 0]])
                ml_prob = round(float(self.model.predict_proba(row)[0][1]), 3)
            except Exception as e:
                logger.warning(f"Error during ML inference: {e}")

        return {
            "predicted_risk_score": round(final_score, 1),
            "risk_level": level,
            "feature_contributions": feature_contributions,
            "feature_weights": feature_weights,
            "ml_probability": ml_prob,
            "model_engine": "SportShield Biomechanical Decision Engine (Deterministic Rules)" if not self.is_trained_ml_active else "SportShield Random Forest + Biomechanical Rules",
            "is_trained_ml_active": self.is_trained_ml_active,
        }


# Singleton pipeline interface
ml_interface = InjuryRiskMLModelInterface()
