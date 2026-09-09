"""
Modular Injury Risk Prediction Architecture.
Defines the `RiskPredictor` interface (ML-Ready abstraction) and the concrete
`RuleBasedRiskPredictor` prototype engine for Week 5 Movement Risk Intelligence.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from app.config.risk_config import (
    RISK_CATEGORIES,
    INJURY_RISK_RULES,
    CONTEXT_MULTIPLIERS,
    RESEARCH_DISCLAIMER
)

class RiskPredictor(ABC):
    """
    Abstract base interface for injury risk predictors.
    Ensures seamlessly swappable rule-based and machine-learning models.
    """
    @abstractmethod
    def predict_risk(self, feature_vector: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates specific injury risks and overall composite risk score from feature vector.
        """
        pass


class RuleBasedRiskPredictor(RiskPredictor):
    """
    Weighted rule-based risk predictor integrating kinematics, athlete context,
    anomaly frequency, and injury history.
    """
    def predict_risk(self, feature_vector: Dict[str, Any]) -> Dict[str, Any]:
        # Extract features
        valgus_deficit = feature_vector.get("valgus_deficit_pct", 0.0)
        trunk_lean_excess = feature_vector.get("trunk_lean_excess_pct", 0.0)
        asymmetry_deficit = feature_vector.get("asymmetry_deficit_pct", 0.0)
        hip_instability_excess = feature_vector.get("hip_instability_excess_pct", 0.0)
        joint_alignment_deg = feature_vector.get("joint_alignment_deg", 0.0)
        training_load = feature_vector.get("training_load_hrs", 0.0)

        injury_hist = feature_vector.get("injury_history", {})
        anomaly_summary = feature_vector.get("anomaly_summary", {})

        # 1. Individual Component Factor Calculations (0-100 scale)
        # Biomechanical Deviations (35% weight)
        bio_valgus = min(100.0, valgus_deficit * 1.2)
        bio_trunk = min(100.0, trunk_lean_excess * 1.5)
        bio_hip = min(100.0, hip_instability_excess * 1.5)
        biomechanical_risk = min(100.0, max(0.0, round((bio_valgus + bio_trunk + bio_hip) / 3.0, 1)))

        # Historical Injury Factors (20% weight)
        inj_count = injury_hist.get("total_injuries", 0)
        hist_base = min(100.0, inj_count * 25.0)
        if injury_hist.get("has_knee_acl_history") or injury_hist.get("has_hamstring_history"):
            hist_base = max(hist_base, 50.0)
        historical_injury_risk = min(100.0, max(0.0, round(hist_base, 1)))

        # Movement Asymmetry (20% weight)
        asymmetry_risk = min(100.0, max(0.0, round(asymmetry_deficit * 1.25, 1)))

        # Training Load Indicators (15% weight)
        training_load_risk = min(100.0, max(0.0, round((training_load / 20.0) * 100.0, 1)))

        # Fatigue Indicators (10% weight)
        fatigue_raw = feature_vector.get("fatigue_score")
        fatigue_available = fatigue_raw is not None and fatigue_raw != ""
        if fatigue_available:
            try:
                fatigue_val = float(fatigue_raw)
                # If fatigue_score is on a 0-10 scale, convert to 0-100; if already 0-100, keep
                fatigue_risk = min(100.0, max(0.0, round(fatigue_val * 10.0 if fatigue_val <= 10.0 else fatigue_val, 1)))
            except (ValueError, TypeError):
                fatigue_available = False
                fatigue_risk = None
        else:
            fatigue_risk = None

        # 2. Overall Composite Risk Calculation using specified weights:
        # formula: bio*0.35 + hist*0.20 + asym*0.20 + load*0.15 + fatigue*0.10
        if fatigue_available and fatigue_risk is not None:
            overall_score = (
                biomechanical_risk * 0.35 +
                historical_injury_risk * 0.20 +
                asymmetry_risk * 0.20 +
                training_load_risk * 0.15 +
                fatigue_risk * 0.10
            )
        else:
            # Normalize remaining weights (35 + 20 + 20 + 15 = 90 total weight)
            overall_score = (
                biomechanical_risk * (0.35 / 0.90) +
                historical_injury_risk * (0.20 / 0.90) +
                asymmetry_risk * (0.20 / 0.90) +
                training_load_risk * (0.15 / 0.90)
            )

        overall_score = min(100.0, max(0.0, round(overall_score, 1)))

        # Specific sub-risks for joint targets
        acl_risk = min(100.0, max(0.0, round(biomechanical_risk * 0.6 + asymmetry_risk * 0.4, 1)))
        hamstring_risk = min(100.0, max(0.0, round(asymmetry_risk * 0.5 + biomechanical_risk * 0.3 + training_load_risk * 0.2, 1)))
        f_risk_val = fatigue_risk if (fatigue_available and fatigue_risk is not None) else asymmetry_risk
        ankle_sprain_risk = min(100.0, max(0.0, round(asymmetry_risk * 0.5 + f_risk_val * 0.5, 1)))
        shoulder_risk = min(100.0, max(0.0, round(biomechanical_risk * 0.5 + asymmetry_risk * 0.5, 1)))
        lower_back_risk = min(100.0, max(0.0, round(biomechanical_risk * 0.7 + f_risk_val * 0.3, 1)))
        overuse_risk = min(100.0, max(0.0, round(training_load_risk * 0.5 + f_risk_val * 0.5, 1)))

        # 3. Categorization (0-25 LOW, 26-50 MODERATE, 51-75 HIGH, 76-100 CRITICAL)
        if overall_score <= 25.0:
            risk_category = "LOW"
        elif overall_score <= 50.0:
            risk_category = "MODERATE"
        elif overall_score <= 75.0:
            risk_category = "HIGH"
        else:
            risk_category = "CRITICAL"

        return {
            "overall_risk_score": overall_score,
            "risk_category": risk_category,
            "risk_level": risk_category,
            "biomechanical_risk": biomechanical_risk,
            "historical_injury_risk": historical_injury_risk,
            "asymmetry_risk": asymmetry_risk,
            "training_load_risk": training_load_risk,
            "fatigue_risk": fatigue_risk,
            "fatigue_available": fatigue_available,
            "acl_risk": acl_risk,
            "hamstring_risk": hamstring_risk,
            "ankle_sprain_risk": ankle_sprain_risk,
            "ankle_risk": ankle_sprain_risk,
            "shoulder_risk": shoulder_risk,
            "lower_back_risk": lower_back_risk,
            "overuse_risk": overuse_risk,
            "disclaimer": RESEARCH_DISCLAIMER
        }


# Maintain backward-compatible wrapper service
class RiskPredictionService:
    def __init__(self, predictor: RiskPredictor = None):
        self.predictor = predictor or RuleBasedRiskPredictor()

    def predict_injury_risks(self, kinematics: Dict[str, Any], athlete_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        from app.services.risk_feature_service import risk_feature_extractor
        features = risk_feature_extractor.extract_features(kinematics, athlete_profile)
        return self.predictor.predict_risk(features)

risk_prediction_service = RiskPredictionService()
