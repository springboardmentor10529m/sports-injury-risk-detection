"""
Risk Explanation Service.
Generates clear, human-readable, educational explanations detailing the biomechanical factors,
athlete context, and movement anomalies contributing to elevated injury risk scores.
"""
from typing import Dict, Any, List
from app.config.risk_config import KINEMATIC_THRESHOLDS

class RiskExplanationService:
    def generate_explanations(
        self,
        risk_results: Dict[str, Any],
        feature_vector: Dict[str, Any],
        anomalies: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates structured, human-readable risk explanations and contributing factors.
        """
        anomalies = anomalies or []
        explanations: List[str] = []
        contributing_factors: List[Dict[str, Any]] = []

        overall_score = risk_results.get("overall_risk_score", 0.0)
        risk_category = risk_results.get("risk_category", "Low")

        # 1. Kinematic Deficits Analysis
        knee_valgus = feature_vector.get("knee_valgus", 1.0)
        if knee_valgus < KINEMATIC_THRESHOLDS["knee_valgus_normal_min"]:
            severity = "High" if knee_valgus < KINEMATIC_THRESHOLDS["knee_valgus_critical_max"] else "Moderate"
            explanations.append(
                f"Knee Valgus Ratio ({knee_valgus:.2f}) falls below the physiological reference limit (0.85), "
                f"indicating dynamic medial collapse during acceleration or landing."
            )
            contributing_factors.append({
                "factor": "Knee Valgus Collapse",
                "impact": severity,
                "detail": f"Measured valgus ratio: {knee_valgus:.2f} (Target >= 0.85)"
            })

        trunk_lean = feature_vector.get("trunk_lean_deg", 0.0)
        if trunk_lean > KINEMATIC_THRESHOLDS["trunk_lean_max_deg"]:
            severity = "High" if trunk_lean > KINEMATIC_THRESHOLDS["trunk_lean_critical_deg"] else "Moderate"
            explanations.append(
                f"Trunk Forward Lean ({trunk_lean:.1f}°) exceeds optimal postural limit (20.0°), "
                f"increasing lumbar spine compression and hamstring tension."
            )
            contributing_factors.append({
                "factor": "Excessive Trunk Lean",
                "impact": severity,
                "detail": f"Measured lean: {trunk_lean:.1f}° (Target <= 20.0°)"
            })

        hip_stability = feature_vector.get("hip_stability_deg", 0.0)
        if hip_stability > KINEMATIC_THRESHOLDS["hip_tilt_max_deg"]:
            explanations.append(
                f"Lateral Hip Tilt ({hip_stability:.1f}°) indicates pelvic instability and gluteus medius insufficiency."
            )
            contributing_factors.append({
                "factor": "Pelvic Drop / Instability",
                "impact": "Moderate",
                "detail": f"Measured hip tilt: {hip_stability:.1f}° (Target <= 5.0°)"
            })

        symmetry_score = feature_vector.get("symmetry_score", 100.0)
        if symmetry_score < KINEMATIC_THRESHOLDS["limb_symmetry_min_pct"]:
            explanations.append(
                f"Limb Symmetry Score ({symmetry_score:.1f}%) demonstrates significant bilateral kinematic asymmetry."
            )
            contributing_factors.append({
                "factor": "Limb Asymmetry",
                "impact": "High" if symmetry_score < 80.0 else "Moderate",
                "detail": f"Symmetry score: {symmetry_score:.1f}% (Target >= 90.0%)"
            })

        # 2. Athlete Context Analysis
        training_load = feature_vector.get("training_load_hrs", 0.0)
        if training_load > 14.0:
            explanations.append(
                f"Elevated weekly training load ({training_load:.1f} hrs/wk) multiplies cumulative musculoskeletal strain risk."
            )
            contributing_factors.append({
                "factor": "High Training Volume",
                "impact": "Moderate",
                "detail": f"Weekly load: {training_load:.1f} hrs"
            })

        injury_hist = feature_vector.get("injury_history", {})
        if injury_hist.get("has_knee_acl_history"):
            explanations.append("Prior knee/ACL injury history elevates knee stability vulnerability score.")
            contributing_factors.append({
                "factor": "Prior Knee Injury History",
                "impact": "High",
                "detail": "Past knee/ACL strain logged in profile."
            })

        if injury_hist.get("has_hamstring_history"):
            explanations.append("Prior hamstring injury history increases vulnerability during dynamic deceleration.")
            contributing_factors.append({
                "factor": "Prior Hamstring Strain",
                "impact": "High",
                "detail": "Past hamstring strain logged in profile."
            })

        # 3. Anomaly Analysis
        if anomalies:
            high_anomalies = [a for a in anomalies if a.get("severity") == "High"]
            if high_anomalies:
                explanations.append(
                    f"{len(high_anomalies)} high-severity acute movement anomalies detected during execution phase."
                )

        # Fallback if movement execution was optimal
        if not explanations:
            explanations.append(
                "Biomechanical kinematic indicators fall within normal physiological reference ranges. No acute mechanical deficits detected."
            )

        summary_narrative = (
            f"Overall risk evaluated as {risk_category.upper()} ({overall_score:.1f}%). "
            f"Primary risk drivers: {', '.join([f['factor'] for f in contributing_factors[:3]]) if contributing_factors else 'None (Optimal Movement Alignment)'}."
        )

        return {
            "summary_narrative": summary_narrative,
            "explanations": explanations,
            "contributing_factors": contributing_factors
        }

risk_explanation_service = RiskExplanationService()
