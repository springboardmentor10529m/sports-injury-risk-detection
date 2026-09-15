def generate_recommendations(
    biomechanical_data,
    risk_assessment,
    athlete_profile=None
):
    """
    Generate prototype corrective recommendations
    from the current movement and risk assessment.

    These recommendations are rule-based guidance for the
    project prototype and are not medical treatment advice.
    """

    recommendations = {
        "exercise_recommendations": [],
        "mobility_suggestions": [],
        "strengthening_recommendations": [],
        "recovery_planning": [],
        "training_modifications": [],
    }

    risk_breakdown = (
        risk_assessment.get(
            "risk_breakdown",
            {}
        )
    )

    biomechanical_score = (
        risk_breakdown.get(
            "biomechanical_deviation",
            {}
        ).get("score", 0)
    )

    asymmetry_score = (
        risk_breakdown.get(
            "movement_asymmetry",
            {}
        ).get("score", 0)
    )

    training_load_score = (
        risk_breakdown.get(
            "training_load",
            {}
        ).get("score", 0)
    )

    fatigue_score = (
        risk_breakdown.get(
            "fatigue_indicator",
            {}
        ).get("score", 0)
    )

    historical_injury_score = (
        risk_breakdown.get(
            "historical_injury",
            {}
        ).get("score", 0)
    )

    movement_quality = (
        biomechanical_data.get(
            "movement_quality_score"
        )
    )

    biomechanical_efficiency = (
        biomechanical_data.get(
            "biomechanical_efficiency_score"
        )
    )

    # ---------------------------------------------------------
    # Biomechanical deviation
    # ---------------------------------------------------------

    if biomechanical_score >= 60:

        recommendations[
            "exercise_recommendations"
        ].append(
            "Perform controlled movement-pattern "
            "and technique exercises."
        )

        recommendations[
            "mobility_suggestions"
        ].append(
            "Include lower-body mobility work with "
            "controlled range of motion."
        )

        recommendations[
            "strengthening_recommendations"
        ].append(
            "Prioritize controlled lower-body "
            "strengthening exercises."
        )

    elif biomechanical_score >= 30:

        recommendations[
            "exercise_recommendations"
        ].append(
            "Include movement-control and "
            "technique-focused exercises."
        )

        recommendations[
            "mobility_suggestions"
        ].append(
            "Include regular lower-body mobility "
            "exercises."
        )

        recommendations[
            "strengthening_recommendations"
        ].append(
            "Add moderate lower-body strengthening "
            "and stability exercises."
        )

    else:

        recommendations[
            "exercise_recommendations"
        ].append(
            "Continue regular movement-quality "
            "and technique exercises."
        )


    # ---------------------------------------------------------
    # Movement asymmetry
    # ---------------------------------------------------------

    if asymmetry_score >= 60:

        recommendations[
            "exercise_recommendations"
        ].append(
            "Include unilateral balance and "
            "movement-control exercises."
        )

        recommendations[
            "strengthening_recommendations"
        ].append(
            "Focus on balanced strengthening of "
            "both sides."
        )

        recommendations[
            "training_modifications"
        ].append(
            "Reduce exercises that repeatedly "
            "increase left-right movement imbalance."
        )

    elif asymmetry_score >= 30:

        recommendations[
            "exercise_recommendations"
        ].append(
            "Include single-leg balance and "
            "coordination exercises."
        )

        recommendations[
            "strengthening_recommendations"
        ].append(
            "Add unilateral strengthening to "
            "improve side-to-side control."
        )


    # ---------------------------------------------------------
    # Historical injury
    # ---------------------------------------------------------

    if historical_injury_score >= 75:

        recommendations[
            "recovery_planning"
        ].append(
            "Allow adequate recovery between "
            "high-load training sessions."
        )

        recommendations[
            "training_modifications"
        ].append(
            "Use a gradual return-to-training approach "
            "and monitor movements related to previous injury."
        )

    elif historical_injury_score > 0:

        recommendations[
            "recovery_planning"
        ].append(
            "Maintain consistent recovery and "
            "monitor previously injured areas."
        )


    # ---------------------------------------------------------
    # Training load
    # ---------------------------------------------------------

    if training_load_score >= 70:

        recommendations[
            "recovery_planning"
        ].append(
            "Increase recovery time and avoid "
            "rapid increases in weekly training volume."
        )

        recommendations[
            "training_modifications"
        ].append(
            "Reduce training intensity or volume "
            "until movement quality is stable."
        )

    elif training_load_score >= 35:

        recommendations[
            "training_modifications"
        ].append(
            "Monitor weekly training volume and "
            "increase workload gradually."
        )


    # ---------------------------------------------------------
    # Fatigue
    # ---------------------------------------------------------

    if fatigue_score >= 60:

        recommendations[
            "recovery_planning"
        ].append(
            "Prioritize recovery, rest and adequate "
            "time between demanding sessions."
        )

        recommendations[
            "training_modifications"
        ].append(
            "Reduce high-intensity training when "
            "movement quality deteriorates."
        )

    elif fatigue_score >= 30:

        recommendations[
            "recovery_planning"
        ].append(
            "Include additional recovery time when "
            "movement quality begins to decline."
        )


    # ---------------------------------------------------------
    # Movement quality
    # ---------------------------------------------------------

    if (
        movement_quality is not None
        and movement_quality < 60
    ):

        recommendations[
            "exercise_recommendations"
        ].append(
            "Focus on controlled technique and "
            "movement-quality drills."
        )


    # ---------------------------------------------------------
    # Biomechanical efficiency
    # ---------------------------------------------------------

    if (
        biomechanical_efficiency is not None
        and biomechanical_efficiency < 60
    ):

        recommendations[
            "mobility_suggestions"
        ].append(
            "Include mobility exercises targeting "
            "restricted joint movement."
        )

        recommendations[
            "exercise_recommendations"
        ].append(
            "Practice controlled full-range "
            "movement drills."
        )


    # ---------------------------------------------------------
    # Sport-specific note
    # ---------------------------------------------------------

    if athlete_profile is not None:

        sport = (
            athlete_profile.sport or ""
        ).strip().lower()

        if sport:

            recommendations[
                "training_modifications"
            ].append(
                f"Monitor movement technique during "
                f"{sport}-specific training."
            )


    # ---------------------------------------------------------
    # Default recommendations
    # ---------------------------------------------------------

    if not recommendations[
        "recovery_planning"
    ]:

        recommendations[
            "recovery_planning"
        ].append(
            "Maintain adequate recovery between "
            "training sessions."
        )


    if not recommendations[
        "training_modifications"
    ]:

        recommendations[
            "training_modifications"
        ].append(
            "Continue current training while "
            "monitoring movement quality."
        )


    # ---------------------------------------------------------
    # Remove duplicate recommendations
    # ---------------------------------------------------------

    for category in recommendations:

        recommendations[category] = list(
            dict.fromkeys(
                recommendations[category]
            )
        )


    return recommendations