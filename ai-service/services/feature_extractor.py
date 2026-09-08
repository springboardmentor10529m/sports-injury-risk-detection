"""
Feature Extractor Module
Aggregates temporal frame kinematics into summary metrics and ML feature vectors.
"""

import numpy as np
from typing import List, Dict, Any, Optional

class FeatureExtractor:
    def aggregate_kinematics(
        self,
        frame_kinematics_list: List[Dict[str, Any]],
        fps: float = 30.0,
        athlete_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Aggregates frame-by-frame kinematics into comprehensive statistical features.
        """
        if not frame_kinematics_list:
            return {}

        def get_series(metric: str) -> List[float]:
            return [f[metric] for f in frame_kinematics_list if f.get(metric) is not None]

        knee_l = get_series("knee_angle_left")
        knee_r = get_series("knee_angle_right")
        valgus_l = get_series("knee_valgus_left")
        valgus_r = get_series("knee_valgus_right")
        trunk = get_series("trunk_lean_deg")
        ankle_l = get_series("ankle_angle_left")
        ankle_r = get_series("ankle_angle_right")
        asym = get_series("bilateral_knee_asymmetry_pct")

        all_knee = knee_l + knee_r
        all_ankle = ankle_l + ankle_r
        all_valgus = [abs(v) for v in (valgus_l + valgus_r)]

        # Summary statistics helper
        def summarize(series: List[float]) -> Dict[str, float]:
            if not series:
                return {"mean": 0.0, "min": 0.0, "max": 0.0, "std": 0.0, "rom": 0.0}
            arr = np.array(series)
            return {
                "mean": round(float(np.mean(arr)), 2),
                "min": round(float(np.min(arr)), 2),
                "max": round(float(np.max(arr)), 2),
                "std": round(float(np.std(arr)), 2),
                "rom": round(float(np.max(arr) - np.min(arr)), 2)
            }

        knee_summary = summarize(all_knee)
        valgus_summary = summarize(all_valgus)
        trunk_summary = summarize(trunk)
        ankle_summary = summarize(all_ankle)
        asym_summary = summarize(asym)

        # Athletic profile defaults if not supplied
        prof = athlete_profile or {}
        age = float(prof.get("age", 25))
        height_cm = float(prof.get("height", 180.0))
        weight_kg = float(prof.get("weight", 75.0))
        prior_injuries = int(prof.get("previous_injuries", 0))

        # Dynamic estimates from kinematics
        # Knee angle mapped to 0-100 scale range typical in sports dataset
        mean_knee_angle = knee_summary["mean"] if knee_summary["mean"] > 0 else 55.0
        mean_ankle_angle = ankle_summary["mean"] if ankle_summary["mean"] > 0 else 60.0
        
        # Estimate jump/explosiveness based on knee range of motion and velocity
        est_jump_height = round(float(np.clip(knee_summary["rom"] * 0.8, 20.0, 95.0)), 2)
        est_speed = round(float(np.clip((knee_summary["std"] / 2.0) + 15.0, 5.0, 85.0)), 2)
        est_reaction_time = round(float(np.clip(180.0 - (knee_summary["rom"] * 0.5), 60.0, 350.0)), 2)

        ml_feature_vector = {
            "Age": age,
            "Height_cm": height_cm,
            "Weight_kg": weight_kg,
            "Knee_Angle_deg": mean_knee_angle,
            "Jump_Height_cm": est_jump_height,
            "Ankle_Flexion_deg": mean_ankle_angle,
            "Speed_m_s": est_speed,
            "Reaction_Time_ms": est_reaction_time,
            "Injury_Recurrence": prior_injuries
        }

        return {
            "summary_kinematics": {
                "knee_flexion": knee_summary,
                "knee_valgus": valgus_summary,
                "trunk_lean": trunk_summary,
                "ankle_flexion": ankle_summary,
                "bilateral_asymmetry": asym_summary,
            },
            "ml_feature_vector": ml_feature_vector
        }
