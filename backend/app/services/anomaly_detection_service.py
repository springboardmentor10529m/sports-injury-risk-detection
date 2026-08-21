"""
Biomechanical Anomaly Detection and Statistical Deviation Service.

Performs independent statistical feature extraction, developmental baseline comparisons,
Z-score / percentage / range deviation calculations, and configurable severity derivations.

IMPORTANT SCIENTIFIC NOTICE:
Outputs represent non-clinical kinematic movement deviations against provisional
developmental baselines. No medical diagnosis or injury prediction is performed.
"""

import logging
from typing import Any

import numpy as np

from app.core.baselines import (
    BaselineRegistry,
    DerivationStrategy,
    MovementBaseline,
    SeverityRuleConfig,
    get_baseline_registry,
)
from app.models.analysis import AnomalySeverity

logger = logging.getLogger("uvicorn.error")


class AnomalyDetectionService:
    """Service for extracting kinematic feature summaries and evaluating biomechanical deviations."""

    def __init__(self, baseline_registry: BaselineRegistry | None = None):
        self.registry = baseline_registry or get_baseline_registry()

    @staticmethod
    def extract_feature_summary(
        timestamps: list[float],
        joint_angles: dict[str, list[float | None]],
        angular_velocities: dict[str, list[float | None]] | None = None,
        angular_accelerations: dict[str, list[float | None]] | None = None,
        asymmetry_metrics: dict[str, Any] | None = None,
    ) -> dict[str, dict[str, float | None]]:
        """
        Extract comprehensive statistical feature summaries for each kinematic metric.
        Calculates: min, max, mean, median, std_dev, range (ROM), peak_velocity, peak_acceleration.
        """
        angular_velocities = angular_velocities or {}
        angular_accelerations = angular_accelerations or {}
        asymmetry_metrics = asymmetry_metrics or {}

        summary: dict[str, dict[str, float | None]] = {}

        # 1. Summarize Joint Angle Curves
        for metric_name, values in joint_angles.items():
            valid_vals = [v for v in values if v is not None and not np.isnan(v)]
            if not valid_vals:
                summary[metric_name] = {
                    "min": None,
                    "max": None,
                    "mean": None,
                    "median": None,
                    "std_dev": None,
                    "range": None,
                    "peak_velocity": None,
                    "peak_acceleration": None,
                }
                continue

            arr = np.array(valid_vals, dtype=float)
            min_val = float(np.min(arr))
            max_val = float(np.max(arr))
            mean_val = float(np.mean(arr))
            median_val = float(np.median(arr))
            std_val = float(np.std(arr))
            range_val = float(max_val - min_val)

            # Check for corresponding velocity and acceleration
            vel_key = f"{metric_name}_velocity"
            vel_vals = [abs(v) for v in angular_velocities.get(vel_key, []) if v is not None and not np.isnan(v)]
            peak_vel = float(np.max(vel_vals)) if vel_vals else None

            acc_key = f"{metric_name}_acceleration"
            acc_vals = [abs(v) for v in angular_accelerations.get(acc_key, []) if v is not None and not np.isnan(v)]
            peak_acc = float(np.max(acc_vals)) if acc_vals else None

            summary[metric_name] = {
                "min": round(min_val, 2),
                "max": round(max_val, 2),
                "mean": round(mean_val, 2),
                "median": round(median_val, 2),
                "std_dev": round(std_val, 2),
                "range": round(range_val, 2),
                "peak_velocity": round(peak_vel, 2) if peak_vel is not None else None,
                "peak_acceleration": round(peak_acc, 2) if peak_acc is not None else None,
            }

        # 2. Summarize Bilateral Asymmetry Metrics
        for asym_name, asym_data in asymmetry_metrics.items():
            if isinstance(asym_data, dict):
                timeseries = asym_data.get("timeseries", [])
                valid_ts = [v for v in timeseries if v is not None and not np.isnan(v)]
                if valid_ts:
                    arr = np.array(valid_ts, dtype=float)
                    summary[asym_name] = {
                        "min": round(float(np.min(arr)), 2),
                        "max": round(float(np.max(arr)), 2),
                        "mean": round(float(np.mean(arr)), 2),
                        "median": round(float(np.median(arr)), 2),
                        "std_dev": round(float(np.std(arr)), 2),
                        "range": round(float(np.max(arr) - np.min(arr)), 2),
                        "peak_velocity": None,
                        "peak_acceleration": None,
                    }
                else:
                    summary[asym_name] = {
                        "min": None,
                        "max": asym_data.get("peak"),
                        "mean": asym_data.get("mean"),
                        "median": None,
                        "std_dev": None,
                        "range": None,
                        "peak_velocity": None,
                        "peak_acceleration": None,
                    }

        return summary

    @staticmethod
    def detect_temporal_peaks(
        timestamps: list[float],
        joint_angles: dict[str, list[float | None]],
        angular_velocities: dict[str, list[float | None]] | None = None,
        asymmetry_metrics: dict[str, Any] | None = None,
    ) -> dict[str, dict[str, float | None]]:
        """
        Identify exact video timestamps corresponding to maximum kinematic events.
        Enables clickable video scrubbing to specific movement deviation moments.
        """
        temporal_events: dict[str, dict[str, float | None]] = {}

        if not timestamps:
            return temporal_events

        # Helper to find timestamp of maximum value
        def find_peak(values: list[float | None]) -> dict[str, float | None]:
            if not values or len(values) != len(timestamps):
                return {"peak_value": None, "timestamp_seconds": None}
            valid_pairs = [(v, t) for v, t in zip(values, timestamps) if v is not None and not np.isnan(v)]
            if not valid_pairs:
                return {"peak_value": None, "timestamp_seconds": None}
            peak_val, peak_time = max(valid_pairs, key=lambda p: p[0])
            return {
                "peak_value": round(peak_val, 2),
                "timestamp_seconds": round(peak_time, 3),
            }

        # 1. Joint Angle Peaks
        for key in [
            "left_knee_angle",
            "right_knee_angle",
            "left_hip_angle",
            "right_hip_angle",
            "trunk_lean",
            "trunk_lateral_tilt",
            "left_knee_valgus",
            "right_knee_valgus",
        ]:
            if key in joint_angles:
                temporal_events[key] = find_peak(joint_angles[key])

        # 2. Velocity Peaks
        if angular_velocities:
            for vel_key, vel_series in angular_velocities.items():
                abs_vels = [abs(v) if v is not None and not np.isnan(v) else None for v in vel_series]
                temporal_events[vel_key] = find_peak(abs_vels)

        # 3. Asymmetry Peaks
        if asymmetry_metrics:
            for asym_key, asym_data in asymmetry_metrics.items():
                if isinstance(asym_data, dict) and "timeseries" in asym_data:
                    temporal_events[asym_key] = find_peak(asym_data["timeseries"])

        return temporal_events

    def calculate_deviation(
        self,
        observed_value: float | None,
        baseline: MovementBaseline,
        rule_config: SeverityRuleConfig | None = None,
    ) -> dict[str, Any]:
        """
        Calculate each statistical metric independently:
        1. Z-Score (when baseline std_dev > 0)
        2. Percentage deviation (when baseline mean != 0)
        3. Absolute deviation (|obs - mean|)
        4. Range deviation & boundary violation
        5. Severity derived using documented, configurable rules
        """
        cfg = rule_config or self.registry.rule_config

        if observed_value is None or np.isnan(observed_value):
            return {
                "metric": baseline.metric_key.upper(),
                "observed": None,
                "baseline_mean": baseline.mean,
                "baseline_std": baseline.std_dev,
                "baseline_range": [baseline.min_norm, baseline.max_norm],
                "absolute_deviation": None,
                "percent_deviation": None,
                "z_score": None,
                "range_deviation": 0.0,
                "is_out_of_range": False,
                "severity": AnomalySeverity.NORMAL.value,
                "severity_derivation_rule": "No valid observation available; defaulted to NORMAL.",
                "baseline_type": baseline.baseline_type,
            }

        # 1. Absolute Deviation
        abs_dev = abs(observed_value - baseline.mean)

        # 2. Percentage Deviation (stored independently)
        pct_dev: float | None = None
        if baseline.mean != 0.0:
            pct_dev = (abs_dev / abs(baseline.mean)) * 100.0

        # 3. Z-Score (stored independently)
        z_score: float | None = None
        if baseline.std_dev > 0.0:
            z_score = (observed_value - baseline.mean) / baseline.std_dev

        # 4. Range Deviation (stored independently)
        range_dev = 0.0
        is_out_of_range = False
        if observed_value < baseline.min_norm:
            range_dev = baseline.min_norm - observed_value
            is_out_of_range = True
        elif observed_value > baseline.max_norm:
            range_dev = observed_value - baseline.max_norm
            is_out_of_range = True

        # 5. Configurable Severity Derivation
        severity, rule_explanation = self._derive_severity(
            z_score=z_score,
            pct_dev=pct_dev,
            range_dev=range_dev,
            is_out_of_range=is_out_of_range,
            observed_val=observed_value,
            baseline=baseline,
            cfg=cfg,
        )

        return {
            "metric": baseline.metric_key.upper(),
            "observed": round(observed_value, 2),
            "baseline_mean": round(baseline.mean, 2),
            "baseline_std": round(baseline.std_dev, 2),
            "baseline_range": [baseline.min_norm, baseline.max_norm],
            "absolute_deviation": round(abs_dev, 2),
            "percent_deviation": round(pct_dev, 2) if pct_dev is not None else None,
            "z_score": round(z_score, 2) if z_score is not None else None,
            "range_deviation": round(range_dev, 2),
            "is_out_of_range": is_out_of_range,
            "severity": severity,
            "severity_derivation_rule": rule_explanation,
            "baseline_type": baseline.baseline_type,
        }

    @staticmethod
    def _derive_severity(
        z_score: float | None,
        pct_dev: float | None,
        range_dev: float,
        is_out_of_range: bool,
        observed_val: float,
        baseline: MovementBaseline,
        cfg: SeverityRuleConfig,
    ) -> tuple[str, str]:
        """
        Derive displayed severity using clearly documented, configurable rules.
        """
        # Strategy A: Z-Score Primary (Standard Default)
        if cfg.strategy == DerivationStrategy.Z_SCORE_PRIMARY and z_score is not None:
            abs_z = abs(z_score)
            if abs_z > cfg.z_score_high:
                severity = AnomalySeverity.HIGH_DEVIATION.value
                rule = f"Z-score rule: |Z| = {abs_z:.2f} > {cfg.z_score_high} -> HIGH_DEVIATION"
            elif abs_z > cfg.z_score_moderate:
                severity = AnomalySeverity.MODERATE_DEVIATION.value
                rule = (
                    f"Z-score rule: {cfg.z_score_moderate} < |Z| ({abs_z:.2f}) "
                    f"<= {cfg.z_score_high} -> MODERATE_DEVIATION"
                )
            elif abs_z > cfg.z_score_mild:
                severity = AnomalySeverity.MILD_DEVIATION.value
                rule = (
                    f"Z-score rule: {cfg.z_score_mild} < |Z| ({abs_z:.2f}) <= {cfg.z_score_moderate} -> MILD_DEVIATION"
                )
            else:
                severity = AnomalySeverity.NORMAL.value
                rule = f"Z-score rule: |Z| = {abs_z:.2f} <= {cfg.z_score_mild} -> NORMAL"

            # Optional elevation if value falls outside developmental bounds
            if cfg.elevate_on_range_violation and is_out_of_range and severity == AnomalySeverity.NORMAL.value:
                severity = AnomalySeverity.MILD_DEVIATION.value
                rule += (
                    f" (Elevated to MILD_DEVIATION: observed {observed_val}{baseline.unit} "
                    f"outside developmental bounds [{baseline.min_norm}, {baseline.max_norm}])"
                )

            return severity, rule

        # Strategy B: Percentage Primary (or Fallback when Z-score is unavailable)
        if pct_dev is not None:
            if pct_dev >= cfg.pct_high:
                severity = AnomalySeverity.HIGH_DEVIATION.value
                rule = f"Percentage rule: deviation {pct_dev:.1f}% >= {cfg.pct_high}% -> HIGH_DEVIATION"
            elif pct_dev >= cfg.pct_moderate:
                severity = AnomalySeverity.MODERATE_DEVIATION.value
                rule = (
                    f"Percentage rule: {cfg.pct_moderate}% <= deviation ({pct_dev:.1f}%) "
                    f"< {cfg.pct_high}% -> MODERATE_DEVIATION"
                )
            elif pct_dev >= cfg.pct_mild or (cfg.elevate_on_range_violation and is_out_of_range):
                severity = AnomalySeverity.MILD_DEVIATION.value
                rule = (
                    f"Percentage/Range rule: deviation {pct_dev:.1f}% >= {cfg.pct_mild}% "
                    f"or out-of-range -> MILD_DEVIATION"
                )
            else:
                severity = AnomalySeverity.NORMAL.value
                rule = f"Percentage rule: deviation {pct_dev:.1f}% < {cfg.pct_mild}% -> NORMAL"
            return severity, rule

        # Strategy C: Range-only fallback
        if is_out_of_range:
            return (
                AnomalySeverity.MILD_DEVIATION.value,
                (
                    f"Range rule: observed {observed_val} outside "
                    f"[{baseline.min_norm}, {baseline.max_norm}] -> MILD_DEVIATION"
                ),
            )

        return (
            AnomalySeverity.NORMAL.value,
            "Default rule: metric within expected baseline range -> NORMAL",
        )

    def analyze_session(
        self,
        timestamps: list[float],
        joint_angles: dict[str, list[float | None]],
        angular_velocities: dict[str, list[float | None]] | None = None,
        angular_accelerations: dict[str, list[float | None]] | None = None,
        asymmetry_metrics: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute full Phase 4 biomechanical anomaly assessment.
        Returns independent statistical feature summaries, metric deviations,
        temporal peak timestamps, and classified anomaly events with derivation rules.
        """
        feature_summary = self.extract_feature_summary(
            timestamps=timestamps,
            joint_angles=joint_angles,
            angular_velocities=angular_velocities,
            angular_accelerations=angular_accelerations,
            asymmetry_metrics=asymmetry_metrics,
        )

        temporal_peaks = self.detect_temporal_peaks(
            timestamps=timestamps,
            joint_angles=joint_angles,
            angular_velocities=angular_velocities,
            asymmetry_metrics=asymmetry_metrics,
        )

        metric_deviations: dict[str, Any] = {}
        anomalies_list: list[dict[str, Any]] = []

        baseline_mappings = [
            ("knee_flexion_rom", "left_knee_angle", "range", "Knee Flexion ROM (Left)"),
            (
                "knee_flexion_rom",
                "right_knee_angle",
                "range",
                "Knee Flexion ROM (Right)",
            ),
            ("peak_knee_flexion", "left_knee_angle", "max", "Peak Knee Flexion (Left)"),
            (
                "peak_knee_flexion",
                "right_knee_angle",
                "max",
                "Peak Knee Flexion (Right)",
            ),
            ("hip_flexion_rom", "left_hip_angle", "range", "Hip Flexion ROM (Left)"),
            ("hip_flexion_rom", "right_hip_angle", "range", "Hip Flexion ROM (Right)"),
            (
                "ankle_dorsiflexion_rom",
                "left_ankle_angle",
                "range",
                "Ankle Sagittal ROM (Left)",
            ),
            (
                "ankle_dorsiflexion_rom",
                "right_ankle_angle",
                "range",
                "Ankle Sagittal ROM (Right)",
            ),
            ("trunk_lean_max", "trunk_lean", "max", "Trunk Forward Lean (Peak)"),
            (
                "trunk_lateral_tilt_max",
                "trunk_lateral_tilt",
                "max",
                "Trunk Lateral Tilt (Peak)",
            ),
            (
                "knee_valgus_proxy_max",
                "left_knee_valgus",
                "max",
                "Dynamic Knee Valgus Proxy (Left Peak)",
            ),
            (
                "knee_valgus_proxy_max",
                "right_knee_valgus",
                "max",
                "Dynamic Knee Valgus Proxy (Right Peak)",
            ),
            (
                "knee_flexion_asymmetry",
                "knee_flexion_asymmetry",
                "mean",
                "Bilateral Knee Flexion Asymmetry",
            ),
            (
                "hip_flexion_asymmetry",
                "hip_flexion_asymmetry",
                "mean",
                "Bilateral Hip Flexion Asymmetry",
            ),
            (
                "knee_valgus_asymmetry",
                "knee_valgus_asymmetry",
                "mean",
                "Bilateral Knee Valgus Asymmetry",
            ),
            (
                "peak_angular_velocity",
                "left_knee_angle",
                "peak_velocity",
                "Peak Knee Velocity (Left)",
            ),
            (
                "peak_angular_velocity",
                "right_knee_angle",
                "peak_velocity",
                "Peak Knee Velocity (Right)",
            ),
        ]

        for base_key, feat_metric, stat_prop, label in baseline_mappings:
            baseline = self.registry.get_baseline(base_key)
            if not baseline:
                continue

            metric_stats = feature_summary.get(feat_metric, {})
            observed_val = metric_stats.get(stat_prop)

            dev_result = self.calculate_deviation(observed_val, baseline)
            metric_key_id = f"{feat_metric}_{stat_prop}"
            metric_deviations[metric_key_id] = {
                "label": label,
                "category": baseline.category,
                "unit": baseline.unit,
                **dev_result,
            }

            # Record non-NORMAL deviations as anomaly events
            if dev_result["severity"] != AnomalySeverity.NORMAL.value and observed_val is not None:
                peak_time_info = temporal_peaks.get(feat_metric, {})
                timestamp = peak_time_info.get("timestamp_seconds")

                desc = (
                    f"{label} observed at {observed_val}{baseline.unit} "
                    f"(Developmental baseline: {baseline.mean}{baseline.unit} "
                    f"± {baseline.std_dev}{baseline.unit}). "
                    f"{dev_result['severity_derivation_rule']}."
                )

                anomalies_list.append(
                    {
                        "metric": dev_result["metric"],
                        "metric_name": label,
                        "timestamp_seconds": timestamp,
                        "observed": dev_result["observed"],
                        "observed_value": dev_result["observed"],
                        "baseline_mean": dev_result["baseline_mean"],
                        "baseline_value": dev_result["baseline_mean"],
                        "baseline_std": dev_result["baseline_std"],
                        "z_score": dev_result["z_score"],
                        "percent_deviation": dev_result["percent_deviation"],
                        "percentage_deviation": dev_result["percent_deviation"],
                        "range_deviation": dev_result["range_deviation"],
                        "severity": dev_result["severity"],
                        "severity_derivation_rule": dev_result["severity_derivation_rule"],
                        "baseline_type": dev_result["baseline_type"],
                        "description": desc,
                    }
                )

        # Derive overall session movement classification
        severities = [a["severity"] for a in anomalies_list]
        if AnomalySeverity.HIGH_DEVIATION.value in severities:
            overall_status = AnomalySeverity.HIGH_DEVIATION.value
        elif AnomalySeverity.MODERATE_DEVIATION.value in severities:
            overall_status = AnomalySeverity.MODERATE_DEVIATION.value
        elif AnomalySeverity.MILD_DEVIATION.value in severities:
            overall_status = AnomalySeverity.MILD_DEVIATION.value
        else:
            overall_status = AnomalySeverity.NORMAL.value

        return {
            "overall_status": overall_status,
            "feature_summary": feature_summary,
            "metric_deviations": metric_deviations,
            "temporal_peaks": temporal_peaks,
            "anomalies": anomalies_list,
            "baseline_metadata": {
                "baseline_type": "DEVELOPMENTAL",
                "is_provisional": True,
                "derivation_strategy": self.registry.rule_config.strategy.value,
                "disclaimer": (
                    "Developmental kinematic baselines for movement pattern comparison. "
                    "Not a clinical medical diagnosis or injury risk score."
                ),
                "total_metrics_evaluated": len(metric_deviations),
                "total_anomalies_detected": len(anomalies_list),
            },
        }


def get_anomaly_service() -> AnomalyDetectionService:
    """Dependency / helper to instantiate AnomalyDetectionService."""
    return AnomalyDetectionService()
