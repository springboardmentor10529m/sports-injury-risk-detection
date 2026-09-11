"""
AthleteGuard - Personalized Recommendation Engine
Generates targeted, prioritized, and personalized biomechanical conditioning,
mobility, strengthening, and load modification recommendations.
"""

from typing import Dict, Any, List, Optional

RECOMMENDATION_DISCLAIMER = (
    "These recommendations are screening/support information and are not a medical diagnosis. "
    "Consult a qualified healthcare professional for clinical assessment."
)


class PersonalizedRecommendationEngine:
    """
    Rule and model-based recommendation engine tailoring biomechanical interventions
    to detected movement anomalies, specific injury risk profiles, and training load.
    """

    @classmethod
    def generate_recommendations(
        cls,
        overall_risk: float,
        risk_level: str,
        injury_probabilities: Dict[str, float],
        biomechanical_summary: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        athlete_profile: Optional[Dict[str, Any]] = None,
        activity: str = "General Movement"
    ) -> Dict[str, Any]:
        """
        Synthesizes recommendations across exercise, mobility, strengthening, recovery,
        and training modification categories with full metadata.
        """
        athlete_profile = athlete_profile or {}
        items: List[Dict[str, Any]] = []

        def _get(key, stat, d=0.0):
            obj = biomechanical_summary.get(key, {})
            return float(obj.get(stat, d)) if isinstance(obj, dict) else float(d)

        valgus_mean = _get("knee_valgus_angle", "mean", 0.0)
        valgus_pct = _get("knee_valgus_angle", "high_risk_frame_percentage", 0.0)
        knee_asym = _get("bilateral_knee_asymmetry", "mean", 0.0)
        hip_asym = _get("bilateral_hip_asymmetry", "mean", 0.0)
        trunk_lean = _get("trunk_lean", "mean", 0.0)
        ankle_asym = _get("bilateral_ankle_asymmetry", "mean", 0.0)

        acl_prob = injury_probabilities.get("acl", 0.0)
        hamstring_prob = injury_probabilities.get("hamstring", 0.0)
        ankle_prob = injury_probabilities.get("ankle", 0.0)
        lower_back_prob = injury_probabilities.get("lower_back", 0.0)
        overuse_prob = injury_probabilities.get("overuse", 0.0)

        # 1. Knee Valgus / ACL Intervention
        if valgus_mean >= 12.0 or valgus_pct >= 15.0 or acl_prob >= 0.50:
            prio = "CRITICAL" if valgus_mean >= 20.0 or acl_prob >= 0.75 else ("HIGH" if valgus_mean >= 14.0 else "MODERATE")
            items.append({
                "reason": f"Elevated knee valgus ({valgus_mean:.1f}° mean, {valgus_pct:.0f}% high-risk frames) during dynamic loading",
                "priority": prio,
                "target_region": "knee",
                "target_biomechanical_problem": "Dynamic knee valgus / medial knee collapse",
                "category": "strengthening",
                "exercise": "Gluteus medius resisted band walks and single-leg Romanian deadlifts",
                "suggested_frequency": "3-4 sessions/week",
                "suggested_sets_reps": "3 sets x 12 reps per leg",
                "expected_objective": "Strengthen hip abductors and external rotators to stabilize frontal plane knee alignment."
            })
            items.append({
                "reason": "Abnormal landing deceleration forces detected in lower extremity chain",
                "priority": prio,
                "target_region": "knee",
                "target_biomechanical_problem": "Stiff-legged or uncoordinated landing absorption",
                "category": "exercise",
                "exercise": "Controlled depth drop-landings onto foam mat focusing on soft knee flexion and knee-over-toe tracking",
                "suggested_frequency": "2-3 sessions/week",
                "suggested_sets_reps": "4 sets x 5 landings with 30s rest",
                "expected_objective": "Improve neuromuscular landing mechanics and reduce ground impact peaks."
            })

        # 2. Bilateral Asymmetry / Hamstring Intervention
        if knee_asym >= 15.0 or hip_asym >= 14.0 or hamstring_prob >= 0.50:
            prio = "HIGH" if knee_asym >= 22.0 or hamstring_prob >= 0.70 else "MODERATE"
            items.append({
                "reason": f"Significant bilateral asymmetry (Knee: {knee_asym:.1f}°, Hip: {hip_asym:.1f}° delta)",
                "priority": prio,
                "target_region": "bilateral_lower_limbs",
                "target_biomechanical_problem": "Unilateral limb dominance and asymmetrical force distribution",
                "category": "strengthening",
                "exercise": "Nordic hamstring curls and unilateral Bulgarian split squats",
                "suggested_frequency": "2 sessions/week",
                "suggested_sets_reps": "3 sets x 8 reps each side",
                "expected_objective": "Balance unilateral quad-to-hamstring ratio and equalize limb loading capacity."
            })

        # 3. Trunk Lean / Lower Back Intervention
        if trunk_lean >= 10.0 or lower_back_prob >= 0.50:
            prio = "HIGH" if trunk_lean >= 16.0 else "MODERATE"
            items.append({
                "reason": f"Excessive trunk lean ({trunk_lean:.1f}° mean) during athletic movement",
                "priority": prio,
                "target_region": "spine_core",
                "target_biomechanical_problem": "Insufficient core anti-lateral flexion and thoracic control",
                "category": "mobility",
                "exercise": "Thoracic spine foam roller extensions and Pallof isometric core presses",
                "suggested_frequency": "Daily / Warm-up routine",
                "suggested_sets_reps": "3 sets x 30 second holds per side",
                "expected_objective": "Enhance lumbo-pelvic stability to maintain upright torso alignment."
            })

        # 4. Ankle Instability Intervention
        if ankle_asym >= 14.0 or ankle_prob >= 0.50:
            items.append({
                "reason": f"Ankle kinematic discrepancy ({ankle_asym:.1f}° bilateral delta)",
                "priority": "MODERATE",
                "target_region": "ankle",
                "target_biomechanical_problem": "Unequal ankle dorsiflexion and subtalar instability",
                "category": "mobility",
                "exercise": "Weight-bearing ankle dorsiflexion knee-to-wall mobilizations and single-leg balance on wobble board",
                "suggested_frequency": "3 sessions/week",
                "suggested_sets_reps": "2 sets x 15 reps + 60s balance hold",
                "expected_objective": "Restore symmetrical ankle dorsiflexion range of motion and proprioception."
            })

        # 5. High Load & Overuse / Recovery Intervention
        training_load = float(athlete_profile.get("training_load") or 50.0)
        if overall_risk >= 60.0 or overuse_prob >= 0.55 or training_load >= 75.0:
            prio = "CRITICAL" if overall_risk >= 80.0 else "HIGH"
            items.append({
                "reason": f"Elevated cumulative risk ({overall_risk:.1f}/100) or high training load ({training_load:.0f}%)",
                "priority": prio,
                "target_region": "systemic",
                "target_biomechanical_problem": "Cumulative tissue fatigue and high injury susceptibility",
                "category": "training_modification",
                "exercise": "De-load maximal impact plyometric and high-velocity sprint volume by 25-35%",
                "suggested_frequency": "Next 7-10 training days",
                "suggested_sets_reps": "Active recovery substitution (swimming / stationary cycling)",
                "expected_objective": "Allow connective tissue adaptation and reset neuromuscular fatigue."
            })
            items.append({
                "reason": "Systemic fatigue and elevated biomechanical strain",
                "priority": "HIGH",
                "target_region": "systemic",
                "target_biomechanical_problem": "Delayed neuromuscular recovery",
                "category": "recovery",
                "exercise": "Contrast water therapy / cold compression protocol and structured sleep hygiene (8+ hrs)",
                "suggested_frequency": "Post-session within 2 hours",
                "suggested_sets_reps": "15 minutes active recovery protocol",
                "expected_objective": "Accelerate muscle recovery and suppress inflammatory biomechanical degradation."
            })
        else:
            # Baseline maintenance recommendation for low risk athletes
            if not items:
                items.append({
                    "reason": "Symmetrical movement patterns and baseline stability maintained",
                    "priority": "LOW",
                    "target_region": "general",
                    "target_biomechanical_problem": "Maintenance conditioning",
                    "category": "exercise",
                    "exercise": "Dynamic warm-up with multi-directional lunges and progressive plyometrics",
                    "suggested_frequency": "Prior to all athletic sessions",
                    "suggested_sets_reps": "10-15 minutes progressive drill sequence",
                    "expected_objective": "Maintain optimal joint mobility, neuromuscular activation, and bilateral symmetry."
                })

        # Group into synthesized category text fields for backwards compatibility with database
        cat_map = {
            "exercise": [],
            "mobility": [],
            "strengthening": [],
            "recovery": [],
            "training_modification": []
        }
        for item in items:
            c = item.get("category", "exercise")
            if c in cat_map:
                cat_map[c].append(item["exercise"])

        return {
            "disclaimer": RECOMMENDATION_DISCLAIMER,
            "total_recommendations": len(items),
            "recommendations": items,
            "legacy_summary": {
                "exercise": " | ".join(cat_map["exercise"][:2]) or "Maintain dynamic athletic conditioning and symmetrical mobility drills.",
                "mobility": " | ".join(cat_map["mobility"][:2]) or "Dynamic thoracic rotations and bilateral ankle dorsiflexion stretches.",
                "strengthening": " | ".join(cat_map["strengthening"][:2]) or "Hip abductor band walks and eccentric posterior chain strengthening.",
                "recovery": " | ".join(cat_map["recovery"][:2]) or "Standard post-workout cool-down and adequate sleep recovery.",
                "training_modification": " | ".join(cat_map["training_modification"][:2]) or "Maintain planned training schedule with continuous biomechanical monitoring."
            }
        }
