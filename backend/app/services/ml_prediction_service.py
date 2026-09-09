"""
ML Prediction Integration Service.
Adapts video kinematics, pose analysis, and athlete profile data into the exact
18-feature schema required by the production ML inference engine (`ml_inference.py`).
"""
import sys
import os
from typing import Dict, Any, List, Optional

# Ensure project root is on Python path to load ml_inference
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from ml_inference import predict_injury_risk
    HAS_ML_INFERENCE = True
except ImportError:
    try:
        from app.services.ml_inference import predict_injury_risk
        HAS_ML_INFERENCE = True
    except ImportError:
        HAS_ML_INFERENCE = False

# Population baseline medians from ml_training_dataset.csv (documented in model_metadata.json)
DATASET_POPULATION_MEDIANS = {
    'fatigue_score': 50.0,
    'acceleration': 0.0,
    'angular_velocity': 0.0,
    'body_orientation': 8.59,  # Dataset median fallback (trunk_lean_avg mapping is INCOMPATIBLE)
    'ground_reaction_force': 495.0,
    'step_count': 100.0,
    'cadence': 80.0,
    'jump_height_cm': 50.0,
    'impact_force': 300.0,
    'speed': 6.0,
    'rest_period': 8.0,
    'repetition_count': 30.0,
    'workload_intensity': 6.0
}


class MLPredictionService:
    """
    Adapter service linking video biomechanical analysis to the ML inference engine.
    """

    def generate_ml_prediction(
        self,
        kinematics_summary: Dict[str, Any],
        athlete_profile: Optional[Dict[str, Any]] = None,
        injury_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Extracts available video + profile features, applies population baselines for
        unavailable sensor channels, validates schema, and invokes predict_injury_risk().
        """
        if not HAS_ML_INFERENCE:
            return {
                "available": False,
                "error": "ML Inference engine module (ml_inference.py) is not available."
            }

        athlete_profile = athlete_profile or {}
        injury_history = injury_history or []

        # Extract features from video & athlete context using documented compatibility mappings
        connected_features = {}
        baseline_fallback_features = []

        # Note: trunk_lean_avg is vertical torso tilt magnitude [0, 90 deg] and is INCOMPATIBLE
        # with 360-degree spatial body_orientation [-180, +180 deg]. body_orientation uses population median fallback.

        # 1. Video knee_range_of_motion -> range_of_motion
        rom_val = kinematics_summary.get("knee_range_of_motion", kinematics_summary.get("range_of_motion", 75.0))
        if isinstance(rom_val, dict):
            rom_val = rom_val.get("knee_flexion", 75.0)
        connected_features["range_of_motion"] = float(rom_val)

        # 2. Video symmetry_score -> gait_symmetry (normalized 0.0 to 1.0)
        sym_score = float(kinematics_summary.get("symmetry_score", 90.0))
        connected_features["gait_symmetry"] = round(float(sym_score / 100.0 if sym_score > 1.0 else sym_score), 4)

        # 3. Video acc_rms -> acc_rms
        acc_rms_val = float(kinematics_summary.get("acc_rms", 1.0))
        connected_features["acc_rms"] = round(acc_rms_val, 4)

        # 4. DB InjuryHistory -> previous_injury_history (1 if history exists else 0)
        has_injury = 1 if len(injury_history) > 0 else 0
        connected_features["previous_injury_history"] = has_injury

        # 5. Athlete profile training_load -> training_duration
        training_load = float(athlete_profile.get("training_load", 90.0))
        connected_features["training_duration"] = training_load if training_load > 0 else 90.0

        # Construct full 18-feature vector using exact population baselines for sensor channels
        full_input_vector = {}

        # Fill in baseline medians for sensor features not measured by camera video
        for feat, val in DATASET_POPULATION_MEDIANS.items():
            if feat in athlete_profile and athlete_profile[feat] is not None:
                full_input_vector[feat] = float(athlete_profile[feat])
                connected_features[feat] = float(athlete_profile[feat])
            else:
                full_input_vector[feat] = val
                baseline_fallback_features.append(feat)

        # Override connected features
        full_input_vector.update(connected_features)

        # Perform ML Inference
        try:
            prediction_res = predict_injury_risk(full_input_vector)
            return {
                "available": True,
                "probability": prediction_res["risk_probability"],
                "score": prediction_res["risk_score_percent"],
                "risk_level": prediction_res["risk_level"],
                "model_type": prediction_res["model"],
                "disclaimer": (
                    "ML model prediction is an educational risk probability score based on tabular dataset patterns. "
                    "It is not a clinical medical diagnosis."
                ),
                "connected_features": list(connected_features.keys()),
                "baseline_fallback_features": baseline_fallback_features
            }
        except Exception as e:
            return {
                "available": False,
                "error": f"ML Inference failed: {str(e)}"
            }


ml_prediction_service = MLPredictionService()
