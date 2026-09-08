"""
Corrective Recommendation Engine
Generates targeted sports rehabilitation, mobility, and workload modification protocols.
"""

from typing import Dict, Any, List

class RecommendationEngine:
    def generate_recommendations(
        self,
        risk_data: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        ml_prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        risk_category = risk_data.get("risk_category", "LOW")
        primary_injury_risk = ml_prediction.get("primary_injury_risk_category", "Other Musculoskeletal")

        corrective_exercises = []
        mobility_drills = []
        strengthening_protocols = []
        workload_adjustments = []

        anomaly_ids = {a.get("id") for a in anomalies}

        # 1. Valgus Collapse / ACL Risk Interventions
        if "ANOM_VALGUS_SEVERE" in anomaly_ids or "ANOM_VALGUS_MODERATE" in anomaly_ids or "Knee / ACL Tear" in primary_injury_risk:
            corrective_exercises.append({
                "name": "Banded Monster Walks & Lateral Band Walks",
                "target_muscle": "Gluteus Medius / Abductor Complex",
                "reps_sets": "3 sets x 15 paces each direction",
                "coaching_cue": "Keep knees pushed outward against band tension; prevent any inward knee collapse.",
                "evidence_base": "ACL Injury Prevention FIFA 11+ Protocol"
            })
            corrective_exercises.append({
                "name": "Single-Leg Deceleration & Stick Landing",
                "target_muscle": "Eccentric Quad & Knee Stabilizers",
                "reps_sets": "3 sets x 8 reps per leg",
                "coaching_cue": "Land softly with knee aligned directly over the second toe; hold landing for 2 seconds.",
                "evidence_base": "Neuromuscular Jump-Landing Retraining"
            })
            strengthening_protocols.append({
                "name": "Spanish Squats (Heavy Band Behind Knees)",
                "target_muscle": "Quadriceps & Patellar Tendon",
                "reps_sets": "4 sets x 45-second isometric holds",
                "coaching_cue": "Maintain upright torso and engage glutes; reduces patellofemoral shear."
            })

        # 2. Bilateral Asymmetry Interventions
        if "ANOM_ASYM_HIGH" in anomaly_ids or "ANOM_ASYM_MILD" in anomaly_ids:
            corrective_exercises.append({
                "name": "Single-Leg Romanian Deadlift (RDL)",
                "target_muscle": "Posterior Chain & Unilateral Gluteus Maximus",
                "reps_sets": "3 sets x 8-10 reps per side (start on weaker limb)",
                "coaching_cue": "Keep pelvis strictly level with the floor; hinge at the hip without rotating trunk.",
                "evidence_base": "Bilateral Deficit Mitigation"
            })
            strengthening_protocols.append({
                "name": "Bulgarian Split Squats (Dumbbell)",
                "target_muscle": "Quadriceps, Gluteal Complex",
                "reps_sets": "3 sets x 8 reps per side",
                "coaching_cue": "Control descent for 3 seconds; push through the midfoot of the lead leg."
            })

        # 3. Excessive Trunk Lean Interventions
        if "ANOM_TRUNK_LEAN_HIGH" in anomaly_ids or "ANOM_TRUNK_LEAN_MOD" in anomaly_ids or "Spinal / Back Pain" in primary_injury_risk:
            corrective_exercises.append({
                "name": "Pallof Press (Cable or Resistance Band)",
                "target_muscle": "Anti-Rotation Core & Quadratus Lumborum",
                "reps_sets": "3 sets x 10 presses with 3-second hold per side",
                "coaching_cue": "Resist rotational pull; keep sternum and hands centered with navel."
            })
            mobility_drills.append({
                "name": "Thoracic Spine Foam Roller Extensions & Rotations",
                "target_muscle": "Thoracic Spine Mobility",
                "reps_sets": "2 sets x 10 reps",
                "coaching_cue": "Isolate movement through mid-back without hyperextending lumbar spine."
            })

        # 4. Ankle Stiffness & Dorsiflexion Interventions
        if "ANOM_ANKLE_STIFF" in anomaly_ids or "Ankle Sprain" in primary_injury_risk:
            mobility_drills.append({
                "name": "Knee-to-Wall Ankle Weight-Bearing Mobilization",
                "target_muscle": "Soleus & Ankle Talocrural Joint",
                "reps_sets": "3 sets x 12 dynamic oscillations per side",
                "coaching_cue": "Keep heel firmly anchored on the ground as knee drives forward over toes."
            })
            strengthening_protocols.append({
                "name": "Eccentric Heel Drops on Step (Straight & Bent Knee)",
                "target_muscle": "Gastrocnemius & Achilles Tendon",
                "reps_sets": "3 sets x 15 reps",
                "coaching_cue": "Rise on both feet, lower slowly on single leg over 3 full seconds."
            })

        # 5. Hamstring / Posterior Chain Protection
        if "Hamstring / Muscle Strain" in primary_injury_risk:
            strengthening_protocols.append({
                "name": "Nordic Hamstring Curls (Partner or Anchor Assisted)",
                "target_muscle": "Biceps Femoris / Semitendinosus",
                "reps_sets": "3 sets x 5-6 reps",
                "coaching_cue": "Resist falling forward as long as possible using pure eccentric hamstring force.",
                "evidence_base": "Petersen et al. Hamstring Injury Prevention Protocol"
            })

        # Default foundational mobility if list is empty
        if not mobility_drills:
            mobility_drills.append({
                "name": "90/90 Hip Mobility & Internal Rotation Flow",
                "target_muscle": "Hip Capsule & External/Internal Rotators",
                "reps_sets": "2 sets x 8 transitions per side",
                "coaching_cue": "Maintain tall spine while rotating knees from side to side smoothly."
            })

        # Workload & Training Schedule Adjustments
        if risk_category in ("CRITICAL", "HIGH"):
            workload_adjustments.extend([
                "Implement immediate 25-30% reduction in high-velocity sprinting and jump-landing volume.",
                "Substitute full-contact scrimmage drills with closed-kinetic chain strength sessions for 7-10 days.",
                "Mandate at least 48 hours between maximum-effort competitive sessions.",
                "Conduct daily readiness and soreness monitoring before clearance to train."
            ])
        elif risk_category == "MODERATE":
            workload_adjustments.extend([
                "Cap maximum sprint volume at 80% of personal weekly benchmark.",
                "Integrate 15 minutes of corrective neuromuscular warm-up drills before every practice session.",
                "Ensure minimum 7.5 hours nightly sleep to facilitate connective tissue remodeling."
            ])
        else: # LOW
            workload_adjustments.extend([
                "Athlete is cleared for full unrestricted sporting participation.",
                "Continue standard preventive neuromuscular warm-up (FIFA 11+ or equivalent) twice weekly.",
                "Maintain baseline recovery protocols."
            ])

        return {
            "risk_category": risk_category,
            "priority_focus": f"Mitigate {primary_injury_risk} & Biomechanical Asymmetries",
            "corrective_exercises": corrective_exercises,
            "mobility_drills": mobility_drills,
            "strengthening_protocols": strengthening_protocols,
            "workload_adjustments": workload_adjustments
        }
