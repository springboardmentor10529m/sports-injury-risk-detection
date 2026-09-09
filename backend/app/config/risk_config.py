"""
Centralized Risk Assessment Configuration & Threshold Management.
Defines risk categories, baseline kinematic thresholds, injury history weights, and training load multipliers.
"""
from typing import Dict, Any

# Risk Level Classification Thresholds (Score out of 100)
RISK_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "Low": {"min_score": 0.0, "max_score": 29.9, "color": "#10b981", "badge_class": "bg-emerald-500/20 text-emerald-300"},
    "Moderate": {"min_score": 30.0, "max_score": 59.9, "color": "#f59e0b", "badge_class": "bg-amber-500/20 text-amber-300"},
    "High": {"min_score": 60.0, "max_score": 79.9, "color": "#ef4444", "badge_class": "bg-rose-500/20 text-rose-300"},
    "Critical": {"min_score": 80.0, "max_score": 100.0, "color": "#991b1b", "badge_class": "bg-rose-950 text-rose-400"}
}

# Baseline Biomechanical Reference Thresholds
KINEMATIC_THRESHOLDS = {
    "knee_valgus_normal_min": 0.85,      # Below 0.85 indicates valgus collapse
    "knee_valgus_critical_max": 0.70,   # Below 0.70 indicates severe valgus collapse
    "trunk_lean_max_deg": 20.0,         # Above 20° is excessive forward lean
    "trunk_lean_critical_deg": 35.0,    # Above 35° is high lumbar strain risk
    "hip_tilt_max_deg": 5.0,            # Above 5° indicates pelvic instability / drop
    "limb_symmetry_min_pct": 90.0,      # Below 90% asymmetry increases strain risk
    "joint_alignment_max_deg": 15.0,     # Excessive joint misalignment angle
}

# Specific Injury Risk Weights & Threshold Rules
INJURY_RISK_RULES = {
    "acl": {
        "knee_valgus_weight": 0.45,
        "asymmetry_weight": 0.25,
        "hip_instability_weight": 0.15,
        "fatigue_weight": 0.15,
        "prior_injury_multiplier": 1.35,  # 35% risk surge if prior knee/ACL injury
    },
    "hamstring": {
        "asymmetry_weight": 0.40,
        "trunk_lean_weight": 0.30,
        "fatigue_weight": 0.20,
        "training_load_weight": 0.10,
        "prior_injury_multiplier": 1.40,  # 40% surge if prior hamstring strain
    },
    "ankle": {
        "asymmetry_weight": 0.35,
        "joint_alignment_weight": 0.35,
        "fatigue_weight": 0.30,
        "prior_injury_multiplier": 1.30,
    },
    "shoulder": {
        "trunk_lean_weight": 0.30,
        "asymmetry_weight": 0.40,
        "fatigue_weight": 0.30,
        "prior_injury_multiplier": 1.25,
    },
    "lower_back": {
        "trunk_lean_weight": 0.50,
        "hip_instability_weight": 0.30,
        "fatigue_weight": 0.20,
        "prior_injury_multiplier": 1.35,
    },
    "overuse": {
        "training_load_threshold_hrs": 12.0,
        "high_training_load_multiplier": 1.25,
        "fatigue_weight": 0.50,
        "asymmetry_weight": 0.30,
        "anomaly_density_weight": 0.20,
    }
}

# Multipliers based on Athlete Context
CONTEXT_MULTIPLIERS = {
    "high_training_load_hrs": 15.0,       # Weekly training hours threshold
    "high_training_load_factor": 1.20,     # +20% overall risk scaling
    "recent_injury_window_days": 180,      # Injuries within 6 months carry higher weight
    "active_high_severity_injury_factor": 1.30,
    "anomaly_count_penalty_per_event": 4.5 # +4.5 risk points per detected anomaly
}

# Non-Clinical Research Disclaimer
RESEARCH_DISCLAIMER = (
    "RESEARCH PROTOTYPE DISCLAIMER: The Movement Risk Intelligence System provides "
    "biomechanical movement quality scores and computational risk indicators for educational "
    "and athletic optimization purposes. It is NOT a clinical medical diagnostic tool."
)
