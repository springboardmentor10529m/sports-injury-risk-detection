"""
Corrective Recommendation Service.
Generates evidence-based, actionable educational exercise protocols, mobility drills,
strengthening targets, load modifications, and recovery plans customized to athlete risk profiles.
"""
from typing import Dict, Any, List

class RecommendationService:
    def generate_corrective_program(
        self,
        risk_profile: Dict[str, Any],
        feature_vector: Dict[str, Any] = None,
        anomalies: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates targeted corrective recommendation lists based on elevated risk factors and anomalies.
        """
        feature_vector = feature_vector or {}
        anomalies = anomalies or []

        acl_risk = risk_profile.get("acl_risk", 0.0)
        hamstring_risk = risk_profile.get("hamstring_risk", 0.0)
        ankle_risk = risk_profile.get("ankle_sprain_risk", risk_profile.get("ankle_risk", 0.0))
        shoulder_risk = risk_profile.get("shoulder_risk", 0.0)
        back_risk = risk_profile.get("lower_back_risk", 0.0)
        overuse_risk = risk_profile.get("overuse_risk", 0.0)

        risk_category = risk_profile.get("risk_category", "Low")

        exercise_list: List[Dict[str, str]] = []
        mobility_list: List[Dict[str, str]] = []
        strengthening_list: List[Dict[str, str]] = []

        # 1. ACL Risk Targeted Recommendations
        if acl_risk >= 40.0:
            exercise_list.append({
                "name": "Banded Gluteus Medius Walks",
                "reps": "3 sets of 15 steps per side",
                "focus": "Combats dynamic knee valgus collapse and stabilizes hip abductors."
            })
            exercise_list.append({
                "name": "Single-Leg Romanian Deadlifts",
                "reps": "3 sets of 8-10 reps per leg",
                "focus": "Enhances unilateral balance and hamstring-to-quadricep co-activation."
            })
            mobility_list.append({
                "name": "Ankle Dorsiflexion Wall Mobilizations",
                "focus": "Restores ankle joint range of motion to relieve knee compensation."
            })
            strengthening_list.append({
                "name": "Eccentric Leg Extensions",
                "focus": "Builds quadricep deceleration force absorption capacity."
            })

        # 2. Hamstring Strain Risk Targeted Recommendations
        if hamstring_risk >= 40.0:
            exercise_list.append({
                "name": "Nordic Hamstring Curls",
                "reps": "3 sets of 5 reps (3-sec eccentric control)",
                "focus": "Increases eccentric hamstring strength and fascicle length."
            })
            exercise_list.append({
                "name": "Single-Leg Glute Bridges",
                "reps": "3 sets of 12 reps per leg",
                "focus": "Restores posterior chain limb symmetry."
            })
            mobility_list.append({
                "name": "Dynamic Hamstring Leg Swings",
                "focus": "Improves active hamstring flexibilty under dynamic stretch."
            })
            strengthening_list.append({
                "name": "Glute-Ham Developer (GHD) Extensions",
                "focus": "Strengthens hamstrings near full hip extension."
            })

        # 3. Ankle Sprain Risk Targeted Recommendations
        if ankle_risk >= 40.0:
            exercise_list.append({
                "name": "Single-Leg Balance Board Holds",
                "reps": "3 sets of 45 seconds per leg",
                "focus": "Trains ankle subtalar joint proprioception and lateral stability."
            })
            exercise_list.append({
                "name": "Banded Ankle Eversion & Inversion",
                "reps": "3 sets of 15 reps",
                "focus": "Strengthens peroneal longus and brevis tendon complex."
            })
            mobility_list.append({
                "name": "Calf & Achillies Dynamic Foam Rolling",
                "focus": "Reduces gastrocnemius tightness."
            })

        # 4. Shoulder Impingement Targeted Recommendations
        if shoulder_risk >= 40.0:
            exercise_list.append({
                "name": "Banded Face Pulls with External Rotation",
                "reps": "3 sets of 12 reps",
                "focus": "Strengthens infraspinatus and rotator cuff stabilizers."
            })
            mobility_list.append({
                "name": "Thoracic Extension over Foam Roller",
                "focus": "Restores upper thoracic extension to reduce shoulder impingement."
            })
            strengthening_list.append({
                "name": "Scapular Wall Slides",
                "focus": "Activates lower trapezius and serratus anterior."
            })

        # 5. Lower Back Strain Targeted Recommendations
        if back_risk >= 40.0:
            exercise_list.append({
                "name": "McGill Bird-Dog Core Holds",
                "reps": "3 sets of 6 reps per side (hold 8s)",
                "focus": "Builds lumbar spine endurance without hyper-flexion."
            })
            exercise_list.append({
                "name": "Pallof Anti-Rotation Press",
                "reps": "3 sets of 10 reps per side",
                "focus": "Reinforces deep abdominal wall and anti-rotational stability."
            })
            mobility_list.append({
                "name": "Kneeling Hip Flexor Stretch",
                "focus": "Releases anterior hip tightness pulling on lumbar spine."
            })

        # Default general maintenance if all specific risks are low
        if not exercise_list:
            exercise_list.append({
                "name": "Bodyweight Squat & Plank Circuit",
                "reps": "3 sets of 12 reps / 45s plank",
                "focus": "General movement maintenance and core endurance."
            })
            mobility_list.append({
                "name": "Full-Body Dynamic Warm-Up Protocol",
                "focus": "Prepares joint capsules for athletic training load."
            })
            strengthening_list.append({
                "name": "Banded Hip Abductions",
                "focus": "Maintains pelvic stability."
            })

        # Formulate Training Volume Modifications
        if risk_category == "Low":
            training_mod = "Maintain current training volume and intensity. Continue routine warm-ups."
            recovery_plan = (
                "Status: Baseline Active Training.\n"
                "• Target 7-8 hours of sleep daily.\n"
                "• Maintain hydration (35ml/kg bodyweight).\n"
                "• Routine post-session light stretching."
            )
        elif risk_category == "Moderate":
            training_mod = "Reduce total weekly high-impact training volume by 10-15%. Avoid maximal velocity deceleration drills."
            recovery_plan = (
                "Status: Active Fatigue Monitoring.\n"
                "• Target 8+ hours of quality sleep.\n"
                "• Incorporate 1 dedicated active recovery day (light swimming or cycling).\n"
                "• Apply targeted foam rolling to tight muscle groups."
            )
        elif risk_category == "High":
            training_mod = "Reduce high-impact plyometrics and heavy resistance loading by 25-30%. Focus on corrective movement mechanics."
            recovery_plan = (
                "Status: High Fatigue & Mechanical Strain Warning.\n"
                "• Target 8.5-9 hours of restorative sleep.\n"
                "• Schedule 2 non-consecutive active recovery days per week.\n"
                "• Perform prescribed mobility protocols pre- and post-workout."
            )
        else:  # Critical
            training_mod = "Suspend explosive jumping, maximal sprinting, and heavy lower-body loading. Substitute with low-impact corrective exercise."
            recovery_plan = (
                "Status: CRITICAL STRAIN RECOVERY PROTOCOL.\n"
                "• Take 2-3 days of complete active rest.\n"
                "• Prioritize professional biomechanical assessment with certified team staff.\n"
                "• Cryotherapy / contrast hydrotherapy recommended for muscle recovery."
            )

        return {
            "exercise_recommendations": exercise_list,
            "mobility_suggestions": mobility_list,
            "strengthening_suggestions": strengthening_list,
            "training_modification": training_mod,
            "recovery_plan": recovery_plan,

            # String formatted versions for backward compatibility with exporters/reports
            "exercise": "\n".join([f"- {e['name']}: {e['reps']} ({e['focus']})" for e in exercise_list]),
            "mobility": "\n".join([f"- {m['name']}: {m['focus']}" for m in mobility_list]),
            "strengthening": "\n".join([f"- {s['name']}: {s['focus']}" for s in strengthening_list]),
            "recovery": recovery_plan
        }

recommendation_service = RecommendationService()
