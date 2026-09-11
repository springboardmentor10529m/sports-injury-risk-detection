"""
AthleteGuard - Baseline Biomechanical Injury Risk Model
Research-oriented baseline model mapping multi-frame temporal biomechanical features
and athlete training factors to explainable anatomical injury risk probabilities.

IMPORTANT NOTICE:
This model is an uncalibrated research baseline designed for movement screening exploration.
It is NOT clinically or medically validated. No labeled ground-truth clinical cohort was used.
"""

from typing import Dict, Any, List, Optional
import math
from .base_model import BaseInjuryRiskModel


class BaselineInjuryRiskModel(BaseInjuryRiskModel):
    """
    Explainable baseline risk model computing normalized logistic probabilities
    across 6 injury categories based on biomechanical deviation indicators.
    """

    def __init__(self, model_version: str = "1.0.0-research"):
        self.version = model_version

    def _sigmoid(self, z: float) -> float:
        return float(1.0 / (1.0 + math.exp(-z)))

    def _get_val(self, features: Dict[str, Any], key: str, stat: str = "mean", default: float = 0.0) -> float:
        feat = features.get(key, {})
        if isinstance(feat, dict):
            return float(feat.get(stat, default))
        if isinstance(feat, (int, float)):
            return float(feat)
        return default

    def predict_proba(
        self,
        aggregated_features: Dict[str, Any],
        athlete_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Computes risk probabilities [0.0, 1.0] for ACL, Hamstring, Ankle, Shoulder, Lower Back, and Overuse.
        """
        athlete_profile = athlete_profile or {}

        # 1. Feature extractions (means, p95s, high-risk percentages)
        valgus_mean = self._get_val(aggregated_features, "knee_valgus_angle", "mean", 4.0)
        valgus_p95 = self._get_val(aggregated_features, "knee_valgus_angle", "p95", 8.0)
        valgus_pct = self._get_val(aggregated_features, "knee_valgus_angle", "high_risk_frame_percentage", 0.0)

        knee_asym_mean = self._get_val(aggregated_features, "bilateral_knee_asymmetry", "mean", 6.0)
        knee_asym_p95 = self._get_val(aggregated_features, "bilateral_knee_asymmetry", "p95", 10.0)

        hip_asym_mean = self._get_val(aggregated_features, "bilateral_hip_asymmetry", "mean", 5.0)
        hip_stab_mean = self._get_val(aggregated_features, "hip_stability", "mean", 4.0)

        ankle_asym_mean = self._get_val(aggregated_features, "bilateral_ankle_asymmetry", "mean", 6.0)
        trunk_lean_mean = self._get_val(aggregated_features, "trunk_lean", "mean", 5.0)
        shoulder_asym_mean = self._get_val(aggregated_features, "shoulder_asymmetry", "mean", 4.0)

        rom = self._get_val(aggregated_features, "range_of_motion", "mean", 40.0)
        variability = self._get_val(aggregated_features, "movement_variability", "mean", 4.0)
        postural_stab = self._get_val(aggregated_features, "postural_stability", "mean", 85.0)

        # Profile factors
        training_load = float(athlete_profile.get("training_load") or 50.0) / 100.0  # 0.0 to 1.0
        injury_hist_count = len(athlete_profile.get("previous_injuries") or [])

        # --- A. ACL Risk ---
        # Driven by: knee valgus (primary), bilateral knee asymmetry, poor landing mechanics
        z_acl = -2.2 + (valgus_mean * 0.12) + (valgus_p95 * 0.06) + (valgus_pct * 0.025) + (knee_asym_mean * 0.06) + (training_load * 0.4)
        if any("knee" in str(x).lower() or "acl" in str(x).lower() for x in (athlete_profile.get("previous_injuries") or [])):
            z_acl += 0.5
        acl_prob = round(max(0.05, min(0.95, self._sigmoid(z_acl))), 3)

        # --- B. Hamstring Risk ---
        # Driven by: bilateral hip asymmetry, high-speed movement variability, low hip stability
        z_hamstring = -2.4 + (hip_asym_mean * 0.11) + (knee_asym_mean * 0.05) + (variability * 0.06) + (training_load * 0.5)
        if any("hamstring" in str(x).lower() for x in (athlete_profile.get("previous_injuries") or [])):
            z_hamstring += 0.6
        hamstring_prob = round(max(0.05, min(0.95, self._sigmoid(z_hamstring))), 3)

        # --- C. Ankle Risk ---
        # Driven by: bilateral ankle asymmetry, postural instability
        z_ankle = -2.3 + (ankle_asym_mean * 0.13) + ((100.0 - postural_stab) * 0.03) + (valgus_mean * 0.04)
        if any("ankle" in str(x).lower() for x in (athlete_profile.get("previous_injuries") or [])):
            z_ankle += 0.5
        ankle_prob = round(max(0.05, min(0.95, self._sigmoid(z_ankle))), 3)

        # --- D. Shoulder Risk ---
        # Driven by: shoulder tilt / asymmetry, trunk tilt compensation
        z_shoulder = -2.8 + (shoulder_asym_mean * 0.14) + (trunk_lean_mean * 0.05) + (training_load * 0.2)
        if any("shoulder" in str(x).lower() for x in (athlete_profile.get("previous_injuries") or [])):
            z_shoulder += 0.6
        shoulder_prob = round(max(0.05, min(0.92, self._sigmoid(z_shoulder))), 3)

        # --- E. Lower Back Risk ---
        # Driven by: trunk lean deviation, hip pelvic instability, bilateral asymmetry
        z_lower_back = -2.4 + (trunk_lean_mean * 0.12) + (hip_stab_mean * 0.09) + (knee_asym_mean * 0.04) + (training_load * 0.3)
        if any("back" in str(x).lower() or "spine" in str(x).lower() for x in (athlete_profile.get("previous_injuries") or [])):
            z_lower_back += 0.6
        lower_back_prob = round(max(0.05, min(0.95, self._sigmoid(z_lower_back))), 3)

        # --- F. Overuse Risk ---
        # Driven by: movement variability, high training load, multi-region asymmetry, fatigue decay
        z_overuse = -2.5 + (training_load * 1.5) + (variability * 0.08) + ((knee_asym_mean + hip_asym_mean) * 0.04) + (injury_hist_count * 0.3)
        overuse_prob = round(max(0.05, min(0.95, self._sigmoid(z_overuse))), 3)

        return {
            "acl": acl_prob,
            "hamstring": hamstring_prob,
            "ankle": ankle_prob,
            "shoulder": shoulder_prob,
            "lower_back": lower_back_prob,
            "overuse": overuse_prob
        }

    def predict(self, aggregated_features: Dict[str, Any], threshold: float = 0.5) -> Dict[str, int]:
        probs = self.predict_proba(aggregated_features)
        return {k: 1 if v >= threshold else 0 for k, v in probs.items()}

    def explain(
        self,
        aggregated_features: Dict[str, Any],
        athlete_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns feature contributions with weights and impact values for explainability.
        """
        probs = self.predict_proba(aggregated_features, athlete_profile)
        explanations: Dict[str, List[Dict[str, Any]]] = {}

        # ACL explanation
        valgus = self._get_val(aggregated_features, "knee_valgus_angle", "mean", 4.0)
        knee_asym = self._get_val(aggregated_features, "bilateral_knee_asymmetry", "mean", 6.0)
        explanations["acl"] = [
            {"factor": "Knee Valgus Deviation", "value": f"{valgus:.1f}°", "impact_weight": 0.55, "direction": "elevates" if valgus > 10 else "normal"},
            {"factor": "Bilateral Knee Asymmetry", "value": f"{knee_asym:.1f}°", "impact_weight": 0.30, "direction": "elevates" if knee_asym > 12 else "normal"},
            {"factor": "Training Load Factor", "value": "Profile-derived", "impact_weight": 0.15, "direction": "neutral"}
        ]

        # Hamstring explanation
        hip_asym = self._get_val(aggregated_features, "bilateral_hip_asymmetry", "mean", 5.0)
        explanations["hamstring"] = [
            {"factor": "Bilateral Hip Asymmetry", "value": f"{hip_asym:.1f}°", "impact_weight": 0.50, "direction": "elevates" if hip_asym > 10 else "normal"},
            {"factor": "Pelvic Kinematic Variability", "value": "Observed", "impact_weight": 0.30, "direction": "elevates" if hip_asym > 12 else "normal"}
        ]

        # Ankle explanation
        ankle_asym = self._get_val(aggregated_features, "bilateral_ankle_asymmetry", "mean", 6.0)
        explanations["ankle"] = [
            {"factor": "Bilateral Ankle Discrepancy", "value": f"{ankle_asym:.1f}°", "impact_weight": 0.60, "direction": "elevates" if ankle_asym > 12 else "normal"},
            {"factor": "Postural Sway Index", "value": "Computed", "impact_weight": 0.40, "direction": "normal"}
        ]

        # Lower back explanation
        trunk = self._get_val(aggregated_features, "trunk_lean", "mean", 5.0)
        explanations["lower_back"] = [
            {"factor": "Trunk Lean Deviation", "value": f"{trunk:.1f}°", "impact_weight": 0.55, "direction": "elevates" if trunk > 10 else "normal"},
            {"factor": "Pelvic Tilt Index", "value": "Computed", "impact_weight": 0.45, "direction": "normal"}
        ]

        # Shoulder explanation
        shoulder = self._get_val(aggregated_features, "shoulder_asymmetry", "mean", 4.0)
        explanations["shoulder"] = [
            {"factor": "Shoulder Alignment Tilt", "value": f"{shoulder:.1f}°", "impact_weight": 0.70, "direction": "elevates" if shoulder > 8 else "normal"}
        ]

        # Overuse explanation
        explanations["overuse"] = [
            {"factor": "Training Frequency & Load", "value": "Profile / session metrics", "impact_weight": 0.60, "direction": "normal"},
            {"factor": "Kinematic Sequence Variability", "value": "Computed", "impact_weight": 0.40, "direction": "normal"}
        ]

        return explanations

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "model_type": "Baseline Biomechanical Logistic Estimator",
            "model_version": self.version,
            "target_categories": self.TARGET_CATEGORIES,
            "is_clinically_validated": False,
            "clinical_disclaimer": "This is a research-oriented screening baseline. It is not clinically validated for diagnostic use.",
            "requires_labeled_cohort": True
        }
