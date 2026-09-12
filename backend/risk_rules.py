import numpy as np
from typing import Dict, Any, List, Optional

def calculate_injury_predictions(
    biomechanics: Dict[str, Any],
    athlete_position: str = "",
    training_load: float = 70.0,
    flexibility: float = 75.0,
    strength: float = 80.0,
    balance: float = 82.0,
    prior_injuries: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Applies transparent, deterministic rule-based injury risk calculations across 6 target injuries.
    Incorporate playing position parameter modifications, physical metrics, and prior injury history weighting.
    """
    knee_valgus = biomechanics.get("knee_valgus", 11.5)
    trunk_lean = biomechanics.get("trunk_lean", 8.0)
    symmetry = biomechanics.get("symmetry_score", 85.0)
    hip_stability = biomechanics.get("hip_stability", 80.0)
    fatigue = biomechanics.get("fatigue_score", 20.0)
    movement_quality = biomechanics.get("movement_quality", 84.0)
    rom = biomechanics.get("range_of_motion_deg", 65.0)

    # Base Risk Rules

    # 1. ACL Risk: Primary drivers are Knee Valgus (>10 deg), low symmetry, low balance
    acl_base = (
        3.8 * max(0.0, knee_valgus - 7.0) +
        1.5 * (100.0 - symmetry) * 0.3 +
        1.2 * (100.0 - balance) * 0.3
    )

    # 2. Hamstring Strain Risk: Drivers are low flexibility, low ROM, high fatigue
    hamstring_base = (
        2.2 * (100.0 - flexibility) * 0.4 +
        1.8 * max(0.0, 75.0 - rom) * 0.3 +
        1.5 * (fatigue * 0.4)
    )

    # 3. Ankle Sprain Risk: Drivers are low balance, low symmetry, knee valgus lateral displacement
    ankle_base = (
        2.5 * (100.0 - balance) * 0.4 +
        2.0 * max(0.0, knee_valgus - 9.0) +
        1.2 * (100.0 - symmetry) * 0.3
    )

    # 4. Shoulder Impingement Risk: Drivers are upper body alignment, asymmetry, low shoulder strength
    shoulder_base = (
        2.0 * (100.0 - symmetry) * 0.4 +
        1.8 * (100.0 - strength) * 0.3 +
        1.5 * max(0.0, trunk_lean - 10.0)
    )

    # 5. Lower Back Strain Risk: Primary drivers are excessive Trunk Lean (>10 deg), low hip stability, low flexibility
    lower_back_base = (
        3.5 * max(0.0, trunk_lean - 8.0) +
        2.0 * (100.0 - hip_stability) * 0.35 +
        1.2 * (100.0 - flexibility) * 0.3
    )

    # 6. Overuse Syndrome Risk: Primary drivers are High Training Load, high fatigue, low movement quality
    overuse_base = (
        0.4 * training_load +
        0.4 * fatigue +
        0.2 * (100.0 - movement_quality)
    )

    # Pure kinematic movement calculations (No prior injury weighting applied to risk score)
    history_notes: List[str] = []

    # POSITION PARAMETER ADJUSTMENT
    pos_lower = (athlete_position or "").lower().strip()
    position_applied_msg = ""

    if any(p in pos_lower for p in ["winger", "point guard", "striker", "forward", "cutter", "jumper", "defender"]):
        acl_base *= 1.20
        ankle_base *= 1.15
        position_applied_msg = f"Cutting/Pivoting position '{athlete_position.title()}' applied +20% ACL & +15% Ankle risk weighting."
    elif any(p in pos_lower for p in ["pitcher", "quarterback", "bowler", "thrower", "setter", "keeper", "goalkeeper"]):
        shoulder_base *= 1.30
        lower_back_base *= 1.15
        position_applied_msg = f"Overhead/Throwing position '{athlete_position.title()}' applied +30% Shoulder & +15% Lower Back risk weighting."
    elif any(p in pos_lower for p in ["runner", "marathon", "midfielder", "sprinter"]):
        overuse_base *= 1.25
        hamstring_base *= 1.20
        position_applied_msg = f"Continuous endurance position '{athlete_position.title()}' applied +25% Overuse & +20% Hamstring risk weighting."

    # Clamp scores into [5.0, 95.0] range
    acl_risk = round(float(np.clip(acl_base, 5.0, 95.0)), 1)
    hamstring_risk = round(float(np.clip(hamstring_base, 5.0, 95.0)), 1)
    ankle_risk = round(float(np.clip(ankle_base, 5.0, 95.0)), 1)
    shoulder_risk = round(float(np.clip(shoulder_base, 5.0, 95.0)), 1)
    lower_back_risk = round(float(np.clip(lower_back_base, 5.0, 95.0)), 1)
    overuse_risk = round(float(np.clip(overuse_base, 5.0, 95.0)), 1)

    # Overall Risk Score Aggregation
    all_risks = [acl_risk, hamstring_risk, ankle_risk, shoulder_risk, lower_back_risk, overuse_risk]
    max_risk = max(all_risks)
    mean_risk = float(np.mean(all_risks))

    overall_risk_score = round(
        float(
            np.clip(
                0.35 * max_risk + 0.35 * mean_risk + 0.30 * (100.0 - movement_quality),
                5.0, 95.0
            )
        ),
        1
    )

    if overall_risk_score < 34.0:
        risk_level = "Low"
    elif overall_risk_score < 67.0:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    # Per-Injury Triggered Factors ("Why?" explanations)
    injury_factors = {
        "acl": [],
        "hamstring": [],
        "ankle": [],
        "shoulder": [],
        "lower_back": [],
        "overuse": []
    }

    # ACL Factors
    if knee_valgus > 10.0:
        injury_factors["acl"].append(f"Knee Valgus: {knee_valgus:.1f}° > 10.0° reference threshold (Inward medial collapse)")
    if symmetry < 80.0:
        injury_factors["acl"].append(f"Bilateral Asymmetry: {100.0 - symmetry:.1f}% loading difference")
    if balance < 75.0:
        injury_factors["acl"].append(f"Postural Balance: {balance:.1f}% < 75.0% stability threshold")
    if "Cutting/Pivoting position" in position_applied_msg:
        injury_factors["acl"].append(position_applied_msg)

    # Hamstring Factors
    if flexibility < 70.0:
        injury_factors["hamstring"].append(f"Flexibility: {flexibility:.1f}% < 70.0% threshold")
    if rom < 60.0:
        injury_factors["hamstring"].append(f"Restricted Knee ROM: {rom:.1f}° < 60.0° threshold")
    if fatigue > 35.0:
        injury_factors["hamstring"].append(f"Motor Fatigue Score: {fatigue:.1f}% > 35.0% threshold")
    if "Continuous endurance position" in position_applied_msg:
        injury_factors["hamstring"].append(position_applied_msg)

    # Ankle Factors
    if balance < 75.0:
        injury_factors["ankle"].append(f"Postural Balance: {balance:.1f}% < 75.0% threshold")
    if knee_valgus > 9.0:
        injury_factors["ankle"].append(f"Knee Valgus Offset: {knee_valgus:.1f}° > 9.0° lateral displacement threshold")
    if symmetry < 80.0:
        injury_factors["ankle"].append(f"Bilateral Asymmetry: {100.0 - symmetry:.1f}% imbalance")

    # Shoulder Factors
    if symmetry < 80.0:
        injury_factors["shoulder"].append(f"Bilateral Asymmetry: {100.0 - symmetry:.1f}% upper kinetic chain tilt")
    if strength < 75.0:
        injury_factors["shoulder"].append(f"Strength Rating: {strength:.1f}% < 75.0% threshold")
    if trunk_lean > 10.0:
        injury_factors["shoulder"].append(f"Trunk Lean: {trunk_lean:.1f}° > 10.0° upright threshold")
    if "Overhead/Throwing position" in position_applied_msg:
        injury_factors["shoulder"].append(position_applied_msg)

    # Lower Back Factors
    if trunk_lean > 8.0:
        injury_factors["lower_back"].append(f"Trunk Lean: {trunk_lean:.1f}° > 8.0° threshold (Increases spinal shear stress)")
    if hip_stability < 80.0:
        injury_factors["lower_back"].append(f"Hip Stability: {hip_stability:.1f}% < 80.0% pelvic control threshold")
    if flexibility < 70.0:
        injury_factors["lower_back"].append(f"Flexibility Rating: {flexibility:.1f}% < 70.0% threshold")

    # Overuse Factors
    if training_load > 75.0:
        injury_factors["overuse"].append(f"High Training Load Index: {training_load:.1f} / 100")
    if fatigue > 35.0:
        injury_factors["overuse"].append(f"Fatigue Accumulation: {fatigue:.1f}% > 35.0% variance decay threshold")
    if movement_quality < 75.0:
        injury_factors["overuse"].append(f"Movement Quality Deficit: {movement_quality:.1f}% < 75.0% threshold")
    if "Continuous endurance position" in position_applied_msg:
        injury_factors["overuse"].append(position_applied_msg)

    # Fallback default notes if no rules triggered for specific injuries
    for key in injury_factors:
        if not injury_factors[key]:
            injury_factors[key].append("Kinematic metrics remain within physiological reference limits.")

    rules_triggered = get_triggered_rule_explanations(
        knee_valgus, trunk_lean, symmetry, hip_stability, fatigue, rom, pos_lower, position_applied_msg
    )
    if history_notes:
        rules_triggered.extend(history_notes)

    feature_contributions = {
        "knee_valgus_contrib": round(3.8 * max(0.0, knee_valgus - 7.0), 1),
        "trunk_lean_contrib": round(3.5 * max(0.0, trunk_lean - 8.0), 1),
        "asymmetry_contrib": round(1.5 * (100.0 - symmetry) * 0.3, 1),
        "hip_instability_contrib": round(2.0 * (100.0 - hip_stability) * 0.35, 1),
        "fatigue_contrib": round(1.5 * (fatigue * 0.4), 1),
    }

    return {
        "acl_risk": acl_risk,
        "hamstring_risk": hamstring_risk,
        "ankle_risk": ankle_risk,
        "shoulder_risk": shoulder_risk,
        "lower_back_risk": lower_back_risk,
        "overuse_risk": overuse_risk,
        "overall_risk_score": overall_risk_score,
        "risk_level": risk_level,
        "rules_triggered": rules_triggered,
        "injury_factors": injury_factors,
        "position_applied_msg": position_applied_msg or f"Position '{athlete_position.title()}' has baseline standard weighting.",
        "history_notes": history_notes,
        "feature_contributions": feature_contributions,
    }



def get_triggered_rule_explanations(
    knee_valgus: float,
    trunk_lean: float,
    symmetry: float,
    hip_stability: float,
    fatigue: float,
    rom: float,
    pos_lower: str,
    position_applied_msg: str
) -> List[str]:
    reasons = []

    if knee_valgus > 10.0:
        reasons.append(f"Knee Valgus ({knee_valgus:.1f}° > 10.0° threshold): Inward medial knee displacement increases non-contact ACL and Ankle sprain risk.")
    else:
        reasons.append(f"Knee Valgus ({knee_valgus:.1f}°): Frontal knee alignment is within safe physiological limits.")

    if trunk_lean > 10.0:
        reasons.append(f"Trunk Lean ({trunk_lean:.1f}° > 10.0° threshold): Excessive forward/lateral spine tilt increases shear stress on Lumbar Spine.")
    else:
        reasons.append(f"Trunk Lean ({trunk_lean:.1f}°): Spinal upright axis alignment is stable.")

    if symmetry < 80.0:
        reasons.append(f"Movement Asymmetry ({symmetry:.1f}% < 80.0% threshold): Left/Right bilateral loading difference elevates joint injury risk.")

    if rom < 60.0:
        reasons.append(f"Restricted ROM ({rom:.1f}° < 60.0° threshold): Reduced joint range of motion elevates Hamstring strain risk.")

    if fatigue > 35.0:
        reasons.append(f"Fatigue Index ({fatigue:.1f}% > 35.0% threshold): Kinematic variance decay indicates motor fatigue accumulation.")

    if position_applied_msg:
        reasons.append(position_applied_msg)

    return reasons


