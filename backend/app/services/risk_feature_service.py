"""
Risk Feature Extraction Service.
Synthesizes kinematic indicators, athlete context (training load, injury history),
and detected movement anomalies into a unified feature vector for risk assessment.
"""
from typing import Dict, Any, List
from datetime import datetime

class RiskFeatureExtractor:
    def extract_features(
        self,
        kinematics: Dict[str, Any],
        athlete_profile: Dict[str, Any] = None,
        anomalies: List[Dict[str, Any]] = None,
        injury_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extracts structured numerical and categorical features from raw kinematic analysis,
        athlete profile data, detected movement anomalies, and past injury history.
        """
        athlete_profile = athlete_profile or {}
        anomalies = anomalies or []
        injury_history = injury_history or []

        # 1. Kinematic Features
        knee_valgus = float(kinematics.get("knee_valgus", 1.0) or 1.0)
        trunk_lean = float(kinematics.get("trunk_lean", 0.0) or 0.0)
        hip_stability = float(kinematics.get("hip_stability", 0.0) or 0.0)
        symmetry_score = float(kinematics.get("symmetry_score", 100.0) or 100.0)
        fatigue_score = float(kinematics.get("fatigue_score", 0.0) or 0.0)
        joint_alignment = float(kinematics.get("joint_alignment", 0.0) or 0.0)
        movement_quality = float(kinematics.get("movement_quality", 100.0) or 100.0)

        # 2. Athlete Context Features
        training_load = float(athlete_profile.get("training_load", 0.0) or 0.0)
        flexibility = float(athlete_profile.get("flexibility", 50.0) or 50.0)
        strength = float(athlete_profile.get("strength", 50.0) or 50.0)
        balance = float(athlete_profile.get("balance", 50.0) or 50.0)

        # 3. Injury History Categorization
        knee_acl_history = False
        hamstring_history = False
        ankle_history = False
        shoulder_history = False
        back_history = False

        for inj in injury_history:
            body_part = str(inj.get("body_part", "")).lower()
            inj_type = str(inj.get("injury_type", "")).lower()
            combined = f"{body_part} {inj_type}"

            if "knee" in combined or "acl" in combined:
                knee_acl_history = True
            if "hamstring" in combined or "thigh" in combined:
                hamstring_history = True
            if "ankle" in combined or "foot" in combined:
                ankle_history = True
            if "shoulder" in combined or "rotator" in combined:
                shoulder_history = True
            if "back" in combined or "spine" in combined or "lumbar" in combined:
                back_history = True

        # 4. Anomaly Density & Severity Features
        anomaly_count = len(anomalies)
        high_severity_anomalies = sum(1 for a in anomalies if a.get("severity") == "High")
        moderate_severity_anomalies = sum(1 for a in anomalies if a.get("severity") == "Moderate")

        # 5. Derived Risk Indicators
        valgus_deficit = max(0.0, 0.85 - knee_valgus) / 0.85 * 100.0
        trunk_lean_excess = max(0.0, trunk_lean - 20.0) / 20.0 * 100.0
        asymmetry_deficit = max(0.0, 100.0 - symmetry_score)
        hip_instability_excess = max(0.0, hip_stability - 5.0) / 5.0 * 100.0

        return {
            "knee_valgus": knee_valgus,
            "valgus_deficit_pct": round(valgus_deficit, 2),
            "trunk_lean_deg": trunk_lean,
            "trunk_lean_excess_pct": round(trunk_lean_excess, 2),
            "hip_stability_deg": hip_stability,
            "hip_instability_excess_pct": round(hip_instability_excess, 2),
            "symmetry_score": symmetry_score,
            "asymmetry_deficit_pct": round(asymmetry_deficit, 2),
            "fatigue_score": fatigue_score,
            "joint_alignment_deg": joint_alignment,
            "movement_quality": movement_quality,
            "training_load_hrs": training_load,
            "flexibility_score": flexibility,
            "strength_score": strength,
            "balance_score": balance,
            "injury_history": {
                "has_knee_acl_history": knee_acl_history,
                "has_hamstring_history": hamstring_history,
                "has_ankle_history": ankle_history,
                "has_shoulder_history": shoulder_history,
                "has_back_history": back_history,
                "total_injuries": len(injury_history),
            },
            "anomaly_summary": {
                "total_count": anomaly_count,
                "high_severity_count": high_severity_anomalies,
                "moderate_severity_count": moderate_severity_anomalies,
            }
        }

risk_feature_extractor = RiskFeatureExtractor()
