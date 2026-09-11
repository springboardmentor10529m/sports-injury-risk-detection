"""
SportShield Feature Engineering & Biomechanical Anomaly Detection Layer
Transforms raw pose-derived biomechanical measurements into normalized,
model-ready vectors and detects clinical/biomechanical anomalies with z-scores.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from dataset_loader import get_population_benchmarks

# Standard physiological reference baselines (used when empirical population stats need validation bounds)
PHYSIOLOGICAL_BASELINES = {
    "knee_valgus_angle_deg": {
        "unit": "degrees (°)",
        "description": "Frontal plane inward collapse of knee relative to hip and ankle",
        "normal_max": 15.0,
        "critical_max": 20.0,
        "direction": "lower_is_better",
        "concern": "High valgus dramatically increases strain on Anterior Cruciate Ligament (ACL) and Patellofemoral joint.",
    },
    "hip_stability_score": {
        "unit": "score (0–100)",
        "description": "Pelvic level maintenance and gluteus medius dynamic control",
        "normal_min": 70.0,
        "critical_min": 55.0,
        "direction": "higher_is_better",
        "concern": "Low hip stability causes compensatory pelvic drop and excessive knee adduction moments.",
    },
    "trunk_lateral_flexion_deg": {
        "unit": "degrees (°)",
        "description": "Lateral torso lean away from midline during dynamic movement",
        "normal_max": 8.0,
        "critical_max": 12.0,
        "direction": "lower_is_better",
        "concern": "Excessive trunk sway increases knee joint load and indicates weak core/lumbar stabilizers.",
    },
    "range_of_motion_deg": {
        "unit": "degrees (°)",
        "description": "Joint excursion through flexion and extension",
        "normal_min": 90.0,
        "normal_max": 130.0,
        "direction": "within_range",
        "concern": "Restricted ROM impairs shock absorption; hypermobility requires increased neuromuscular control.",
    },
    "bilateral_symmetry_pct": {
        "unit": "percentage (%)",
        "description": "Kinematic symmetry between left and right lower limb movement",
        "normal_min": 82.0,
        "critical_min": 72.0,
        "direction": "higher_is_better",
        "concern": "Limb asymmetry >15% indicates preferential loading, overloading the dominant or recovering limb.",
    },
    "movement_smoothness_score": {
        "unit": "score (0–100)",
        "description": "Continuity of movement and deceleration control (inverse jerk)",
        "normal_min": 75.0,
        "critical_min": 60.0,
        "direction": "higher_is_better",
        "concern": "Jerky, uncoordinated deceleration reflects neuromuscular fatigue and degraded joint control.",
    },
}


def compute_z_score(value: float, mean: float, std: float) -> float:
    """Compute standard score against population distribution."""
    if std <= 1e-6:
        return 0.0
    return round(float((value - mean) / std), 2)


def detect_biomechanical_anomalies(
    raw_metrics: Dict[str, Any],
    activity_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Evaluate extracted biomechanical features against empirical population benchmarks
    and physiological limits. Returns a list of detected anomalies.
    """
    benchmarks = get_population_benchmarks(activity_type=activity_type)
    anomalies = []

    for metric, ref in PHYSIOLOGICAL_BASELINES.items():
        # Handle key variations from raw metrics
        val = raw_metrics.get(metric)
        if val is None:
            # Check alternative aliases
            aliases = {
                "knee_valgus_angle_deg": ["knee_valgus", "valgus_angle"],
                "hip_stability_score": ["hip_stability", "pelvic_stability"],
                "trunk_lateral_flexion_deg": ["trunk_lean", "trunk_lateral_flexion"],
                "range_of_motion_deg": ["range_of_motion", "knee_flexion_rom"],
                "bilateral_symmetry_pct": ["bilateral_symmetry", "symmetry"],
                "movement_smoothness_score": ["movement_smoothness", "smoothness"],
            }
            for alias in aliases.get(metric, []):
                if alias in raw_metrics and raw_metrics[alias] is not None:
                    val = raw_metrics[alias]
                    break

        if val is None:
            continue

        try:
            val_float = float(val)
        except (ValueError, TypeError):
            continue

        pop_bench = benchmarks.get(metric, {})
        pop_mean = pop_bench.get("mean", 0.0)
        pop_std = pop_bench.get("std", 1.0)
        z_score = compute_z_score(val_float, pop_mean, pop_std)

        status = "NORMAL"
        severity = "NORMAL"

        if ref["direction"] == "lower_is_better":
            if val_float >= ref["critical_max"]:
                status = "CRITICAL_ANOMALY"
                severity = "HIGH"
            elif val_float >= ref["normal_max"]:
                status = "ELEVATED_DEVIATION"
                severity = "MODERATE"

        elif ref["direction"] == "higher_is_better":
            if val_float <= ref["critical_min"]:
                status = "CRITICAL_ANOMALY"
                severity = "HIGH"
            elif val_float <= ref["normal_min"]:
                status = "ELEVATED_DEVIATION"
                severity = "MODERATE"

        elif ref["direction"] == "within_range":
            if val_float < ref["normal_min"] or val_float > ref["normal_max"]:
                status = "OUT_OF_RANGE"
                severity = "MODERATE"

        anomalies.append({
            "metric": metric,
            "unit": ref["unit"],
            "description": ref["description"],
            "observed_value": round(val_float, 2),
            "expected_range": f"{ref.get('normal_min', 0)} – {ref.get('normal_max', 100)}" if 'normal_min' in ref and 'normal_max' in ref else (f"< {ref['normal_max']}" if 'normal_max' in ref else f"> {ref['normal_min']}"),
            "population_mean": pop_mean,
            "population_std": pop_std,
            "z_score": z_score,
            "severity": severity,
            "status": status,
            "is_anomaly": severity in ["MODERATE", "HIGH"],
            "clinical_concern": ref["concern"] if severity in ["MODERATE", "HIGH"] else "Within healthy biomechanical range.",
        })

    return anomalies


