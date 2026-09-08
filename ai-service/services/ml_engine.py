"""
ML Inference Engine
Loads trained models and predicts injury severity, injury type risks, and workload risk probabilities.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

class MLEngine:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self.is_loaded = False
        self._load_models()

    def _load_models(self):
        try:
            self.severity_model = joblib.load(os.path.join(self.models_dir, "severity_model.joblib"))
            self.severity_scaler = joblib.load(os.path.join(self.models_dir, "severity_scaler.joblib"))
            self.severity_encoder = joblib.load(os.path.join(self.models_dir, "severity_encoder.joblib"))

            self.type_model = joblib.load(os.path.join(self.models_dir, "injury_type_model.joblib"))
            self.type_scaler = joblib.load(os.path.join(self.models_dir, "injury_type_scaler.joblib"))
            self.type_encoder = joblib.load(os.path.join(self.models_dir, "injury_type_encoder.joblib"))

            self.workload_model = joblib.load(os.path.join(self.models_dir, "workload_model.joblib"))
            self.workload_scaler = joblib.load(os.path.join(self.models_dir, "workload_scaler.joblib"))
            self.is_loaded = True
            print("ML Engine: All trained models loaded successfully.")
        except Exception as e:
            print(f"ML Engine Warning: Could not load some models from {self.models_dir}: {e}")
            self.is_loaded = False

    def predict(self, feature_vector: Dict[str, Any], workload_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes inference across all loaded models.
        """
        if not self.is_loaded:
            self._load_models()
            if not self.is_loaded:
                raise RuntimeError("ML Models are not available. Please run train_models.py first.")

        # 1. Injury Severity Prediction
        sev_features = [
            "Age", "Height_cm", "Weight_kg",
            "Knee_Angle_deg", "Jump_Height_cm", "Ankle_Flexion_deg",
            "Speed_m_s", "Reaction_Time_ms", "Injury_Recurrence"
        ]
        df_sev = pd.DataFrame([{col: feature_vector.get(col, 0.0) for col in sev_features}])
        X_sev_scaled = self.severity_scaler.transform(df_sev)
        sev_probs = self.severity_model.predict_proba(X_sev_scaled)[0]
        sev_classes = self.severity_encoder.classes_
        
        severity_breakdown = {
            cls_name: round(float(prob), 4) for cls_name, prob in zip(sev_classes, sev_probs)
        }
        pred_sev_idx = int(np.argmax(sev_probs))
        predicted_severity = str(sev_classes[pred_sev_idx])

        # 2. Injury Type / Pathology Risk
        type_features = [
            "Age", "Height_cm", "Weight_kg",
            "Knee_Angle_deg", "Jump_Height_cm", "Ankle_Flexion_deg",
            "Speed_m_s", "Reaction_Time_ms"
        ]
        df_type = pd.DataFrame([{col: feature_vector.get(col, 0.0) for col in type_features}])
        X_type_scaled = self.type_scaler.transform(df_type)
        type_probs = self.type_model.predict_proba(X_type_scaled)[0]
        type_classes = self.type_encoder.classes_
        
        injury_type_breakdown = {
            cls_name: round(float(prob), 4) for cls_name, prob in zip(type_classes, type_probs)
        }
        pred_type_idx = int(np.argmax(type_probs))
        predicted_type = str(type_classes[pred_type_idx])

        # 3. Workload & Conditioning Risk (Dataset 2)
        wl = workload_data or {}
        workload_features = {
            "Player_Age": feature_vector.get("Age", 25.0),
            "Player_Weight": feature_vector.get("Weight_kg", 75.0),
            "Player_Height": feature_vector.get("Height_cm", 180.0),
            "Previous_Injuries": int(feature_vector.get("Injury_Recurrence", 0)),
            "Training_Intensity": float(wl.get("training_intensity", 0.55)),
            "Recovery_Time": float(wl.get("recovery_time_days", 3.0))
        }
        df_wl = pd.DataFrame([workload_features])
        X_wl_scaled = self.workload_scaler.transform(df_wl)
        wl_probs = self.workload_model.predict_proba(X_wl_scaled)[0]
        workload_risk_prob = round(float(wl_probs[1]), 4) if len(wl_probs) > 1 else 0.5

        # Aggregate statistical ML risk score (0.0 to 1.0)
        # Weighted combination of Severe probability, Knee/ACL & Hamstring risk, and Workload probability
        severe_p = severity_breakdown.get("Severe", 0.33)
        knee_acl_p = injury_type_breakdown.get("Knee / ACL Tear", 0.2)
        ankle_p = injury_type_breakdown.get("Ankle Sprain", 0.2)
        hamstring_p = injury_type_breakdown.get("Hamstring / Muscle Strain", 0.2)
        
        composite_ml_probability = round(
            float(0.40 * severe_p + 0.30 * workload_risk_prob + 0.30 * max(knee_acl_p, ankle_p, hamstring_p)),
            4
        )

        return {
            "predicted_severity": predicted_severity,
            "severity_probabilities": severity_breakdown,
            "primary_injury_risk_category": predicted_type,
            "injury_category_probabilities": injury_type_breakdown,
            "workload_injury_probability": workload_risk_prob,
            "composite_ml_probability": composite_ml_probability,
            "ml_confidence_score": round(float(np.max(sev_probs)), 4)
        }
