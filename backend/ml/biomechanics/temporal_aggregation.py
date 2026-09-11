"""
AthleteGuard - Temporal Feature Aggregation Layer
Aggregates multi-frame biomechanical feature sequences over entire movement videos.
"""

from typing import Dict, List, Any, Optional
import math
import numpy as np
from .feature_engineering import BiomechanicalFeatureVector


# Standard screening thresholds for 2D angular deviations
SCREENING_THRESHOLDS = {
    "knee_valgus_angle": 12.0,       # > 12 deg valgus inward deviation
    "trunk_lean": 10.0,              # > 10 deg trunk lean from vertical
    "bilateral_knee_asymmetry": 15.0,# > 15 deg bilateral knee difference
    "bilateral_hip_asymmetry": 12.0, # > 12 deg bilateral hip difference
    "bilateral_ankle_asymmetry": 15.0,# > 15 deg bilateral ankle difference
    "hip_stability": 8.0,            # > 8 deg pelvic tilt
    "shoulder_asymmetry": 10.0,      # > 10 deg shoulder tilt
}


class TemporalFeatureAggregator:
    """
    Computes statistical and biomechanical aggregations across complete frame sequences.
    """

    @staticmethod
    def aggregate_sequence(
        feature_sequence: List[Dict[str, BiomechanicalFeatureVector]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Takes a time-series of per-frame BiomechanicalFeatureVector dictionaries and
        returns comprehensive temporal statistical profiles for each feature.
        """
        if not feature_sequence:
            return {}

        # Collect raw values per feature
        feature_values: Dict[str, List[float]] = {}
        feature_confs: Dict[str, List[float]] = {}
        timestamps: List[float] = []

        for frame_feats in feature_sequence:
            ts = 0.0
            for name, fvec in frame_feats.items():
                if name not in feature_values:
                    feature_values[name] = []
                    feature_confs[name] = []
                feature_values[name].append(float(fvec.value))
                feature_confs[name].append(float(fvec.confidence))
                ts = fvec.timestamp
            timestamps.append(ts)

        aggregated: Dict[str, Dict[str, Any]] = {}
        total_frames = len(feature_sequence)

        for name, vals in feature_values.items():
            if not vals:
                continue

            arr = np.array(vals, dtype=float)
            conf_arr = np.array(feature_confs.get(name, [1.0]), dtype=float)

            mean_val = float(np.mean(arr))
            median_val = float(np.median(arr))
            std_val = float(np.std(arr))
            min_val = float(np.min(arr))
            max_val = float(np.max(arr))

            # Percentile values
            p5 = float(np.percentile(arr, 5))
            p25 = float(np.percentile(arr, 25))
            p75 = float(np.percentile(arr, 75))
            p95 = float(np.percentile(arr, 95))

            # Temporal trend (linear regression slope against time / frame index)
            if total_frames > 1:
                t = np.arange(total_frames, dtype=float)
                # Linear fit slope: arr ~ slope * t + intercept
                t_mean = np.mean(t)
                arr_mean = mean_val
                denom = np.sum((t - t_mean)**2)
                slope = float(np.sum((t - t_mean) * (arr - arr_mean)) / denom) if denom > 1e-6 else 0.0
            else:
                slope = 0.0

            # Variability (Coefficient of Variation)
            cv = float(std_val / (abs(mean_val) + 1e-4))

            # Percentage of frames exceeding clinical screening threshold
            threshold = SCREENING_THRESHOLDS.get(name, None)
            if threshold is not None:
                high_risk_frames = int(np.sum(arr > threshold))
                high_risk_percentage = round((high_risk_frames / total_frames) * 100.0, 1)
            else:
                high_risk_frames = 0
                high_risk_percentage = 0.0

            aggregated[name] = {
                "mean": round(mean_val, 2),
                "median": round(median_val, 2),
                "std": round(std_val, 2),
                "min": round(min_val, 2),
                "max": round(max_val, 2),
                "p5": round(p5, 2),
                "p25": round(p25, 2),
                "p75": round(p75, 2),
                "p95": round(p95, 2),
                "temporal_trend_slope": round(slope, 4),
                "variability_cv": round(cv, 3),
                "threshold": threshold,
                "high_risk_frame_count": high_risk_frames,
                "high_risk_frame_percentage": high_risk_percentage,
                "mean_confidence": round(float(np.mean(conf_arr)), 3),
                "total_frames_sampled": total_frames
            }

        # Bilateral differences (L/R delta in means)
        aggregated["bilateral_summary"] = {
            "knee_mean_delta": round(abs(aggregated.get("left_knee_angle", {}).get("mean", 0.0) - aggregated.get("right_knee_angle", {}).get("mean", 0.0)), 2),
            "hip_mean_delta": round(abs(aggregated.get("left_hip_angle", {}).get("mean", 0.0) - aggregated.get("right_hip_angle", {}).get("mean", 0.0)), 2),
            "ankle_mean_delta": round(abs(aggregated.get("left_ankle_angle", {}).get("mean", 0.0) - aggregated.get("right_ankle_angle", {}).get("mean", 0.0)), 2),
        }

        return aggregated
