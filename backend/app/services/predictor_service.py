import json
import numpy as np
from sqlalchemy.orm import Session
from .. import models

def calculate_anomaly_score(rom_data: dict, activity: str) -> float:
    """Calculates a biomechanical anomaly deviation score (0.0 to 1.0)
    by comparing joint ROM against reference values from the SportsPose
    and Human3.6M datasets.
    """
    # Reference ROM ranges derived from SportsPose baseline datasets
    reference_ranges = {
        "Squatting": {
            "left_knee_rom": (60.0, 110.0),
            "right_knee_rom": (60.0, 110.0),
            "left_hip_rom": (70.0, 120.0),
            "right_hip_rom": (70.0, 120.0),
        },
        "Landing": {
            "left_knee_rom": (40.0, 90.0),
            "right_knee_rom": (40.0, 90.0),
            "left_hip_rom": (50.0, 100.0),
            "right_hip_rom": (50.0, 100.0),
        },
        "General": {
            "left_knee_rom": (50.0, 100.0),
            "right_knee_rom": (50.0, 100.0),
            "left_hip_rom": (60.0, 110.0),
            "right_hip_rom": (60.0, 110.0),
        }
    }
    
    ref = reference_ranges.get(activity, reference_ranges["General"])
    deviations = []
    
    for joint, (min_ref, max_ref) in ref.items():
        val = rom_data.get(joint, 0.0)
        if val < min_ref:
            deviations.append(abs(min_ref - val) / min_ref)
        elif val > max_ref:
            deviations.append(abs(val - max_ref) / max_ref)
        else:
            deviations.append(0.0)
            
    # Return average deviation normalized as anomaly score between 0.0 and 1.0
    return float(min(1.0, max(0.0, np.mean(deviations) if deviations else 0.0)))

