from typing import Dict, Any, List

def generate_recommendations(risk_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates tailored exercises, mobility suggestions, strengthening, recovery, and
    training modification plans based on the athlete's risk scores and categories.
    """
    risk_score = risk_data.get("risk_score", 0.0)
    risk_category = risk_data.get("risk_category", "Low")
    
    exercises = []
    mobility = []
    strengthening = []
    
    # ACL Risk Correctives
    if risk_data.get("acl_risk", 0.0) >= 50.0:
        exercises.append("Gluteus Medius Banded Walks: 3 sets of 15 steps (each side). Helps knee alignment.")
        exercises.append("Single-Leg Romanian Deadlifts: 3 sets of 8-10 reps per leg. Improves knee stability.")
        mobility.append("Ankle Dorsiflexion Mobilization: 2 minutes per side. Restores ankle range of motion.")
        strengthening.append("Eccentric Knee Extensions: 3 sets of 8 reps. Controls deceleration forces.")

    # Hamstring Risk Correctives
    if risk_data.get("hamstring_risk", 0.0) >= 50.0:
        exercises.append("Nordic Hamstring Curls: 3 sets of 5 reps (eccentric focus). Prevents sprint strains.")
        exercises.append("Single-Leg Glute Bridges: 3 sets of 12 reps per leg. Restores posterior chain symmetry.")
        mobility.append("Active Straight Leg Raise: 10 reps per side. Enhances dynamic flexibility.")
        strengthening.append("Glute-Ham Raises: 3 sets of 8 reps. Builds eccentric hamstring load capacity.")

    # Ankle Risk Correctives
    if risk_data.get("ankle_risk", 0.0) >= 50.0:
        exercises.append("Single-Leg Balance Board Holds: 3 sets of 45 seconds per leg. Improves proprioception.")
        exercises.append("Banded Ankle Eversion: 3 sets of 15 reps. Strengthens peroneal abductors.")
        mobility.append("Ankle Alphabet Tracing: 2 sets per ankle. Relieves tightness.")
        strengthening.append("Banded Ankle Inversion/Eversion: 3 sets of 15 reps. Strengthens lateral ankles.")

    # Shoulder Risk Correctives
    if risk_data.get("shoulder_risk", 0.0) >= 50.0:
        exercises.append("Banded External Rotations: 3 sets of 15 reps. Strengthens rotator cuff stabilizers.")
        exercises.append("Face Pulls with External Rotation: 3 sets of 12 reps. Restores shoulder girdle integrity.")
        mobility.append("Thoracic Extension over Foam Roller: 2 minutes. Restores upper spine mobility.")
        strengthening.append("Scapular Wall Slides: 3 sets of 10 reps. Strengthens lower trapezius.")

    # Lower Back Risk Correctives
    if risk_data.get("lower_back_risk", 0.0) >= 50.0:
        exercises.append("McGill Bird-Dog: 3 sets of 8 reps per side (hold 10s). Builds spine endurance.")
        exercises.append("RKC Plank: 3 sets of 20 seconds. Activates deep core stabilizers.")
        mobility.append("Kneeling Hip Flexor Stretch: 1 minute per side. Reduces lower back compression.")
        strengthening.append("Weighted Glute Bridges: 3 sets of 10 reps. Reinforces hip extension.")

    # If no high risk categories, add general maintenance
    if not exercises:
        exercises.append("Full-Body Core Stability Workout: 2 times per week. Focus on general alignment.")
        mobility.append("Dynamic Warm-Up Protocol: 10 minutes pre-workout. Prepares joints for training load.")
        strengthening.append("Bodyweight Squats & Planks: 3 sets of 12 reps. Core and lower limb base.")

    # Recovery Plan formulation based on overall risk category
    if risk_category == "Low":
        recovery = (
            "Status: Maintain training load.\n"
            "Sleep: Prioritize 7-8 hours of quality sleep.\n"
            "Nutrition: Meet general protein and caloric requirements."
        )
        training_modification = "No training modifications needed. Continue current programming."
    elif risk_category == "Moderate":
        recovery = (
            "Status: Caution. Monitor fatigue levels.\n"
            "Sleep: Ensure 8+ hours of sleep, especially after heavy sessions.\n"
            "Active Recovery: Include one active recovery day per week."
        )
        training_modification = "Slightly reduce training volume (by 10%) if feeling muscle soreness or joint fatigue."
    elif risk_category == "High":
        recovery = (
            "Status: Warning. Modify load to prevent injury.\n"
            "Sleep: Target 8-9 hours of sleep daily.\n"
            "Physiotherapy: Schedule a preventative biomechanical review."
        )
        training_modification = "Reduce training volume by 20-30%. Avoid maximal loading and high-velocity eccentric movements."
    else:  # Critical
        recovery = (
            "Status: STOP/REDUCE. High probability of musculoskeletal strain.\n"
            "Rest: Take 2-3 days of complete active rest.\n"
            "Clinical Assessment: Schedule evaluation with medical staff or physiotherapist."
        )
        training_modification = "Suspend explosive and heavy resistance training. Replace with supervised low-impact swimming and active rehab."

    return {
        "exercise": "\n".join([f"- {ex}" for ex in exercises]),
        "mobility": "\n".join([f"- {m}" for m in mobility]),
        "strengthening": "\n".join([f"- {s}" for s in strengthening]),
        "recovery": recovery,
        "training_modification": training_modification
    }
