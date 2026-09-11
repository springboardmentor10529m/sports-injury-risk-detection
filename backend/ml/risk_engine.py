"""
AthleteGuard - Weighted Risk Scoring Engine
Centralized, explainable injury risk scoring utilizing weighted multi-factorial components:
- Biomechanical Deviations (35%)
- Historical Injury Factors (20%)
- Movement Asymmetry (20%)
- Training Load Indicators (15%)
- Fatigue Indicators (10%)
"""

from typing import Dict, Any, List, Optional
import math


class RiskScoringEngine:
    """
    Production-grade weighted risk scoring engine replacing heuristic risk calculations.
    Computes explainable 0–100 risk score with explicit contributing factor ranking.
    """

    MODEL_VERSION = "2.0.0-weighted"

    WEIGHT_BIOMECHANICAL = 0.35  # 35%
    WEIGHT_HISTORY = 0.20        # 20%
    WEIGHT_ASYMMETRY = 0.20      # 20%
    WEIGHT_LOAD = 0.15           # 15%
    WEIGHT_FATIGUE = 0.10        # 10%

    @classmethod
    def calculate(
        cls,
        aggregated_features: Dict[str, Any],
        athlete_profile: Optional[Dict[str, Any]] = None,
        injury_histories: Optional[List[Dict[str, Any]]] = None,
        model_risk_probabilities: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Executes weighted multi-factorial risk scoring.
        """
        athlete_profile = athlete_profile or {}
        injury_histories = injury_histories or []
        model_risk_probabilities = model_risk_probabilities or {}

        confidence = 0.95
        contributors: List[Dict[str, Any]] = []

        def _get(key, stat, d=0.0):
            obj = aggregated_features.get(key, {})
            return float(obj.get(stat, d)) if isinstance(obj, dict) else float(d)

        # ==========================================
        # 1. BIOMECHANICAL DEVIATIONS (Weight: 35%)
        # ==========================================
        valgus_mean = _get("knee_valgus_angle", "mean", 4.0)
        valgus_p95 = _get("knee_valgus_angle", "p95", 8.0)
        valgus_pct = _get("knee_valgus_angle", "high_risk_frame_percentage", 0.0)
        trunk_mean = _get("trunk_lean", "mean", 4.0)
        trunk_pct = _get("trunk_lean", "high_risk_frame_percentage", 0.0)
        hip_stab = _get("hip_stability", "mean", 4.0)

        # Normalized 0-100 biomechanical score
        bio_valgus_subscore = min(100.0, (valgus_mean / 22.0) * 50.0 + (valgus_pct / 100.0) * 50.0)
        bio_trunk_subscore = min(100.0, (trunk_mean / 20.0) * 50.0 + (trunk_pct / 100.0) * 50.0)
        bio_pelvic_subscore = min(100.0, (hip_stab / 15.0) * 100.0)

        raw_bio_score = (bio_valgus_subscore * 0.50) + (bio_trunk_subscore * 0.30) + (bio_pelvic_subscore * 0.20)
        bio_contribution = raw_bio_score * cls.WEIGHT_BIOMECHANICAL

        if valgus_mean >= 10.0 or valgus_pct >= 15.0:
            imp = round(bio_valgus_subscore * 0.50 * cls.WEIGHT_BIOMECHANICAL, 1)
            sev = "CRITICAL" if valgus_mean >= 20.0 else ("HIGH" if valgus_mean >= 14.0 else "MODERATE")
            contributors.append({
                "factor": f"Knee valgus deviation ({valgus_mean:.1f}° avg, {valgus_pct:.0f}% high-risk frames)",
                "impact": imp,
                "severity": sev,
                "body_region": "knee"
            })

        if trunk_mean >= 10.0 or trunk_pct >= 15.0:
            imp = round(bio_trunk_subscore * 0.30 * cls.WEIGHT_BIOMECHANICAL, 1)
            sev = "HIGH" if trunk_mean >= 16.0 else "MODERATE"
            contributors.append({
                "factor": f"Excessive trunk lean ({trunk_mean:.1f}° avg)",
                "impact": imp,
                "severity": sev,
                "body_region": "trunk"
            })

        # ==========================================
        # 2. HISTORICAL INJURY FACTORS (Weight: 20%)
        # ==========================================
        if injury_histories:
            hist_score = 0.0
            for inj in injury_histories:
                sev_weight = 1.0 if inj.get("severity") == "SEVERE" else (0.6 if inj.get("severity") == "MODERATE" else 0.3)
                # If no recovery date, elevated risk
                unresolved_bonus = 1.3 if not inj.get("recovery_date") else 1.0
                hist_score += 25.0 * sev_weight * unresolved_bonus
            raw_hist_score = min(100.0, hist_score)
            hist_contribution = raw_hist_score * cls.WEIGHT_HISTORY

            if raw_hist_score >= 20.0:
                contributors.append({
                    "factor": f"Documented injury history ({len(injury_histories)} prior incident(s))",
                    "impact": round(hist_contribution, 1),
                    "severity": "HIGH" if raw_hist_score >= 60.0 else "MODERATE",
                    "body_region": injury_histories[0].get("body_part", "musculoskeletal")
                })
        else:
            # Missing or unrecorded history: do not penalize heavily, adjust confidence
            raw_hist_score = 15.0
            hist_contribution = raw_hist_score * cls.WEIGHT_HISTORY
            confidence -= 0.10

        # ==========================================
        # 3. MOVEMENT ASYMMETRY (Weight: 20%)
        # ==========================================
        knee_asym = _get("bilateral_knee_asymmetry", "mean", 6.0)
        hip_asym = _get("bilateral_hip_asymmetry", "mean", 5.0)
        ankle_asym = _get("bilateral_ankle_asymmetry", "mean", 5.0)

        asym_knee_sub = min(100.0, (knee_asym / 25.0) * 100.0)
        asym_hip_sub = min(100.0, (hip_asym / 20.0) * 100.0)
        asym_ankle_sub = min(100.0, (ankle_asym / 22.0) * 100.0)

        raw_asym_score = (asym_knee_sub * 0.45) + (asym_hip_sub * 0.30) + (asym_ankle_sub * 0.25)
        asym_contribution = raw_asym_score * cls.WEIGHT_ASYMMETRY

        if knee_asym >= 12.0:
            contributors.append({
                "factor": f"Bilateral knee asymmetry ({knee_asym:.1f}° discrepancy)",
                "impact": round(asym_knee_sub * 0.45 * cls.WEIGHT_ASYMMETRY, 1),
                "severity": "CRITICAL" if knee_asym >= 22.0 else ("HIGH" if knee_asym >= 16.0 else "MODERATE"),
                "body_region": "bilateral_knees"
            })

        if hip_asym >= 12.0:
            contributors.append({
                "factor": f"Bilateral hip asymmetry ({hip_asym:.1f}° discrepancy)",
                "impact": round(asym_hip_sub * 0.30 * cls.WEIGHT_ASYMMETRY, 1),
                "severity": "HIGH" if hip_asym >= 18.0 else "MODERATE",
                "body_region": "hip_pelvis"
            })

        # ==========================================
        # 4. TRAINING LOAD INDICATORS (Weight: 15%)
        # ==========================================
        profile_load = athlete_profile.get("training_load")
        if profile_load is not None:
            raw_load_score = min(100.0, max(0.0, float(profile_load)))
        else:
            raw_load_score = 40.0
            confidence -= 0.05

        load_contribution = raw_load_score * cls.WEIGHT_LOAD
        if raw_load_score >= 70.0:
            contributors.append({
                "factor": f"High training load exposure ({raw_load_score:.0f}/100)",
                "impact": round(load_contribution, 1),
                "severity": "HIGH" if raw_load_score >= 85.0 else "MODERATE",
                "body_region": "systemic"
            })

        # ==========================================
        # 5. FATIGUE INDICATORS (Weight: 10%)
        # ==========================================
        # Derived from positive slopes (worsening asymmetry or valgus over sequence) and kinematic variability
        valgus_trend = _get("knee_valgus_angle", "temporal_trend_slope", 0.0)
        asym_trend = _get("bilateral_knee_asymmetry", "temporal_trend_slope", 0.0)
        variability = _get("movement_variability", "mean", 4.0)

        fatigue_sub = 20.0
        if valgus_trend > 0.05:
            fatigue_sub += min(40.0, valgus_trend * 200.0)
        if asym_trend > 0.05:
            fatigue_sub += min(30.0, asym_trend * 150.0)
        fatigue_sub += min(30.0, (variability / 15.0) * 30.0)

        raw_fatigue_score = min(100.0, fatigue_sub)
        fatigue_contribution = raw_fatigue_score * cls.WEIGHT_FATIGUE

        if raw_fatigue_score >= 60.0:
            contributors.append({
                "factor": "Kinematic degradation trend (fatigue-induced movement deterioration)",
                "impact": round(fatigue_contribution, 1),
                "severity": "HIGH" if raw_fatigue_score >= 75.0 else "MODERATE",
                "body_region": "musculoskeletal_chain"
            })

        # Calculate Overall Risk Score (0 - 100)
        overall_score = round(bio_contribution + hist_contribution + asym_contribution + load_contribution + fatigue_contribution, 1)
        overall_score = max(5.0, min(95.0, overall_score))

        # Risk level determination
        if overall_score >= 80.0:
            risk_level = "CRITICAL"
        elif overall_score >= 60.0:
            risk_level = "HIGH"
        elif overall_score >= 35.0:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # Keypoint tracking quality adjustment on confidence
        mean_kp_conf = _get("keypoint_confidence", "mean", 0.90)
        final_confidence = round(max(0.40, min(0.99, confidence * (mean_kp_conf if mean_kp_conf > 0.4 else 0.6))), 2)

        # Sort contributors by descending impact
        contributors.sort(key=lambda c: c["impact"], reverse=True)

        return {
            "overall_score": overall_score,
            "risk_level": risk_level,
            "confidence": final_confidence,
            "model_version": cls.MODEL_VERSION,
            "contributors": contributors,
            "component_scores": {
                "biomechanical": round(bio_contribution, 1),
                "historical": round(hist_contribution, 1),
                "asymmetry": round(asym_contribution, 1),
                "training_load": round(load_contribution, 1),
                "fatigue": round(fatigue_contribution, 1)
            }
        }
