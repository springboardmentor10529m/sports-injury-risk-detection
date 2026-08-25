"""Corrective Recommendation Engine.

Every recommendation returned here is triggered by a specific computed
metric crossing a documented threshold - there is no generic templated
"here are some stretches" list. If none of the thresholds are crossed, the
category returns an empty list rather than padding with filler content.
"""


def build_recommendations(biomechanics: dict, risk: dict, weekly_training_hours: float,
                           acute_chronic_ratio: float | None) -> dict:
    mobility, strength, recovery, training = [], [], [], []

    valgus = biomechanics.get("knee_valgus_avg_pct")
    if valgus is not None and valgus >= 8:
        strength.append({
            "title": "Hip abductor & glute medius strengthening",
            "reason": f"Average knee valgus deviation of {valgus}% of leg length exceeds the 8% threshold "
                      f"associated with frontal-plane knee collapse.",
            "protocol": "3 x 12 side-lying hip abductions + 3 x 10 single-leg glute bridges, per side, "
                        "4x/week.",
        })
        mobility.append({
            "title": "Ankle dorsiflexion mobility",
            "reason": "Limited ankle mobility commonly contributes to compensatory knee valgus during "
                      "landing/deceleration.",
            "protocol": "3 x 30s weight-bearing ankle wall stretch, per side, daily.",
        })

    trunk_lean = biomechanics.get("trunk_lean_avg_deg")
    if trunk_lean is not None and trunk_lean >= 15:
        strength.append({
            "title": "Core & anterior-chain stability work",
            "reason": f"Average trunk lean of {trunk_lean} deg exceeds the 15 deg threshold linked to "
                      f"increased lower-back loading during running/cutting.",
            "protocol": "3 x 45s front plank, 3 x 12 dead-bug, 3x/week.",
        })

    symmetry = biomechanics.get("symmetry_score")
    if symmetry is not None and symmetry < 85:
        strength.append({
            "title": "Unilateral strength training",
            "reason": f"Left/right movement symmetry score of {symmetry}/100 indicates meaningful "
                      f"side-to-side asymmetry.",
            "protocol": "Replace bilateral lower-body lifts with single-leg variants (split squat, "
                        "single-leg RDL) for 3-4 weeks, emphasizing the weaker side.",
        })

    hip_stability = biomechanics.get("hip_stability_score")
    if hip_stability is not None and hip_stability < 70:
        strength.append({
            "title": "Pelvic/hip stability drills",
            "reason": f"Hip stability score of {hip_stability}/100 suggests pelvic drop during the "
                      f"movement (Trendelenburg-type pattern).",
            "protocol": "3 x 10 single-leg step-downs with pelvis-level cueing, per side, 3x/week.",
        })

    fatigue = biomechanics.get("fatigue_score")
    if fatigue is not None and fatigue >= 40:
        recovery.append({
            "title": "Extended recovery window",
            "reason": f"Movement quality declined by a fatigue score of {fatigue}/100 across the clip, "
                      f"indicating the athlete was compensating by the end of the activity.",
            "protocol": "24-48 hour reduced-intensity recovery period before next high-intensity session; "
                        "prioritize sleep and hydration.",
        })

    training_component = risk["components"]["training_load_indicators"]
    if training_component >= 61:
        if acute_chronic_ratio is not None and acute_chronic_ratio > 1.3:
            training.append({
                "title": "Reduce acute training load",
                "reason": f"Acute:chronic workload ratio of {acute_chronic_ratio} is above the 1.3 "
                          f"upper bound of the recommended 0.8-1.3 range.",
                "protocol": "Reduce this week's high-intensity volume by 20-30% and re-assess ACWR next week.",
            })
        else:
            training.append({
                "title": "Reduce weekly training volume",
                "reason": f"Reported weekly training load of {weekly_training_hours} hours is high "
                          f"relative to typical safe thresholds for this profile.",
                "protocol": "Cap next week's volume increase to <10% over the prior week (standard "
                            "overuse-prevention guideline).",
            })

    overall_category = risk["risk_category"]
    if overall_category in ("HIGH", "CRITICAL"):
        recovery.append({
            "title": "Flag for professional review",
            "reason": f"Overall injury risk score is {risk['overall_risk_score']} ({overall_category}).",
            "protocol": "Recommend review by a physiotherapist or sports medicine professional before "
                        "the athlete's next high-intensity session.",
        })

    return {
        "mobility": mobility,
        "strength": strength,
        "recovery": recovery,
        "training": training,
        "note": "Decision support only - not a medical diagnosis. Clinical decisions remain with a "
                "qualified professional.",
    }
