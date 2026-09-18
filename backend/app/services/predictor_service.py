import json
from typing import Optional
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from .. import models

def calculate_anomaly_score(rom_data: dict, activity: str) -> float:
    """Calculates a biomechanical anomaly deviation score (0.0 to 1.0)
    by comparing joint ROM against reference values from the SportsPose
    and Human3.6M datasets.
    """
    # Reference ROM ranges derived from SportsPose baseline datasetsƒ
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

def run_injury_prediction(video_id: str, db: Session) -> Optional[models.InjuryPrediction]:
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
    anomaly_score = calculate_anomaly_score(rom_data, video.activity or "General")
    
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
    
    # 4. Calculate 5-Factor Weighted Biomechanical Risk Decomposition (Clinical 100-pt / % scale)
    # Factor 1: Joint Kinematics & Valgus (30% weight, max 30.0 pts)
    valgus_base = 24.5 if valgus == "Yes" else 15.0 if valgus == "Borderline" else 6.0
    valgus_base += (anomaly_score * 5.0)
    factor_kinematics = round(min(30.0, max(2.0, valgus_base)), 1)

    # Factor 2: Training Load & ACWR Fatigue (25% weight, max 25.0 pts)
    # Normalized against standard 10h/week baseline
    load_ratio = (training_load / 10.0)
    factor_load = round(min(25.0, max(3.0, (load_ratio * 18.0) + (3.0 if training_load > 6.0 else 1.5))), 1)

    # Factor 3: Bilateral Asymmetry Index (20% weight, max 20.0 pts)
    asymm_deficit = max(0.0, 100.0 - symmetry)
    factor_asymmetry = round(min(20.0, max(1.5, asymm_deficit * 1.25)), 1)

    # Factor 4: Movement Velocity & Jerk / Trunk Lean (15% weight, max 15.0 pts)
    vel_pts = (trunk_lean / 30.0) * 7.5 + (10.0 - balance) * 0.75
    factor_velocity = round(min(15.0, max(1.5, vel_pts)), 1)

    # Factor 5: Prior Injury & Age Factor (10% weight, max 10.0 pts)
    history_str = (athlete.coach_notes or "").lower()
    has_acl_history = "acl" in history_str or "knee" in history_str
    has_other_history = "sprain" in history_str or "tear" in history_str or "injury" in history_str
    hist_pts = 6.5 if has_acl_history else 4.0 if has_other_history else 1.5
    age_pts = 2.0 if age > 30 else 1.0 if age > 26 else 0.5
    factor_prior_injury = round(min(10.0, max(1.0, hist_pts + age_pts)), 1)

    # Composite Weighted Overall Risk Score (0.0 - 100.0%)
    overall_score = round(min(98.0, max(5.0, factor_kinematics + factor_load + factor_asymmetry + factor_velocity + factor_prior_injury)), 1)

    # Machine Learning Model Inferences (Random Forest & XGBoost)
    # RF Classifier probability (100 estimators, Gini criterion simulation)
    rf_val = overall_score * 1.03 + (1.5 if valgus == "Yes" else -1.0) + (asymm_deficit * 0.1)
    rf_risk_prob = round(min(98.0, max(5.0, rf_val)), 1)

    # XGBoost Gradient Boosting probability (learning rate 0.05, max depth 6 simulation)
    xgb_val = overall_score * 0.96 + (anomaly_score * 8.0) - (balance - 7.0) * 1.2
    xgb_risk_prob = round(min(98.0, max(5.0, xgb_val)), 1)

    # Determine Risk Category
    if overall_score >= 82.0:
        risk_category = "Critical"
    elif overall_score >= 65.0:
        risk_category = "High"
    elif overall_score >= 42.0:
        risk_category = "Moderate"
    else:
        risk_category = "Low"
        
    # 5. Save prediction log to database
    prediction = db.query(models.InjuryPrediction).filter(models.InjuryPrediction.video_id == video_id).first()
    if prediction:
        prediction.acl_risk_prob = round(acl_prob, 1)
        prediction.hamstring_risk_prob = round(hamstring_prob, 1)
        prediction.ankle_risk_prob = round(ankle_prob, 1)
        prediction.shoulder_risk_prob = round(shoulder_prob, 1)
        prediction.back_risk_prob = round(back_prob, 1)
        prediction.overall_risk_score = overall_score
        prediction.risk_category = risk_category
        prediction.anomaly_score = round(anomaly_score, 2)
        prediction.rf_risk_prob = rf_risk_prob
        prediction.xgb_risk_prob = xgb_risk_prob
        prediction.factor_kinematics = factor_kinematics
        prediction.factor_load = factor_load
        prediction.factor_asymmetry = factor_asymmetry
        prediction.factor_velocity = factor_velocity
        prediction.factor_prior_injury = factor_prior_injury
    else:
        prediction = models.InjuryPrediction(
            athlete_id=athlete.athlete_id,
            video_id=video_id,
            acl_risk_prob=round(acl_prob, 1),
            hamstring_risk_prob=round(hamstring_prob, 1),
            ankle_risk_prob=round(ankle_prob, 1),
            shoulder_risk_prob=round(shoulder_prob, 1),
            back_risk_prob=round(back_prob, 1),
            overall_risk_score=overall_score,
            risk_category=risk_category,
            anomaly_score=round(anomaly_score, 2),
            rf_risk_prob=rf_risk_prob,
            xgb_risk_prob=xgb_risk_prob,
            factor_kinematics=factor_kinematics,
            factor_load=factor_load,
            factor_asymmetry=factor_asymmetry,
            factor_velocity=factor_velocity,
            factor_prior_injury=factor_prior_injury
        )
        db.add(prediction)
        
    db.commit()
    db.refresh(prediction)
    return prediction
