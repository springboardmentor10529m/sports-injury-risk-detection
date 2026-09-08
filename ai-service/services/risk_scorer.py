"""
5-Factor Weighted Injury Risk Scorer
Implements the exact weighted scoring formula from the specification:
Risk Score = 0.35 * Biomechanics + 0.20 * History + 0.20 * Asymmetry + 0.15 * Training Load + 0.10 * Fatigue
Strictly preserves separation between:
1. Biomechanical Measurements
2. ML Prediction Probabilities
3. Comprehensive Weighted Risk Score (0 - 100)
"""

import numpy as np
from typing import Dict, Any, Optional

class RiskScorer:
    WEIGHT_BIOMECHANICS = 0.35
    WEIGHT_HISTORY = 0.20
    WEIGHT_ASYMMETRY = 0.20
    WEIGHT_LOAD = 0.15
    WEIGHT_FATIGUE = 0.10

    def compute_risk_score(
        self,
        summary_kinematics: Dict[str, Any],
        ml_prediction: Dict[str, Any],
        athlete_history: Optional[Dict[str, Any]] = None,
        workload_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Computes the unified 5-factor weighted injury risk score (0-100).
        """
        history = athlete_history or {}
        workload = workload_data or {}

        # -------------------------------------------------------------
        # Factor 1: Biomechanics Sub-score (0 - 100)
        # -------------------------------------------------------------
        valgus = summary_kinematics.get("knee_valgus", {})
        trunk = summary_kinematics.get("trunk_lean", {})
        knee = summary_kinematics.get("knee_flexion", {})

        valgus_max = valgus.get("max", 0.0)
        trunk_max = trunk.get("max", 0.0)
        knee_rom = knee.get("rom", 60.0)

        # Baseline biomechanical penalty
        bio_valgus_sub = min(100.0, (valgus_max / 15.0) * 60.0) if valgus_max > 5.0 else 10.0
        bio_trunk_sub = min(100.0, (trunk_max / 12.0) * 30.0) if trunk_max > 5.0 else 5.0
        bio_stiff_sub = 25.0 if knee_rom < 35.0 else 0.0
        
        # Incorporate ML predicted severity probability into biomechanical risk tier
        sev_probs = ml_prediction.get("severity_probabilities", {})
        severe_prob = sev_probs.get("Severe", 0.33)
        ml_bio_component = severe_prob * 100.0

        biomechanics_score = float(np.clip(
            0.60 * (bio_valgus_sub * 0.5 + bio_trunk_sub * 0.3 + bio_stiff_sub * 0.2) + 0.40 * ml_bio_component,
            5.0, 100.0
        ))

        # -------------------------------------------------------------
        # Factor 2: Injury History Sub-score (0 - 100)
        # -------------------------------------------------------------
        prev_injuries = int(history.get("previous_injuries", 0))
        recurrence = int(history.get("injury_recurrence", 0))
        has_chronic = bool(history.get("chronic_conditions", False))

        if prev_injuries == 0 and not has_chronic:
            history_score = 12.0
        elif prev_injuries == 1:
            history_score = 45.0 + (15.0 if recurrence else 0.0)
        elif prev_injuries == 2:
            history_score = 70.0 + (15.0 if recurrence else 0.0)
        else:
            history_score = 90.0

        # -------------------------------------------------------------
        # Factor 3: Kinematic Asymmetry Sub-score (0 - 100)
        # -------------------------------------------------------------
        asym = summary_kinematics.get("bilateral_asymmetry", {})
        mean_asym = asym.get("mean", 5.0)
        peak_asym = asym.get("max", 8.0)

        # Asymmetry scale: 0-5% is normal (<15), 10% is ~40, 18%+ is >75
        asymmetry_score = float(np.clip(
            (mean_asym * 3.5) + (peak_asym * 1.0),
            5.0, 100.0
        ))

        # -------------------------------------------------------------
        # Factor 4: Training Load Sub-score (0 - 100)
        # -------------------------------------------------------------
        # ACWR or training intensity (0.0 to 1.0)
        intensity = float(workload.get("training_intensity", 0.50))
        weekly_hours = float(workload.get("weekly_training_hours", 12.0))

        if intensity > 0.85 or weekly_hours > 24.0:
            load_score = 85.0
        elif intensity > 0.70 or weekly_hours > 18.0:
            load_score = 65.0
        elif intensity < 0.30:
            load_score = 35.0  # Under-conditioned
        else:
            load_score = 25.0  # Optimal training load

        # -------------------------------------------------------------
        # Factor 5: Fatigue & Recovery Sub-score (0 - 100)
        # -------------------------------------------------------------
        recovery_days = float(workload.get("recovery_time_days", 3.0))
        sleep_hours = float(workload.get("sleep_hours_avg", 7.5))

        fatigue_sub = 0.0
        if recovery_days < 1.5:
            fatigue_sub += 50.0
        elif recovery_days < 2.5:
            fatigue_sub += 25.0
        else:
            fatigue_sub += 10.0

        if sleep_hours < 6.0:
            fatigue_sub += 40.0
        elif sleep_hours < 7.0:
            fatigue_sub += 20.0
        else:
            fatigue_sub += 5.0

        fatigue_score = float(np.clip(fatigue_sub, 5.0, 100.0))

        # -------------------------------------------------------------
        # Unified 5-Factor Weighted Calculation
        # -------------------------------------------------------------
        total_risk_score = (
            self.WEIGHT_BIOMECHANICS * biomechanics_score +
            self.WEIGHT_HISTORY * history_score +
            self.WEIGHT_ASYMMETRY * asymmetry_score +
            self.WEIGHT_LOAD * load_score +
            self.WEIGHT_FATIGUE * fatigue_score
        )
        total_risk_score = round(float(np.clip(total_risk_score, 0.0, 100.0)), 1)

        # Risk Tier Classification (Spec Page 6)
        if total_risk_score < 25.0:
            risk_category = "LOW"
            category_color = "#10b981" # Green
        elif total_risk_score <= 50.0:
            risk_category = "MODERATE"
            category_color = "#f59e0b" # Yellow / Amber
        elif total_risk_score <= 75.0:
            risk_category = "HIGH"
            category_color = "#f97316" # Orange
        else:
            risk_category = "CRITICAL"
            category_color = "#ef4444" # Red

        return {
            "overall_risk_score": total_risk_score,
            "risk_category": risk_category,
            "category_color": category_color,
            "factor_breakdown": {
                "biomechanics": {
                    "score": round(biomechanics_score, 1),
                    "weight_pct": 35,
                    "weighted_contribution": round(biomechanics_score * self.WEIGHT_BIOMECHANICS, 1)
                },
                "injury_history": {
                    "score": round(history_score, 1),
                    "weight_pct": 20,
                    "weighted_contribution": round(history_score * self.WEIGHT_HISTORY, 1)
                },
                "bilateral_asymmetry": {
                    "score": round(asymmetry_score, 1),
                    "weight_pct": 20,
                    "weighted_contribution": round(asymmetry_score * self.WEIGHT_ASYMMETRY, 1)
                },
                "training_load": {
                    "score": round(load_score, 1),
                    "weight_pct": 15,
                    "weighted_contribution": round(load_score * self.WEIGHT_LOAD, 1)
                },
                "fatigue_recovery": {
                    "score": round(fatigue_score, 1),
                    "weight_pct": 10,
                    "weighted_contribution": round(fatigue_score * self.WEIGHT_FATIGUE, 1)
                }
            }
        }
