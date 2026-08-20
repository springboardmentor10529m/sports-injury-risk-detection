import numpy as np
from typing import Dict, Any, List

def calculate_injury_risk(
    assessment_data: Dict[str, Any], 
    athlete_profile: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Computes overall injury risk score and breakdown based on the Weighted Scoring Model:
    - Biomechanical Deviations (35%)
    - Historical Injury Factors (20%)
    - Movement Asymmetry (20%)
    - Training Load Indicators (15%)
    - Fatigue Indicators (10%)
    """
    if not assessment_data.get("processed", False):
        return {
            "risk_score": 0.0,
            "risk_category": "Low",
            "acl_risk": 0.0,
            "hamstring_risk": 0.0,
            "ankle_risk": 0.0,
            "shoulder_risk": 0.0,
            "lower_back_risk": 0.0,
            "overuse_risk": 0.0
        }

    joint_angles = assessment_data.get("joint_angles", {})
    rom = assessment_data.get("range_of_motion", {})
    symmetry_score = assessment_data.get("symmetry_score", 100.0)
    frames_timeline = assessment_data.get("frames_timeline", [])

    # 1. Biomechanical Deviations (Max 35 points)
    bio_score = 0.0
    
    # Knee Valgus collapse penalty
    valgus_ratio = joint_angles.get("min_knee_valgus_ratio", 1.0)
    if valgus_ratio < 0.70:
        bio_score += 20.0
    elif valgus_ratio < 0.85:
        bio_score += 12.0
    
    # Hip tilt/lateral stability penalty
    max_hip_tilt = joint_angles.get("hip_tilt_max", 0.0)
    if max_hip_tilt > 7.0:
        bio_score += 10.0
    elif max_hip_tilt > 5.0:
        bio_score += 6.0
        
    # Trunk lean penalty
    avg_trunk_lean = joint_angles.get("trunk_lean_avg", 0.0)
    if avg_trunk_lean > 30.0:
        bio_score += 10.0
    elif avg_trunk_lean > 20.0:
        bio_score += 5.0
        
    # Normalize bio_score to a max of 35.0
    bio_weighted = min(bio_score, 35.0)

    # 2. Historical Injury Factors (Max 20 points)
    history_weighted = 0.0
    if athlete_profile and athlete_profile.get("injury_history"):
        injury_list = athlete_profile.get("injury_history", [])
        # 10 points per previous injury
        history_weighted = min(len(injury_list) * 10.0, 20.0)

    # 3. Movement Asymmetry (Max 20 points)
    asymmetry_penalty = (100.0 - symmetry_score) * 1.5
    asymmetry_weighted = min(asymmetry_penalty, 20.0)

    # 4. Training Load Indicators (Max 15 points)
    training_weighted = 0.0
    if athlete_profile:
        load = athlete_profile.get("training_load", 0.0)  # hours/week
        if load > 20:
            training_weighted = 15.0
        elif load > 15:
            training_weighted = 10.0
        elif load > 8:
            training_weighted = 5.0

    # 5. Fatigue Indicators (Max 10 points)
    fatigue_weighted = 0.0
    if len(frames_timeline) > 10:
        l_knees = [f["left_knee_angle"] for f in frames_timeline if "left_knee_angle" in f]
        r_knees = [f["right_knee_angle"] for f in frames_timeline if "right_knee_angle" in f]
        
        if l_knees and r_knees:
            l_std = np.std(l_knees)
            r_std = np.std(r_knees)
            avg_std = (l_std + r_std) / 2
            
            if avg_std > 15.0:
                fatigue_weighted = 10.0
            elif avg_std > 8.0:
                fatigue_weighted = 5.0
            else:
                fatigue_weighted = 2.0

    # Overall Injury Risk Score
    overall_score = round(bio_weighted + history_weighted + asymmetry_weighted + training_weighted + fatigue_weighted, 1)
    overall_score = min(overall_score, 100.0)

    # Map to Risk Categories
    if overall_score < 30.0:
        category = "Low"
    elif overall_score < 60.0:
        category = "Moderate"
    elif overall_score < 85.0:
        category = "High"
    else:
        category = "Critical"

    # Specific injury risks calculations (0 to 100)
    sport = athlete_profile.get("sport_type", "General").lower() if athlete_profile else "general"

    # ACL Risk (linked strongly to Knee Valgus ratio + Knee Flexion stiff landing)
    knee_flexion_min = min(joint_angles.get("left_knee_min", 180.0), joint_angles.get("right_knee_min", 180.0))
    stiff_landing_factor = 1.0 if knee_flexion_min > 140.0 else 0.4
    valgus_factor = (1.0 - valgus_ratio) * 100.0
    acl_risk = min(round((valgus_factor * 0.7 + stiff_landing_factor * 30.0), 1), 100.0)
    if "soccer" in sport or "basketball" in sport or "jumping" in sport:
        acl_risk = min(acl_risk * 1.15, 100.0)

    # Hamstring Risk (linked to asymmetric knee ROM + hip-flexion overload)
    rom_asymmetry = 100.0 - symmetry_score
    hip_flex_avg = (joint_angles.get("left_hip_avg", 180.0) + joint_angles.get("right_hip_avg", 180.0)) / 2
    hip_overload_factor = 30.0 if hip_flex_avg < 110.0 else 10.0
    hamstring_risk = min(round((rom_asymmetry * 2.0 + hip_overload_factor + fatigue_weighted * 2.0), 1), 100.0)

    # Ankle Risk (linked to high hip tilt + poor valgus alignment)
    ankle_risk = min(round((max_hip_tilt * 4.0 + (1.0 - valgus_ratio) * 40.0 + asymmetry_weighted), 1), 100.0)

    # Shoulder Injury Risk
    base_shoulder = 10.0
    if "baseball" in sport or "tennis" in sport or "swimming" in sport or "volleyball" in sport:
        base_shoulder = 35.0
        if max_hip_tilt > 5.0 or avg_trunk_lean > 20.0:
            base_shoulder += 30.0
    shoulder_risk = min(round(base_shoulder + asymmetry_weighted * 0.5, 1), 100.0)

    # Lower Back Risk
    lower_back_risk = min(round((avg_trunk_lean * 1.8 + training_weighted * 1.5 + history_weighted * 0.5), 1), 100.0)

    # Overuse Risk (linked heavily to training load + fatigue indicator)
    overuse_risk = min(round((training_weighted * 4.0 + fatigue_weighted * 3.0 + history_weighted * 0.5), 1), 100.0)

    return {
        "risk_score": overall_score,
        "risk_category": category,
        "acl_risk": round(acl_risk, 1),
        "hamstring_risk": round(hamstring_risk, 1),
        "ankle_risk": round(ankle_risk, 1),
        "shoulder_risk": round(shoulder_risk, 1),
        "lower_back_risk": round(lower_back_risk, 1),
        "overuse_risk": round(overuse_risk, 1)
    }
