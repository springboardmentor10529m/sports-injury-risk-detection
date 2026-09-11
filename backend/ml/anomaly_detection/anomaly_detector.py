"""
AthleteGuard - Isolation Forest Movement Anomaly Detector
Detects biomechanical outliers and abnormal kinematic patterns across video sequences.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.ensemble import IsolationForest
from .base_detector import BaseAnomalyDetector


class IsolationForestAnomalyDetector(BaseAnomalyDetector):
    """
    Lightweight unsupervised anomaly detector combining Isolation Forest outlier detection
    with biomechanical rule validation for explainable movement anomaly events.
    """

    FEATURE_KEYS = [
        "knee_valgus_angle",
        "trunk_lean",
        "bilateral_knee_asymmetry",
        "bilateral_hip_asymmetry",
        "bilateral_ankle_asymmetry",
        "hip_stability",
        "joint_angle_velocity",
        "movement_variability",
        "keypoint_confidence"
    ]

    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None

    def fit(self, feature_matrix: np.ndarray) -> "IsolationForestAnomalyDetector":
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100
        )
        if feature_matrix.shape[0] >= 5:
            self.model.fit(feature_matrix)
        return self

    def _extract_matrix(self, feature_sequence: List[Dict[str, Any]]) -> np.ndarray:
        rows = []
        for frame_dict in feature_sequence:
            row = []
            for k in self.FEATURE_KEYS:
                val = frame_dict.get(k)
                if hasattr(val, "value"):
                    row.append(float(val.value))
                elif isinstance(val, (int, float)):
                    row.append(float(val))
                else:
                    row.append(0.0)
            rows.append(row)
        return np.array(rows, dtype=float)

    def detect_anomalies(
        self,
        feature_sequence: List[Dict[str, Any]],
        timestamps: Optional[List[float]] = None,
        frame_indices: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        if not feature_sequence:
            return []

        n_frames = len(feature_sequence)
        if timestamps is None:
            timestamps = [
                getattr(feature_sequence[i].get("knee_valgus_angle"), "timestamp", round(i / 15.0, 2))
                for i in range(n_frames)
            ]
        if frame_indices is None:
            frame_indices = list(range(n_frames))

        matrix = self._extract_matrix(feature_sequence)
        anomalies: List[Dict[str, Any]] = []

        # Fit isolation forest if enough frames
        if matrix.shape[0] >= 5:
            self.fit(matrix)
            raw_scores = -self.model.score_samples(matrix)
            # Normalize scores to [0, 1]
            min_s, max_s = np.min(raw_scores), np.max(raw_scores)
            norm_scores = (raw_scores - min_s) / (max_s - min_s + 1e-6)
            preds = self.model.predict(matrix) # -1 is outlier, 1 is inlier
        else:
            norm_scores = np.zeros(n_frames)
            preds = np.ones(n_frames)

        # Baseline medians & std deviations for z-score attribution
        medians = np.median(matrix, axis=0) if matrix.shape[0] > 0 else np.zeros(len(self.FEATURE_KEYS))
        stds = np.std(matrix, axis=0) if matrix.shape[0] > 0 else np.ones(len(self.FEATURE_KEYS))
        stds[stds < 1e-4] = 1.0

        for i in range(n_frames):
            frame_features = feature_sequence[i]
            frame_idx = frame_indices[i]
            ts = round(float(timestamps[i]), 2)
            iso_outlier = bool(preds[i] == -1)
            iso_score = float(norm_scores[i])

            row = matrix[i]
            z_scores = np.abs((row - medians) / stds)

            # Check primary features for abnormalities
            valgus = row[0]
            trunk = row[1]
            knee_asym = row[2]
            hip_asym = row[3]
            ankle_asym = row[4]
            hip_stab = row[5]
            joint_vel = row[6]
            variability = row[7]
            conf = row[8]

            detected_for_frame = []

            # 1. Knee valgus
            if valgus >= 16.0 or (valgus >= 12.0 and (iso_outlier or z_scores[0] > 2.0)):
                score = min(1.0, 0.5 + (valgus / 35.0) * 0.5)
                sev = "CRITICAL" if valgus >= 24.0 else ("HIGH" if valgus >= 16.0 else "MODERATE")
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "knee_valgus",
                    "score": round(score, 2),
                    "severity": sev,
                    "body_region": "knee",
                    "explanation": f"Elevated knee valgus ({round(valgus, 1)}°) indicates medial knee collapse relative to baseline."
                })

            # 2. Excessive trunk lean
            if trunk >= 16.0 or (trunk >= 12.0 and (iso_outlier or z_scores[1] > 2.0)):
                score = min(1.0, 0.4 + (trunk / 30.0) * 0.6)
                sev = "HIGH" if trunk >= 20.0 else "MODERATE"
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "excessive_trunk_lean",
                    "score": round(score, 2),
                    "severity": sev,
                    "body_region": "trunk",
                    "explanation": f"Excessive trunk lean ({round(trunk, 1)}°) exceeds upper postural stability threshold."
                })

            # 3. Bilateral asymmetry
            if knee_asym >= 20.0 or (knee_asym >= 15.0 and (iso_outlier or z_scores[2] > 2.0)):
                score = min(1.0, 0.45 + (knee_asym / 40.0) * 0.55)
                sev = "CRITICAL" if knee_asym >= 30.0 else ("HIGH" if knee_asym >= 20.0 else "MODERATE")
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "bilateral_asymmetry",
                    "score": round(score, 2),
                    "severity": sev,
                    "body_region": "bilateral_knees",
                    "explanation": f"Significant bilateral knee asymmetry ({round(knee_asym, 1)}°) indicates uncoordinated loading."
                })

            # 4. Abnormal hip movement
            if hip_stab >= 12.0 or hip_asym >= 18.0 or (hip_asym >= 14.0 and iso_outlier):
                score = min(1.0, 0.4 + (max(hip_stab, hip_asym) / 35.0) * 0.6)
                sev = "HIGH" if max(hip_stab, hip_asym) >= 20.0 else "MODERATE"
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "abnormal_hip_movement",
                    "score": round(score, 2),
                    "severity": sev,
                    "body_region": "hip_pelvis",
                    "explanation": f"Pelvic tilt or hip asymmetry ({round(max(hip_stab, hip_asym), 1)}°) deviates from stable gait/landing baseline."
                })

            # 5. Abnormal ankle movement
            if ankle_asym >= 22.0 or (ankle_asym >= 16.0 and iso_outlier):
                score = min(1.0, 0.4 + (ankle_asym / 40.0) * 0.6)
                sev = "HIGH" if ankle_asym >= 25.0 else "MODERATE"
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "abnormal_ankle_movement",
                    "score": round(score, 2),
                    "severity": sev,
                    "body_region": "ankle",
                    "explanation": f"Bilateral ankle angle discrepancy ({round(ankle_asym, 1)}°) suggests uneven weight bearing."
                })

            # 6. Excessive movement variability
            if variability >= 18.0 and iso_outlier:
                score = min(1.0, 0.4 + (variability / 35.0) * 0.6)
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "excessive_movement_variability",
                    "score": round(score, 2),
                    "severity": "MODERATE",
                    "body_region": "lower_limb",
                    "explanation": f"Kinematic variability ({round(variability, 1)}° std) indicates jerky or unsteady trajectory."
                })

            # 7. Low movement confidence
            if conf < 0.35 and iso_outlier:
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "low_movement_confidence",
                    "score": round(1.0 - conf, 2),
                    "severity": "LOW",
                    "body_region": "global_pose",
                    "explanation": f"Pose keypoint confidence ({round(conf, 2)}) dropped below reliable screening precision."
                })

            # If Isolation Forest flagged outlier but no specific single threshold triggered, find top z-score
            if iso_outlier and not detected_for_frame and iso_score >= 0.75:
                top_idx = int(np.argmax(z_scores))
                feat_name = self.FEATURE_KEYS[top_idx]
                detected_for_frame.append({
                    "frame": frame_idx,
                    "timestamp": ts,
                    "type": "movement_deviation",
                    "score": round(iso_score, 2),
                    "severity": "MODERATE",
                    "body_region": "biomechanical_chain",
                    "explanation": f"Unsupervised detector identified anomalous pattern dominated by {feat_name} ({round(row[top_idx], 1)})."
                })

            anomalies.extend(detected_for_frame)

        # Sort anomalies by score descending or timestamp ascending
        anomalies.sort(key=lambda x: (x["timestamp"], -x["score"]))
        return anomalies
