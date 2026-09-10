def assess_injury_risk(biomechanical_data):
    """
    Assess injury risk using predefined biomechanical rules.

    Parameters:
        biomechanical_data (dict):
            Output from biomechanical analysis.

    Returns:
        dict:
            Risk level, score, and detected risk factors.
    """

    risk_score = 0
    risk_factors = []

    # ---------------------------------------------------------
    # Rule 1: Knee asymmetry
    # ---------------------------------------------------------
    knee_symmetry_difference = biomechanical_data.get(
        "average_knee_symmetry_difference", 0
    )

    if knee_symmetry_difference > 10:
        risk_score += 30
        risk_factors.append(
            "High knee asymmetry detected."
        )

    elif knee_symmetry_difference > 5:
        risk_score += 15
        risk_factors.append(
            "Moderate knee asymmetry detected."
        )

    # ---------------------------------------------------------
    # Rule 2: Trunk lean
    # ---------------------------------------------------------
    maximum_trunk_lean = biomechanical_data.get(
        "maximum_trunk_lean", 0
    )

    if maximum_trunk_lean > 20:
        risk_score += 30
        risk_factors.append(
            "High trunk lean detected."
        )

    elif maximum_trunk_lean > 10:
        risk_score += 15
        risk_factors.append(
            "Moderate trunk lean detected."
        )

    # ---------------------------------------------------------
    # Rule 3: Left knee alignment
    # ---------------------------------------------------------
    left_knee_alignment = abs(
        biomechanical_data.get(
            "average_left_knee_alignment", 0
        )
    )

    if left_knee_alignment > 0.15:
        risk_score += 20
        risk_factors.append(
            "Abnormal left knee alignment detected."
        )

    elif left_knee_alignment > 0.08:
        risk_score += 10
        risk_factors.append(
            "Moderate left knee alignment deviation detected."
        )

    # ---------------------------------------------------------
    # Rule 4: Right knee alignment
    # ---------------------------------------------------------
    right_knee_alignment = abs(
        biomechanical_data.get(
            "average_right_knee_alignment", 0
        )
    )

    if right_knee_alignment > 0.15:
        risk_score += 20
        risk_factors.append(
            "Abnormal right knee alignment detected."
        )

    elif right_knee_alignment > 0.08:
        risk_score += 10
        risk_factors.append(
            "Moderate right knee alignment deviation detected."
        )

    # ---------------------------------------------------------
    # Limit score to 100
    # ---------------------------------------------------------
    risk_score = min(risk_score, 100)

    # ---------------------------------------------------------
    # Determine overall risk level
    # ---------------------------------------------------------
    if risk_score >= 60:
        risk_level = "High"

    elif risk_score >= 30:
        risk_level = "Medium"

    else:
        risk_level = "Low"

    # ---------------------------------------------------------
    # No risk factors
    # ---------------------------------------------------------
    if not risk_factors:
        risk_factors.append(
            "No significant biomechanical risk factors detected."
        )

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_factors": risk_factors,
    }