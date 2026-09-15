from .recommendation_engine import (
    generate_recommendations
)



def calculate_biomechanical_deviation_score(
    biomechanical_data
):
    score = 0

    knee_symmetry = biomechanical_data.get(
        "average_knee_symmetry_difference"
    )

    if knee_symmetry is not None:
        if knee_symmetry > 10:
            score += 40
        elif knee_symmetry > 5:
            score += 20

    trunk_lean = biomechanical_data.get(
        "maximum_trunk_lean"
    )

    if trunk_lean is not None:
        if trunk_lean > 20:
            score += 40
        elif trunk_lean > 10:
            score += 20

    left_alignment = abs(
        biomechanical_data.get(
            "average_left_knee_alignment",
            0
        )
    )

    right_alignment = abs(
        biomechanical_data.get(
            "average_right_knee_alignment",
            0
        )
    )

    maximum_alignment = max(
        left_alignment,
        right_alignment
    )

    if maximum_alignment > 0.15:
        score += 20
    elif maximum_alignment > 0.08:
        score += 10

    return min(score, 100)

def calculate_historical_injury_score(
    athlete_profile
):
    if athlete_profile is None:
        return 0

    if athlete_profile.previous_injury != "yes":
        return 0

    recovery_status = athlete_profile.recovery_status

    if recovery_status == "currently_injured":
        return 100

    if recovery_status == "partially_recovered":
        return 75

    if recovery_status == "fully_recovered":
        return 30

    return 50



def calculate_movement_asymmetry_score(
    biomechanical_data
):
    """
    Calculate risk score from left/right movement asymmetry.

    The score considers knee symmetry and differences
    in left/right range of motion.
    """

    score = 0

    knee_symmetry = biomechanical_data.get(
        "average_knee_symmetry_difference"
    )

    if knee_symmetry is not None:

        if knee_symmetry > 10:
            score += 50

        elif knee_symmetry > 5:
            score += 25

    left_knee_rom = biomechanical_data.get(
        "left_knee_rom"
    )

    right_knee_rom = biomechanical_data.get(
        "right_knee_rom"
    )

    if (
        left_knee_rom is not None
        and right_knee_rom is not None
    ):

        knee_rom_difference = abs(
            left_knee_rom -
            right_knee_rom
        )

        if knee_rom_difference > 15:
            score += 50

        elif knee_rom_difference > 10:
            score += 30

        elif knee_rom_difference > 5:
            score += 15

    left_hip_rom = biomechanical_data.get(
        "left_hip_rom"
    )

    right_hip_rom = biomechanical_data.get(
        "right_hip_rom"
    )

    if (
        left_hip_rom is not None
        and right_hip_rom is not None
    ):

        hip_rom_difference = abs(
            left_hip_rom -
            right_hip_rom
        )

        if hip_rom_difference > 15:
            score += 30

        elif hip_rom_difference > 10:
            score += 20

        elif hip_rom_difference > 5:
            score += 10

    return min(score, 100)

def calculate_training_load_score(
    athlete_profile
):
    """
    Calculate a prototype training-load risk score
    from weekly training hours.
    """

    if athlete_profile is None:
        return 0

    training_hours = athlete_profile.training_hours

    if training_hours is None:
        return 0

    training_hours = float(
        training_hours
    )

    if training_hours > 21:
        return 100

    if training_hours > 14:
        return 70

    if training_hours > 7:
        return 35

    return 0


def calculate_fatigue_indicator(
    biomechanical_data
):
    """
    Estimate fatigue-related movement degradation.

    The score compares movement quality between the
    early and late portions of the video.

    This is a prototype movement-based fatigue indicator
    and does not represent a clinical fatigue measurement.
    """

    early_quality = biomechanical_data.get(
        "early_movement_quality_score"
    )

    late_quality = biomechanical_data.get(
        "late_movement_quality_score"
    )

    if (
        early_quality is not None
        and late_quality is not None
    ):
        degradation = early_quality - late_quality

        if degradation <= 5:
            return 0

        if degradation <= 10:
            return 30

        if degradation <= 20:
            return 60

        return 100

    # Fallback to movement anomaly score
    # when early/late quality data is unavailable.
    anomaly_score = biomechanical_data.get(
        "movement_anomaly_score"
    )

    if anomaly_score is None:
        return 0

    return min(
        int(anomaly_score),
        100
    )


