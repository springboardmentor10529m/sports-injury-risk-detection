"""Injury Risk Prediction Engine.

Implements the exact weighted model specified in the project doc:

    Injury Risk Score =
        Biomechanical Deviations   (35%) +
        Historical Injury Factors  (20%) +
        Movement Asymmetry         (20%) +
        Training Load Indicators   (15%) +
        Fatigue Indicators         (10%)

Each term is a deterministic 0-100 sub-score computed from real inputs
(the video's own biomechanics output + the athlete's profile). There is no
trained ML model behind this - by design, per project scope - so every
number here is traceable to a specific rule below.

Reference ranges cited inline are widely used sports-biomechanics/sports-
science heuristics (e.g. Hewett et al. on knee valgus and ACL risk;
Gabbett 2016 on acute:chronic workload ratio). They inform thresholds, not a
clinical diagnosis.
"""

WEIGHTS = {
    "biomechanical_deviation": 0.35,
    "historical_injury": 0.20,
    "movement_asymmetry": 0.20,
    "training_load": 0.15,
    "fatigue": 0.10,
}

def risk_category(score: float) -> str:
    """Continuous bands: [0, 35], (35, 60], (60, 80], (80, 100]."""
    if not 0 <= score <= 100:
        raise ValueError("Risk score must be finite and between 0 and 100.")
    if score <= 35:
        return "LOW"
    if score <= 60:
        return "MODERATE"
    if score <= 80:
        return "HIGH"
    return "CRITICAL"


def _clip(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def biomechanical_deviation_score(biomechanics: dict) -> float:
    """0-100, higher = more deviation from normal movement patterns.
    Combines knee valgus, trunk lean and hip-line stability deviations
    against commonly cited thresholds."""
    sub_scores = []

    valgus = biomechanics.get("knee_valgus_avg_pct")
    if valgus is not None:
        # >8% of leg length lateral deviation is treated as the start of an
        # abnormal frontal-plane collapse pattern; scale to 100 at 20%.
        sub_scores.append(_clip((valgus - 4) / (20 - 4) * 100))

    trunk_lean = biomechanics.get("trunk_lean_avg_deg")
    if trunk_lean is not None:
        # Mild forward lean is normal in running; >12-15 deg sustained lean
        # is commonly flagged. Scale to 100 at 30 deg.
        sub_scores.append(_clip((trunk_lean - 8) / (30 - 8) * 100))

    hip_std = biomechanics.get("hip_line_angle_std_deg")
    if hip_std is not None:
        # Pelvic-obliquity variability; scale to 100 at 15 deg std dev.
        sub_scores.append(_clip((hip_std - 2) / (15 - 2) * 100))

    if not sub_scores:
        return 0.0
    return round(sum(sub_scores) / len(sub_scores), 2)


def historical_injury_score(previous_injury_count: int, days_since_last_injury: int | None,
                             current_pain_flag: bool) -> float:
    """0-100, higher = more historical risk. Deterministic, documented rule -
    not a prediction model."""
    score = min(60.0, previous_injury_count * 15.0)

    if days_since_last_injury is not None:
        # Injuries within the last ~12 months carry the most re-injury risk
        # and decay linearly afterward, per general re-injury literature.
        recency = _clip(40.0 - (days_since_last_injury / 365.0) * 40.0, 0, 40)
        score += recency

    if current_pain_flag:
        score += 25.0

    return round(_clip(score), 2)


def movement_asymmetry_score(biomechanics: dict) -> float:
    """0-100, higher = more asymmetric. Directly derived from the
    symmetry_score already computed by the biomechanics engine."""
    symmetry = biomechanics.get("symmetry_score")
    if symmetry is None:
        return 0.0
    return round(_clip(100 - symmetry), 2)


def training_load_score(weekly_training_hours: float, acute_chronic_ratio: float | None) -> float:
    """0-100, higher = higher load-related risk.

    If an acute:chronic workload ratio (ACWR) is available, uses the
    well-established "sweet spot" 0.8-1.3 from Gabbett (2016): risk climbs
    sharply outside that band, especially above ~1.5.
    Otherwise falls back to weekly training hours against a generic
    high-load threshold.
    """
    if acute_chronic_ratio is not None:
        if 0.8 <= acute_chronic_ratio <= 1.3:
            return round(_clip((abs(acute_chronic_ratio - 1.05) / 0.25) * 20), 2)
        distance = abs(acute_chronic_ratio - 1.05)
        return round(_clip(20 + distance * 60), 2)

    # Fallback: 0 hrs -> 0 risk, 20+ hrs/week -> 100 (generic high-volume flag).
    return round(_clip((weekly_training_hours / 20.0) * 100), 2)


def fatigue_score(biomechanics: dict) -> float:
    """0-100, higher = more fatigue-related decline observed within THIS
    video's own frame sequence (see biomechanics.aggregate_biomechanics)."""
    f = biomechanics.get("fatigue_score")
    return round(_clip(f), 2) if f is not None else 0.0


def compute_risk(
    biomechanics: dict,
    previous_injury_count: int,
    days_since_last_injury: int | None,
    current_pain_flag: bool,
    weekly_training_hours: float,
    acute_chronic_ratio: float | None,
) -> dict:
    biomech = biomechanical_deviation_score(biomechanics)
    historical = historical_injury_score(previous_injury_count, days_since_last_injury, current_pain_flag)
    asymmetry = movement_asymmetry_score(biomechanics)
    training = training_load_score(weekly_training_hours, acute_chronic_ratio)
    fatigue = fatigue_score(biomechanics)

    overall = (
        biomech * WEIGHTS["biomechanical_deviation"]
        + historical * WEIGHTS["historical_injury"]
        + asymmetry * WEIGHTS["movement_asymmetry"]
        + training * WEIGHTS["training_load"]
        + fatigue * WEIGHTS["fatigue"]
    )
    overall = round(_clip(overall), 2)

    category = risk_category(overall)

    # Per-injury-type flags derived from which biomechanical signals are
    # driving the score - transparent, rule-based, tied to the doc's injury
    # categories (ACL, hamstring, ankle, lower back, overuse).
    injury_area_flags = _injury_area_flags(biomechanics, training, fatigue)

    return {
        "overall_risk_score": overall,
        "risk_category": category,
        "components": {
            "biomechanical_deviation": biomech,
            "historical_injury_factors": historical,
            "movement_asymmetry": asymmetry,
            "training_load_indicators": training,
            "fatigue_indicators": fatigue,
        },
        "weights": WEIGHTS,
        "injury_area_flags": injury_area_flags,
    }


def _injury_area_flags(biomechanics: dict, training_score: float, fatigue_score_val: float) -> dict:
    valgus = biomechanics.get("knee_valgus_avg_pct") or 0
    trunk = biomechanics.get("trunk_lean_avg_deg") or 0
    symmetry = biomechanics.get("symmetry_score")
    symmetry = symmetry if symmetry is not None else 100

    def level(score):
        if score >= 61:
            return "HIGH"
        if score >= 36:
            return "MODERATE"
        return "LOW"

    return {
        "acl": level(_clip((valgus - 4) / 16 * 100)),
        "hamstring": level(_clip((100 - symmetry))),
        "ankle": level(_clip((valgus - 6) / 14 * 100 * 0.6)),
        "lower_back": level(_clip((trunk - 8) / 22 * 100)),
        "overuse": level(_clip(max(training_score, fatigue_score_val))),
    }
