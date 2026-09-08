"""
Biomechanical Anomaly Detector
Detects kinematic deviations and flags risk patterns against sports medicine benchmarks.
"""

from typing import Dict, Any, List

class AnomalyDetector:
    def detect_anomalies(self, summary_kinematics: Dict[str, Any]) -> List[Dict[str, Any]]:
        anomalies = []

        # 1. Dynamic Knee Valgus (Medial Knee Collapse)
        valgus = summary_kinematics.get("knee_valgus", {})
        max_valgus = valgus.get("max", 0.0)
        mean_valgus = valgus.get("mean", 0.0)

        if max_valgus >= 15.0:
            anomalies.append({
                "id": "ANOM_VALGUS_SEVERE",
                "joint": "Knee",
                "metric": "Dynamic Knee Valgus",
                "measured_value": f"{max_valgus}°",
                "normative_threshold": "< 8.0°",
                "severity": "CRITICAL",
                "clinical_impact": "Severe medial knee collapse during dynamic loading. Primary predisposing factor for acute non-contact ACL rupture and meniscus compression."
            })
        elif max_valgus >= 8.5:
            anomalies.append({
                "id": "ANOM_VALGUS_MODERATE",
                "joint": "Knee",
                "metric": "Dynamic Knee Valgus",
                "measured_value": f"{max_valgus}°",
                "normative_threshold": "< 8.0°",
                "severity": "MODERATE",
                "clinical_impact": "Moderate knee valgus excursion observed. Increases patellofemoral shear and lateral cartilage loading."
            })

        # 2. Bilateral Knee Asymmetry
        asym = summary_kinematics.get("bilateral_asymmetry", {})
        mean_asym = asym.get("mean", 0.0)
        max_asym = asym.get("max", 0.0)

        if mean_asym >= 18.0 or max_asym >= 25.0:
            anomalies.append({
                "id": "ANOM_ASYM_HIGH",
                "joint": "Bilateral Lower Extremity",
                "metric": "Kinematic Asymmetry",
                "measured_value": f"{mean_asym}% mean ({max_asym}% peak)",
                "normative_threshold": "< 10.0%",
                "severity": "HIGH",
                "clinical_impact": "Marked unilateral limb loading preference. Indicates neuromuscular deficit or compensatory unloading often preceding contralateral strain."
            })
        elif mean_asym >= 10.0:
            anomalies.append({
                "id": "ANOM_ASYM_MILD",
                "joint": "Bilateral Lower Extremity",
                "metric": "Kinematic Asymmetry",
                "measured_value": f"{mean_asym}%",
                "normative_threshold": "< 10.0%",
                "severity": "MODERATE",
                "clinical_impact": "Mild side-to-side asymmetry. May diminish kinetic chain power transfer during bilateral push-off."
            })

        # 3. Excessive Trunk Lateral Lean
        trunk = summary_kinematics.get("trunk_lean", {})
        mean_trunk = trunk.get("mean", 0.0)
        max_trunk = trunk.get("max", 0.0)

        if max_trunk >= 12.0:
            anomalies.append({
                "id": "ANOM_TRUNK_LEAN_HIGH",
                "joint": "Spine / Core",
                "metric": "Trunk Lateral Lean",
                "measured_value": f"{max_trunk}°",
                "normative_threshold": "< 6.0°",
                "severity": "HIGH",
                "clinical_impact": "Excessive coronal plane trunk displacement shifts center of mass laterally, significantly amplifying knee external abduction moments."
            })
        elif max_trunk >= 7.0:
            anomalies.append({
                "id": "ANOM_TRUNK_LEAN_MOD",
                "joint": "Spine / Core",
                "metric": "Trunk Lateral Lean",
                "measured_value": f"{max_trunk}°",
                "normative_threshold": "< 6.0°",
                "severity": "LOW",
                "clinical_impact": "Mild trunk postural instability. Suggests core/gluteal endurance fatigue under repetitive loading."
            })

        # 4. Ankle Dorsiflexion Restriction
        ankle = summary_kinematics.get("ankle_flexion", {})
        min_ankle = ankle.get("min", 90.0)
        if min_ankle > 0 and min_ankle < 25.0:
            anomalies.append({
                "id": "ANOM_ANKLE_STIFF",
                "joint": "Ankle",
                "metric": "Ankle Dorsiflexion",
                "measured_value": f"{min_ankle}°",
                "normative_threshold": "> 30.0°",
                "severity": "MODERATE",
                "clinical_impact": "Restricted closed-chain ankle dorsiflexion restricts shock absorption during deceleration, forcing compensatory knee inward rotation."
            })

        # 5. Knee Flexion Range of Motion (Stiff Landing / Low ROM)
        knee = summary_kinematics.get("knee_flexion", {})
        rom_knee = knee.get("rom", 60.0)
        if 0 < rom_knee < 30.0:
            anomalies.append({
                "id": "ANOM_KNEE_STIFF",
                "joint": "Knee",
                "metric": "Knee Range of Motion",
                "measured_value": f"{rom_knee}°",
                "normative_threshold": "> 45.0°",
                "severity": "MODERATE",
                "clinical_impact": "Stiff-legged movement pattern with attenuated knee flexion. Increases peak vertical ground reaction forces transmitted through joints."
            })

        return anomalies