def assess_injury_risk(
    biomechanical_data,
    athlete_profile=None
):
    """
    Assess injury risk using a multi-factor rule-based model.

    Factors:
        - Biomechanical deviation: 35%
        - Historical injury: 20%
        - Movement asymmetry: 20%
        - Training load: 15%
        - Fatigue indicator: 10%

    Returns:
        dict containing overall risk, component scores,
        risk factors, and movement analysis scores.

    Note:
        Thresholds are prototype heuristics and are not
        medically validated clinical cut-offs.
    """

    # ---------------------------------------------------------
    # Calculate component scores
    # ---------------------------------------------------------

    biomechanical_score = (
        calculate_biomechanical_deviation_score(
            biomechanical_data
        )
    )

    historical_injury_score = (
        calculate_historical_injury_score(
            athlete_profile
        )
    )

    movement_asymmetry_score = (
        calculate_movement_asymmetry_score(
            biomechanical_data
        )
    )

    training_load_score = (
        calculate_training_load_score(
            athlete_profile
        )
    )

    fatigue_score = (
        calculate_fatigue_indicator(
            biomechanical_data
        )
    )

    # ---------------------------------------------------------
    # Weighted risk calculation
    # ---------------------------------------------------------

    weighted_biomechanical = (
        biomechanical_score * 0.35
    )

    weighted_history = (
        historical_injury_score * 0.20
    )

    weighted_asymmetry = (
        movement_asymmetry_score * 0.20
    )

    weighted_training = (
        training_load_score * 0.15
    )

    weighted_fatigue = (
        fatigue_score * 0.10
    )

    risk_score = round(
        weighted_biomechanical
        + weighted_history
        + weighted_asymmetry
        + weighted_training
        + weighted_fatigue
    )

    risk_score = min(
        risk_score,
        100
    )

    # ---------------------------------------------------------
    # Determine risk level
    # ---------------------------------------------------------

    if risk_score >= 60:
        risk_level = "High"

    elif risk_score >= 30:
        risk_level = "Medium"

    else:
        risk_level = "Low"

    # ---------------------------------------------------------
    # Risk factors
    # ---------------------------------------------------------

    risk_factors = []

    if biomechanical_score >= 60:
        risk_factors.append(
            "High biomechanical deviation detected."
        )

    elif biomechanical_score >= 30:
        risk_factors.append(
            "Moderate biomechanical deviation detected."
        )

    if historical_injury_score >= 75:
        risk_factors.append(
            "Previous injury history may increase risk."
        )

    elif historical_injury_score > 0:
        risk_factors.append(
            "Previous injury history detected."
        )

    if movement_asymmetry_score >= 60:
        risk_factors.append(
            "High movement asymmetry detected."
        )

    elif movement_asymmetry_score >= 30:
        risk_factors.append(
            "Moderate movement asymmetry detected."
        )

    if training_load_score >= 70:
        risk_factors.append(
            "High weekly training load detected."
        )

    elif training_load_score >= 35:
        risk_factors.append(
            "Moderate weekly training load detected."
        )

    if fatigue_score >= 60:
        risk_factors.append(
            "High movement inconsistency detected."
        )

    elif fatigue_score >= 30:
        risk_factors.append(
            "Moderate movement inconsistency detected."
        )

    if not risk_factors:
        risk_factors.append(
            "No significant risk factors detected."
        )


    recommendations = generate_recommendations(
        biomechanical_data,
        {
            "risk_breakdown": {
                "biomechanical_deviation": {
                    "score": biomechanical_score
                },
                "historical_injury": {
                    "score": historical_injury_score
                },
                "movement_asymmetry": {
                    "score": movement_asymmetry_score
                },
                "training_load": {
                    "score": training_load_score
                },
                "fatigue_indicator": {
                    "score": fatigue_score
                }
            }
        },
        athlete_profile=athlete_profile
    )
    # ---------------------------------------------------------
    # Return complete assessment
    # ---------------------------------------------------------

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_factors": risk_factors,

        "risk_breakdown": {
            "biomechanical_deviation": {
                "score": biomechanical_score,
                "weight": 35,
                "weighted_contribution":
                    round(weighted_biomechanical, 2),
            },

            "historical_injury": {
                "score": historical_injury_score,
                "weight": 20,
                "weighted_contribution":
                    round(weighted_history, 2),
            },

            "movement_asymmetry": {
                "score": movement_asymmetry_score,
                "weight": 20,
                "weighted_contribution":
                    round(weighted_asymmetry, 2),
            },

            "training_load": {
                "score": training_load_score,
                "weight": 15,
                "weighted_contribution":
                    round(weighted_training, 2),
            },

            "fatigue_indicator": {
                "score": fatigue_score,
                "weight": 10,
                "weighted_contribution":
                    round(weighted_fatigue, 2),
            },
        },

        "movement_quality_score":
            biomechanical_data.get(
                "movement_quality_score"
            ),

        "biomechanical_efficiency_score":
            biomechanical_data.get(
                "biomechanical_efficiency_score"
            ),

        "movement_anomaly_score":
            biomechanical_data.get(
                "movement_anomaly_score"
            ),

        "early_movement_quality_score":
            biomechanical_data.get(
                "early_movement_quality_score"
            ),

        "late_movement_quality_score":
            biomechanical_data.get(
                "late_movement_quality_score"
            ),
        "recommendations":
            recommendations,    
    }
    