# ==============================================================================
# PRODUCTION ML INFERENCE MODULE — SPORTS INJURY RISK PREDICTION
# ==============================================================================
# Standalone, independent inference engine.
# Loads trained model binary ('models/best_sports_injury_model.joblib') and
# feature schema ('models/model_features.json') for robust prediction.
# ==============================================================================

import os
import json
from typing import Dict, Any
import numpy as np
import pandas as pd
import joblib

# Absolute path resolution relative to this module
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
MODEL_FILE = os.path.join(MODELS_DIR, 'best_sports_injury_model.joblib')
SCHEMA_FILE = os.path.join(MODELS_DIR, 'model_features.json')
METADATA_FILE = os.path.join(MODELS_DIR, 'model_metadata.json')


class SportsInjuryPredictor:
    """
    Production-grade inference predictor for sports injury risk assessment.
    Enforces strict feature schema validation, exact ordering, and consistent scaling.
    """
    def __init__(self):
        if not os.path.exists(MODEL_FILE):
            raise FileNotFoundError(f"Model file missing: {MODEL_FILE}")
        if not os.path.exists(SCHEMA_FILE):
            raise FileNotFoundError(f"Feature schema file missing: {SCHEMA_FILE}")

        self.model = joblib.load(MODEL_FILE)
        with open(SCHEMA_FILE, 'r') as f:
            self.expected_features = json.load(f)

        self.metadata = {}
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'r') as f:
                self.metadata = json.load(f)

    def validate_input(self, tabular_data: Dict[str, Any]) -> pd.DataFrame:
        """
        Validates input dictionary against exact required feature schema.
        Rejects missing features and enforces strict type/numeric validation.
        """
        if not isinstance(tabular_data, dict):
            raise TypeError(f"Input must be a dictionary, got {type(tabular_data).__name__}")

        missing_keys = [f for f in self.expected_features if f not in tabular_data]
        if missing_keys:
            raise ValueError(f"Missing required feature(s): {missing_keys}")

        # Construct input DataFrame in exact schema order
        row = []
        for f in self.expected_features:
            val = tabular_data[f]
            if val is None or not isinstance(val, (int, float, np.number)):
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid non-numeric value for feature '{f}': {val}")
            row.append(float(val))

        return pd.DataFrame([row], columns=self.expected_features)

    def predict_injury_risk(self, tabular_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main production inference function.
        Returns probability, percentage, predicted class, and mapped application risk level.
        """
        input_df = self.validate_input(tabular_data)

        # Check if scaler is required
        if self.metadata.get("preprocessing", {}).get("scaling_applied", False):
            scaler_file = os.path.join(MODELS_DIR, 'scaler.joblib')
            if os.path.exists(scaler_file):
                scaler = joblib.load(scaler_file)
                input_df = scaler.transform(input_df)

        # Compute model output probabilities
        proba = float(self.model.predict_proba(input_df)[:, 1][0])
        pred_class = int(self.model.predict(input_df)[0])
        risk_pct = round(proba * 100.0, 1)

        # Mapped application risk level (using existing project thresholds)
        # 0.0-25.0%: LOW | 25.1-50.0%: MODERATE | 50.1-75.0%: HIGH | 75.1-100.0%: CRITICAL
        if risk_pct <= 25.0:
            risk_level = "LOW"
        elif risk_pct <= 50.0:
            risk_level = "MODERATE"
        elif risk_pct <= 75.0:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        model_display_name = self.metadata.get("model_name", "Random Forest (Balanced)")

        return {
            "risk_probability": round(proba, 4),
            "risk_score_percent": risk_pct,
            "predicted_class": pred_class,
            "risk_level": risk_level,
            "model": model_display_name
        }


# Singleton predictor instance for efficient reusable predictions
_predictor_instance = None

def get_predictor() -> SportsInjuryPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = SportsInjuryPredictor()
    return _predictor_instance

def predict_injury_risk(tabular_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Public API wrapper for injury risk prediction.
    """
    p = get_predictor()
    return p.predict_injury_risk(tabular_data)