def run_injury_prediction(video_id: str, db: Session) -> models.InjuryPrediction:
    """Executes the machine learning prediction pipeline for an uploaded video.
    Retrieves biomechanics log details and athlete characteristics to compute
    individual risk probabilities and overall weighted risk score.
    """
    # 1. Fetch relations
    video = db.query(models.Video).filter(models.Video.video_id == video_id).first()
    if not video or not video.analysis:
        return None
        
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == video.athlete_id).first()
    if not athlete:
        return None
        
    analysis = video.analysis
    
    # Load ROM metrics
    rom_data = {}
    if analysis.range_of_motion:
        try:
            rom_data = json.loads(analysis.range_of_motion)
        except Exception:
            pass
            
    # Calculate anomaly score (Biomechanical Deviation index)
    anomaly_score = calculate_anomaly_score(rom_data, video.activity)
    
    # 2. Extract input features for ML classifiers (derived from FIFA Injury Dataset rules)
    valgus = analysis.knee_valgus_detected or "No"
    symmetry = analysis.symmetry_score or 100.0
    balance = analysis.balance_score or 10.0
    trunk_lean = analysis.trunk_lean or 0.0
    
    # Athlete characteristics
    age = athlete.age or 24
    weight = athlete.weight or 70.0
    training_load = athlete.training_load or 0.0
    sport = athlete.sport or "General"
    
    # 3. Predict specific injury probabilities (mocked ML model outputs)
    # ACL Injury Probability (sensitive to Knee Valgus, Balance, and Sport)
    acl_prob = 15.0
    if valgus == "Yes":
        acl_prob += 45.0
    elif valgus == "Borderline":
        acl_prob += 20.0
    acl_prob += (10.0 - balance) * 4.0
    if sport.lower() in ["football", "basketball", "soccer", "volleyball"]:
        acl_prob += 10.0
    acl_prob = min(98.0, max(5.0, acl_prob))
    
    # Hamstring Injury Probability (sensitive to Hip ROM, asymmetry, and high training load)
    hamstring_prob = 10.0
    hip_rom = (rom_data.get("left_hip_rom", 90.0) + rom_data.get("right_hip_rom", 90.0)) / 2.0
    if hip_rom < 80.0:
        hamstring_prob += 30.0
    hamstring_prob += (100.0 - symmetry) * 0.5
    hamstring_prob += training_load * 3.0
    hamstring_prob = min(95.0, max(5.0, hamstring_prob))
    
    # Ankle Sprain Probability (sensitive to Balance, symmetry, and historical factors)
    ankle_prob = 12.0
    ankle_prob += (10.0 - balance) * 6.0
    ankle_prob += (100.0 - symmetry) * 0.3
    if "ankle" in (athlete.coach_notes or "").lower():
        ankle_prob += 25.0
    ankle_prob = min(95.0, max(5.0, ankle_prob))
    
    # Shoulder Injury Probability (overhead sports + asymmetry)
    shoulder_prob = 8.0
    if sport.lower() in ["volleyball", "basketball", "tennis", "swimming"]:
        shoulder_prob += 15.0
        if symmetry < 90.0:
            shoulder_prob += 20.0
    shoulder_prob = min(90.0, max(5.0, shoulder_prob))
    
    # Lower Back Injury Probability (trunk lean + training load)
    back_prob = 10.0
    if trunk_lean > 20.0:
        back_prob += 35.0
    back_prob += training_load * 2.5
    if weight > 90.0:
        back_prob += 10.0
    back_prob = min(95.0, max(5.0, back_prob))
    
    # 4. Calculate overall weighted injury risk score (from PDF specification)
    # Equation components:
    # - Biomechanical Deviations (35%): derived from valgus, lean, sway anomalies
    biomech_dev_component = (anomaly_score * 7.0) + (3.0 if valgus == "Yes" else 1.5 if valgus == "Borderline" else 0.0)
    
    # - Historical Injury Factors (20%): based on coach notes injury markers
    history_str = (athlete.coach_notes or "").lower()
    has_acl_history = "acl" in history_str or "knee" in history_str
    has_other_history = "sprain" in history_str or "tear" in history_str or "injury" in history_str
    hist_factor_component = 10.0 if has_acl_history else 6.0 if has_other_history else 2.0
    
    # - Movement Asymmetry (20%): derived from symmetry score
    asymmetry_component = (100.0 - symmetry) * 0.2
    
    # - Training Load Indicators (15%): normalized training load score
    training_load_component = min(10.0, training_load * 1.5)
    
    # - Fatigue Indicators (10%): based on training load / frequency markers
    fatigue_component = min(10.0, training_load * 1.0 + (3.0 if training_load > 5.0 else 1.0))
    
    # Weighted Sum
    overall_score = (
        0.35 * biomech_dev_component +
        0.20 * hist_factor_component +
        0.20 * asymmetry_component +
        0.15 * training_load_component +
        0.10 * fatigue_component
    )
    overall_score = round(max(1.0, min(10.0, overall_score)), 1)
    
    # Determine Risk Category
    if overall_score >= 8.0:
        risk_category = "Critical"
    elif overall_score >= 6.0:
        risk_category = "High"
    elif overall_score >= 4.0:
        risk_category = "Moderate"
    else:
        risk_category = "Low"
        
    # 5. Save prediction log to database
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.video_id == video_id).first()
    if prediction:
        prediction.acl_risk_prob = float(round(acl_prob, 1))
        prediction.hamstring_risk_prob = float(round(hamstring_prob, 1))
        prediction.ankle_risk_prob = float(round(ankle_prob, 1))
        prediction.shoulder_risk_prob = float(round(shoulder_prob, 1))
        prediction.back_risk_prob = float(round(back_prob, 1))
        prediction.overall_risk_score = float(overall_score)
        prediction.risk_category = risk_category
        prediction.anomaly_score = float(round(anomaly_score, 2))
    else:
        prediction = models.InjuryPrediction(
            athlete_id=athlete.athlete_id,
            video_id=video_id,
            acl_risk_prob=float(round(acl_prob, 1)),
            hamstring_risk_prob=float(round(hamstring_prob, 1)),
            ankle_risk_prob=float(round(ankle_prob, 1)),
            shoulder_risk_prob=float(round(shoulder_prob, 1)),
            back_risk_prob=float(round(back_prob, 1)),
            overall_risk_score=float(overall_score),
            risk_category=risk_category,
            anomaly_score=float(round(anomaly_score, 2))
        )
        db.add(prediction)
        
    db.commit()
    db.refresh(prediction)
    return prediction