def build_engineered_feature_vector(
    raw_metrics: Dict[str, Any],
    activity_type: str = "running",
    fatigue_indicators: Optional[Dict[str, Any]] = None,
    injury_history_count: int = 0
) -> Dict[str, Any]:
    """
    Creates a 3-layer feature representation:
    1. Raw measurements
    2. Normalized z-scores (relative to benchmark dataset)
    3. Fatigue and history weighted composites
    """
    benchmarks = get_population_benchmarks(activity_type=activity_type)
    anomalies = detect_biomechanical_anomalies(raw_metrics, activity_type=activity_type)

    # Base metric extractions
    valgus = float(raw_metrics.get("knee_valgus_angle_deg") or raw_metrics.get("knee_valgus") or 12.0)
    hip = float(raw_metrics.get("hip_stability_score") or raw_metrics.get("hip_stability") or 78.0)
    trunk = float(raw_metrics.get("trunk_lateral_flexion_deg") or raw_metrics.get("trunk_lean") or 6.0)
    rom = float(raw_metrics.get("range_of_motion_deg") or raw_metrics.get("range_of_motion") or 110.0)
    symmetry = float(raw_metrics.get("bilateral_symmetry_pct") or raw_metrics.get("bilateral_symmetry") or 88.0)
    smoothness = float(raw_metrics.get("movement_smoothness_score") or raw_metrics.get("movement_smoothness") or 82.0)

    # Fatigue features
    fatigue = fatigue_indicators or {}
    rpe_score = float(fatigue.get("session_rpe") or 5.0)
    variance_decay = float(fatigue.get("biomechanical_variance_decay") or 0.0)

    # Standardize features
    def norm(m_key, val):
        bench = benchmarks.get(m_key, {"mean": val, "std": 1.0})
        std = bench["std"] if bench["std"] > 1e-4 else 1.0
        return (val - bench["mean"]) / std

    norm_valgus = norm("knee_valgus_angle_deg", valgus)
    norm_hip = norm("hip_stability_score", hip)
    norm_trunk = norm("trunk_lateral_flexion_deg", trunk)
    norm_rom = norm("range_of_motion_deg", rom)
    norm_symmetry = norm("bilateral_symmetry_pct", symmetry)
    norm_smoothness = norm("movement_smoothness_score", smoothness)

    # Feature vector for ML or inference
    feature_vector = [
        valgus,
        hip,
        trunk,
        rom,
        symmetry,
        smoothness,
        rpe_score,
        float(injury_history_count),
        norm_valgus,
        norm_hip,
        norm_trunk,
        norm_symmetry,
        variance_decay,
    ]

    feature_names = [
        "valgus_raw",
        "hip_raw",
        "trunk_raw",
        "rom_raw",
        "symmetry_raw",
        "smoothness_raw",
        "rpe_score",
        "prior_injury_count",
        "valgus_z",
        "hip_z",
        "trunk_z",
        "symmetry_z",
        "variance_decay",
    ]

    return {
        "raw_features": {
            "knee_valgus_angle_deg": valgus,
            "hip_stability_score": hip,
            "trunk_lateral_flexion_deg": trunk,
            "range_of_motion_deg": rom,
            "bilateral_symmetry_pct": symmetry,
            "movement_smoothness_score": smoothness,
        },
        "normalized_z_scores": {
            "knee_valgus_z": round(norm_valgus, 2),
            "hip_stability_z": round(norm_hip, 2),
            "trunk_lateral_flexion_z": round(norm_trunk, 2),
            "range_of_motion_z": round(norm_rom, 2),
            "bilateral_symmetry_z": round(norm_symmetry, 2),
            "movement_smoothness_z": round(norm_smoothness, 2),
        },
        "fatigue_profile": {
            "session_rpe": rpe_score,
            "biomechanical_variance_decay": round(variance_decay, 2),
            "fatigue_risk_multiplier": round(1.0 + (max(0.0, rpe_score - 6) * 0.05) + (variance_decay * 0.1), 2)
        },
        "prior_injury_profile": {
            "prior_injury_count": injury_history_count,
            "prior_injury_multiplier": round(1.0 + min(0.3, injury_history_count * 0.1), 2)
        },
        "anomalies": anomalies,
        "feature_vector": [round(x, 4) for x in feature_vector],
        "feature_names": feature_names,
    }
