"""
SportShield Deterministic Recommendation Engine
Maps observed biomechanical anomalies, fatigue metrics, and injury history
to targeted prescriptions across 5 required clinical/conditioning categories:
1. Corrective Drills
2. Mobility & Flexibility
3. Strengthening
4. Recovery
5. Workload Modification
Each recommendation explicitly states WHY it was generated.
"""

from typing import Dict, Any, List, Optional


def generate_targeted_recommendations(
    biomechanics: Dict[str, Any],
    risk_prediction: Dict[str, Any],
    anomalies: Optional[List[Dict[str, Any]]] = None,
    training_load: float = 70.0,
    rpe_score: float = 5.0
) -> Dict[str, Any]:
    """
    Generates structured, explainable recommendations across 5 categories.
    """
    knee_valgus = float(biomechanics.get("knee_valgus_angle_deg") or biomechanics.get("knee_valgus") or 11.5)
    hip_stability = float(biomechanics.get("hip_stability_score") or biomechanics.get("hip_stability") or 80.0)
    trunk_lean = float(biomechanics.get("trunk_lateral_flexion_deg") or biomechanics.get("trunk_lean") or 8.0)
    symmetry = float(biomechanics.get("bilateral_symmetry_pct") or biomechanics.get("symmetry_score") or 85.0)
    rom = float(biomechanics.get("range_of_motion_deg") or 105.0)
    smoothness = float(biomechanics.get("movement_smoothness_score") or biomechanics.get("movement_quality") or 80.0)

    overall_risk = float(risk_prediction.get("overall_risk_score", 45.0))
    acl_risk = float(risk_prediction.get("acl_risk", 30.0))
    hamstring_risk = float(risk_prediction.get("hamstring_risk", 30.0))
    lower_back_risk = float(risk_prediction.get("lower_back_risk", 30.0))

    recs_by_category = {
        "corrective_drills": [],
        "mobility_flexibility": [],
        "strengthening": [],
        "recovery": [],
        "workload_modification": [],
    }

    # -------------------------------------------------------------
    # 1. CORRECTIVE DRILLS
    # -------------------------------------------------------------
    if knee_valgus > 12.0:
        recs_by_category["corrective_drills"].append({
            "title": "Banded Squats & Deceleration Landings",
            "prescription": "3 sets × 10 reps, 3x per week with mini-band above patella",
            "why_generated": f"Knee Valgus measured at {knee_valgus:.1f}° (safe baseline < 12.0°). Medial knee collapse detected during dynamic stance.",
            "target_issue": "Dynamic Valgus Collapse / ACL Strain",
            "priority": "HIGH" if knee_valgus > 16.0 else "MODERATE"
        })
    else:
        recs_by_category["corrective_drills"].append({
            "title": "Neuromuscular Jump-Landing Stabilization",
            "prescription": "2 sets × 8 reps prior to practice",
            "why_generated": "Proactive neuromuscular maintenance: maintain frontal knee alignment under acceleration.",
            "target_issue": "General Kinetic Chain Alignment",
            "priority": "LOW"
        })

    if symmetry < 82.0:
        recs_by_category["corrective_drills"].append({
            "title": "Single-Leg Box Drops & Stick Landings",
            "prescription": "3 sets × 6 reps each leg, emphasizing 2-second hold at landing",
            "why_generated": f"Bilateral symmetry dropped to {symmetry:.1f}% (< 82.0% threshold). Indicates preferential limb loading.",
            "target_issue": "Limb Asymmetry & Unilateral Compensation",
            "priority": "HIGH" if symmetry < 75.0 else "MODERATE"
        })

    # -------------------------------------------------------------
    # 2. MOBILITY & FLEXIBILITY
    # -------------------------------------------------------------
    if rom < 95.0:
        recs_by_category["mobility_flexibility"].append({
            "title": "Active-Isolated Hamstring & Hip Flexor Excursion",
            "prescription": "2 sets × 45 seconds each side post-training",
            "why_generated": f"Restricted Range of Motion: {rom:.1f}° observed (normative functional range: 95°–125°).",
            "target_issue": "Restricted Joint Excursion & Hamstring Tightness",
            "priority": "HIGH" if rom < 85.0 else "MODERATE"
        })
    else:
        recs_by_category["mobility_flexibility"].append({
            "title": "Dynamic 90/90 Hip Flow & Thoracic Rotations",
            "prescription": "2 sets × 8 reps each direction daily during warm-up",
            "why_generated": "Preserves functional hip internal/external rotation and spinal dissociation.",
            "target_issue": "Functional Hip & Spinal Mobility",
            "priority": "LOW"
        })

    if trunk_lean > 8.0:
        recs_by_category["mobility_flexibility"].append({
            "title": "Quadratus Lumborum & Psoas Soft-Tissue Mobility",
            "prescription": "2 sets × 60 seconds passive stretch + foam roll lateral chain",
            "why_generated": f"Trunk lateral lean reached {trunk_lean:.1f}° (> 8.0° threshold), indicating unilateral spinal tightness.",
            "target_issue": "Lateral Torso Sway & Lumbar Strain",
            "priority": "MODERATE"
        })

    # -------------------------------------------------------------
    # 3. STRENGTHENING
    # -------------------------------------------------------------
    if hip_stability < 75.0:
        recs_by_category["strengthening"].append({
            "title": "Gluteus Medius & Pelvic Stability Progression",
            "prescription": "Side-lying clamshells with band (3 × 15), Side planks (3 × 30s)",
            "why_generated": f"Hip stability score measured {hip_stability:.1f}/100 (< 75.0 optimal). Weak abductors allow hip adduction.",
            "target_issue": "Pelvic Drop & Gluteus Medius Deficit",
            "priority": "HIGH" if hip_stability < 60.0 else "MODERATE"
        })
    else:
        recs_by_category["strengthening"].append({
            "title": "Posterior Chain Romanian Deadlifts (RDLs)",
            "prescription": "3 sets × 8–10 reps at 65% 1RM",
            "why_generated": "Continues baseline reinforcement of gluteals and hamstrings for decelerating momentum.",
            "target_issue": "Posterior Chain Reinforcement",
            "priority": "LOW"
        })

    if lower_back_risk > 50.0 or trunk_lean > 8.0:
        recs_by_category["strengthening"].append({
            "title": "Anti-Rotation Paloff Press & Deadbugs",
            "prescription": "3 sets × 12 reps per side with cable or heavy band",
            "why_generated": f"Elevated Lower Back risk ({lower_back_risk:.1f}%) and trunk lean ({trunk_lean:.1f}°). Core lacks multi-planar stiffness.",
            "target_issue": "Lumbopelvic Anti-Rotation Control",
            "priority": "HIGH" if lower_back_risk > 65.0 else "MODERATE"
        })

    # -------------------------------------------------------------
    # 4. RECOVERY
    # -------------------------------------------------------------
    if rpe_score >= 7.0 or overall_risk > 65.0:
        recs_by_category["recovery"].append({
            "title": "Targeted Contrast Hydrotherapy & Sleep Extension",
            "prescription": "Cold-warm contrast immersion (3 cycles 1 min cold / 2 min warm) + 8.5h sleep minimum",
            "why_generated": f"Exertion RPE is {rpe_score:.1f}/10 with composite risk score of {overall_risk:.1f}%. High systemic stress.",
            "target_issue": "Central Nervous System & Muscular Fatigue",
            "priority": "HIGH"
        })
    else:
        recs_by_category["recovery"].append({
            "title": "Active Flush & Pneumatic Compression / Foam Rolling",
            "prescription": "15 min light spin bike flush (Zone 1) + 10 min lower limb foam rolling",
            "why_generated": "Standard post-session recovery to enhance blood flow and clear metabolic waste.",
            "target_issue": "Post-Exercise Recovery",
            "priority": "LOW"
        })

    # -------------------------------------------------------------
    # 5. WORKLOAD MODIFICATION
    # -------------------------------------------------------------
    if training_load > 80.0 or overall_risk > 70.0:
        recs_by_category["workload_modification"].append({
            "title": "Immediate Acute Workload Deload (-30%)",
            "prescription": "Cap high-speed running and jump volume to 70% of weekly mean for the next 72 hours",
            "why_generated": f"Training load index {training_load:.1f} and overall risk {overall_risk:.1f}% exceed critical safety ceiling.",
            "target_issue": "Acute Overuse & Tissue Breakdown",
            "priority": "HIGH"
        })
    elif training_load > 60.0 or overall_risk > 50.0:
        recs_by_category["workload_modification"].append({
            "title": "Controlled Plyometric Volume Cap",
            "prescription": "Limit maximal effort cutting drills to 2 sessions/week with 48h rest intervals",
            "why_generated": f"Moderate fatigue accumulation (Training Load {training_load:.1f}, Risk {overall_risk:.1f}%).",
            "target_issue": "Fatigue-Induced Form Degradation",
            "priority": "MODERATE"
        })
    else:
        recs_by_category["workload_modification"].append({
            "title": "Standard Periodized Progression",
            "prescription": "Proceed with planned training schedule; maintain weekly load increase below 10%",
            "why_generated": "All biomechanical markers and training loads remain within healthy capacity envelope.",
            "target_issue": "Workload Maintenance",
            "priority": "LOW"
        })

    # Summary strings for backwards-compatibility with Recommendation DB model
    summary_strings = {
        "exercise": "; ".join([r["title"] for r in recs_by_category["corrective_drills"]]),
        "mobility": "; ".join([r["title"] for r in recs_by_category["mobility_flexibility"]]),
        "strengthening": "; ".join([r["title"] for r in recs_by_category["strengthening"]]),
        "recovery": "; ".join([r["title"] for r in recs_by_category["recovery"]]),
        "training_modification": "; ".join([r["title"] for r in recs_by_category["workload_modification"]]),
    }

    return {
        "categories": recs_by_category,
        "summary_strings": summary_strings,
        "total_recommendations": sum(len(items) for items in recs_by_category.values()),
        "engine": "SportShield Deterministic Biomechanical Rules Engine"
    }
