"""
app/services/less_scorer.py
----------------------------
Landing Error Scoring System (LESS) Approximation Scorer.

Source of Truth / Primary Reference:
  Padua et al., 2009, "The Landing Error Scoring System (LESS) Is a Valid and Reliable
  Clinical Assessment Tool of Jump-Landing Biomechanics: The JUMP-ACL Study", AJSM.

Prospective Validation Cut Point Reference:
  Padua et al., 2015 / Smith et al., 2012 (LESS score >= 5 indicates elevated ACL risk in full clinical LESS).

Important Clinical & Architectural Constraints:
  - This module is an automated HEURISTIC APPROXIMATION of the LESS protocol.
  - Items that cannot be reliably computed from 2D/3D pose landmarks without specialized hardware,
    transverse calibration, high-speed camera rates, or subjective clinical judgment (Items 9, 10, 11, 16, 17)
    are marked `NOT_COMPUTABLE` with explicit rationale.
  - Partial scoring NEVER labels a result as the full 17-item clinical LESS. Classifications for partial
    evaluations include `APPROXIMATION_ONLY`.
  - Continuous knee valgus angle is preserved separately and NOT converted into an arbitrary degree threshold.
  - Left/Right symmetry ratios are kept distinct from clinical Limb Symmetry Index (LSI).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

from app.models.pose_landmark import PoseLandmark
from app.services.feature_extractor import calculate_3d_angle, calculate_trunk_angle

MIN_VISIBILITY = 0.5

# Standard LESS Reference Strings
REF_PADUA_2009 = "Padua et al., 2009 (JUMP-ACL / LESS)"
REF_VALIDATION = "Padua et al., 2015 / Smith et al., 2012"
DISCLAIMER_TEXT = (
    "Automated LESS approximation is a rule-based movement-quality screening heuristic "
    "and not a clinical diagnosis, clinician-rated LESS, or validated individual injury prediction model."
)

# Status constants
STATUS_PASS = "PASS"
STATUS_ERROR = "ERROR"
STATUS_NOT_COMPUTABLE = "NOT_COMPUTABLE"

# Classification constants
CLASS_ELEVATED_FULL = "ELEVATED_LESS_SCREENING_SCORE"
CLASS_LOWER_FULL = "LOWER_LESS_SCREENING_SCORE"
CLASS_ELEVATED_APPROX = "ELEVATED_LESS_SCREENING_SCORE_APPROXIMATION_ONLY"
CLASS_LOWER_APPROX = "LOWER_LESS_SCREENING_SCORE_APPROXIMATION_ONLY"


@dataclass
class LESSItemResult:
    """
    Result for a single LESS item (1 to 17).
    """
    item_number: int
    item_name: str
    status: str                         # "PASS", "ERROR", or "NOT_COMPUTABLE"
    score: int | None                   # 0 for PASS, 1 for ERROR (or 2 for categorical items if full), None for NOT_COMPUTABLE
    measured_value: float | None = None
    criterion_threshold: str | float | None = None
    unit: str | None = None             # e.g., "degrees", "ratio", None
    reference: str = REF_PADUA_2009
    reason: str | None = None           # Rationale when NOT_COMPUTABLE


@dataclass
class LESSResult:
    """
    Complete aggregated LESS approximation assessment result.
    """
    score: int
    max_computable_score: int
    computable_items: int
    error_items: int
    not_computable_items: int
    classification: str
    source: str = REF_PADUA_2009
    validation_source: str = REF_VALIDATION
    source_version: str = "v1"
    disclaimer: str = DISCLAIMER_TEXT
    items: list[LESSItemResult] = field(default_factory=list)


class LESSApproximationScorer:
    """
    Automated LESS-inspired / LESS-approximation scorer for double-leg drop vertical jump.
    Strictly follows Padua et al. 2009 operational definitions.
    """

    @classmethod
    def score_landmarks(
        cls,
        landmarks: Sequence[PoseLandmark],
        min_visibility: float = MIN_VISIBILITY,
    ) -> LESSResult:
        """
        Evaluate published LESS criteria on stored PoseLandmark sequence.

        Parameters
        ----------
        landmarks : Sequence[PoseLandmark]
            Database pose landmark rows for an analysis.
        min_visibility : float
            Confidence threshold below which landmarks are treated as unavailable.

        Returns
        -------
        LESSResult
            Structured LESS assessment containing 17 items, aggregated score, and classification.
        """
        # 1. Group landmarks by frame_number
        frames_map: dict[int, dict[int, PoseLandmark]] = {}
        for lm in landmarks:
            f_num = lm.frame_number
            if f_num not in frames_map:
                frames_map[f_num] = {}
            frames_map[f_num][lm.landmark_index] = lm

        sorted_frames = sorted(frames_map.keys())
        if not sorted_frames:
            return cls._build_empty_result("No landmark data available for analysis.")

        # Helper to retrieve (x, y, z) for a given frame and landmark index
        def get_pt(f_num: int, idx: int) -> tuple[float, float, float] | None:
            lm = frames_map[f_num].get(idx)
            if lm is None or lm.visibility < min_visibility:
                return None
            return (lm.x, lm.y, lm.z)

        # 2. Identify Initial Contact (IC) and Maximum Knee Flexion (MKF) frames
        # IC: Frame with lowest ankle position (highest y coordinate in image space)
        ic_frame = sorted_frames[0]
        max_ankle_y = -1.0

        for f_num in sorted_frames:
            l_ank = get_pt(f_num, 27)
            r_ank = get_pt(f_num, 28)
            y_val = max(l_ank[1] if l_ank else -1.0, r_ank[1] if r_ank else -1.0)
            if y_val > max_ankle_y:
                max_ankle_y = y_val
                ic_frame = f_num

        # Search for MKF frame (from ic_frame onwards)
        mkf_frame = ic_frame
        min_knee_angle = 999.0

        for f_num in sorted_frames:
            if f_num < ic_frame:
                continue
            l_hip, l_knee, l_ank = get_pt(f_num, 23), get_pt(f_num, 25), get_pt(f_num, 27)
            r_hip, r_knee, r_ank = get_pt(f_num, 24), get_pt(f_num, 26), get_pt(f_num, 28)

            ang_l = calculate_3d_angle(l_hip, l_knee, l_ank) if (l_hip and l_knee and l_ank) else None
            ang_r = calculate_3d_angle(r_hip, r_knee, r_ank) if (r_hip and r_knee and r_ank) else None

            angles = [a for a in (ang_l, ang_r) if a is not None]
            if angles:
                avg_angle = sum(angles) / len(angles)
                if avg_angle < min_knee_angle:
                    min_knee_angle = avg_angle
                    mkf_frame = f_num

        items: list[LESSItemResult] = []

        # --- Item 1: Knee flexion at initial contact ---
        # Padua et al., 2009: Error if knee flexion < 30° (interior angle > 150°)
        l_hip_ic, l_knee_ic, l_ank_ic = get_pt(ic_frame, 23), get_pt(ic_frame, 25), get_pt(ic_frame, 27)
        r_hip_ic, r_knee_ic, r_ank_ic = get_pt(ic_frame, 24), get_pt(ic_frame, 26), get_pt(ic_frame, 28)

        ang_l_ic = calculate_3d_angle(l_hip_ic, l_knee_ic, l_ank_ic) if (l_hip_ic and l_knee_ic and l_ank_ic) else None
        ang_r_ic = calculate_3d_angle(r_hip_ic, r_knee_ic, r_ank_ic) if (r_hip_ic and r_knee_ic and r_ank_ic) else None
        ic_knee_angles = [a for a in (ang_l_ic, ang_r_ic) if a is not None]

        if ic_knee_angles:
            avg_knee_int = sum(ic_knee_angles) / len(ic_knee_angles)
            knee_flexion_ic = round(180.0 - avg_knee_int, 2)
            is_error = knee_flexion_ic < 30.0
            items.append(LESSItemResult(
                item_number=1,
                item_name="Knee flexion at initial contact",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=knee_flexion_ic,
                criterion_threshold="< 30.0",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=1,
                item_name="Knee flexion at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required knee/hip/ankle landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 2: Hip flexion at initial contact ---
        # Padua et al., 2009: Error when thigh is approximately in line with trunk (insufficient hip flexion: interior angle >= 165°, i.e. flexion < 15°)
        l_sh_ic, r_sh_ic = get_pt(ic_frame, 11), get_pt(ic_frame, 12)
        ang_hip_l_ic = calculate_3d_angle(l_sh_ic, l_hip_ic, l_knee_ic) if (l_sh_ic and l_hip_ic and l_knee_ic) else None
        ang_hip_r_ic = calculate_3d_angle(r_sh_ic, r_hip_ic, r_knee_ic) if (r_sh_ic and r_hip_ic and r_knee_ic) else None
        ic_hip_angles = [a for a in (ang_hip_l_ic, ang_hip_r_ic) if a is not None]

        if ic_hip_angles:
            avg_hip_int = sum(ic_hip_angles) / len(ic_hip_angles)
            hip_flexion_ic = round(180.0 - avg_hip_int, 2)
            # Thigh in line with trunk when interior angle >= 165° (flexion < 15°)
            is_error = avg_hip_int >= 165.0
            items.append(LESSItemResult(
                item_number=2,
                item_name="Hip flexion at initial contact",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=hip_flexion_ic,
                criterion_threshold="thigh in line with trunk (interior angle >= 165.0°)",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=2,
                item_name="Hip flexion at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required shoulder/hip/knee landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 3: Trunk flexion at initial contact ---
        # Padua et al., 2009: Error when trunk is vertical or extended on hips at IC (inclination from vertical <= 0°)
        if l_sh_ic and r_sh_ic and l_hip_ic and r_hip_ic:
            trunk_ic = calculate_trunk_angle(l_sh_ic, r_sh_ic, l_hip_ic, r_hip_ic)
            if trunk_ic is not None:
                trunk_ic_val = round(trunk_ic, 2)
                # Error if trunk is vertical or extended (flexion <= 0°)
                is_error = trunk_ic_val <= 0.0
                items.append(LESSItemResult(
                    item_number=3,
                    item_name="Trunk flexion at initial contact",
                    status=STATUS_ERROR if is_error else STATUS_PASS,
                    score=1 if is_error else 0,
                    measured_value=trunk_ic_val,
                    criterion_threshold="vertical or extended (flexion <= 0.0°)",
                    unit="degrees",
                ))
            else:
                items.append(LESSItemResult(
                    item_number=3,
                    item_name="Trunk flexion at initial contact",
                    status=STATUS_NOT_COMPUTABLE,
                    score=None,
                    reason="Trunk vector calculation produced degenerate results at initial contact.",
                ))
        else:
            items.append(LESSItemResult(
                item_number=3,
                item_name="Trunk flexion at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required shoulder/hip landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 4: Ankle plantar-flexion / landing pattern at IC ---
        # Padua et al., 2009: Toe-to-heel contact (Pass = 0) vs Heel-to-toe/flat-foot (Error = 1)
        # Evaluated at IC by checking if foot index is below ankle in image space (y_foot > y_ankle)
        l_foot_ic, r_foot_ic = get_pt(ic_frame, 31), get_pt(ic_frame, 32)
        if l_ank_ic and r_ank_ic and l_foot_ic and r_foot_ic:
            # In image space, y increases downwards. Plantar-flexed toe-first landing has foot index y > ankle y.
            l_toe_first = l_foot_ic[1] > l_ank_ic[1]
            r_toe_first = r_foot_ic[1] > r_ank_ic[1]
            is_error = not (l_toe_first and r_toe_first)
            diff_y = round(min(l_foot_ic[1] - l_ank_ic[1], r_foot_ic[1] - r_ank_ic[1]), 4)
            items.append(LESSItemResult(
                item_number=4,
                item_name="Ankle plantar-flexion at initial contact",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=diff_y,
                criterion_threshold="flat-foot or heel-to-toe landing (toe y <= ankle y)",
                unit="spatial_y_diff",
            ))
        else:
            items.append(LESSItemResult(
                item_number=4,
                item_name="Ankle plantar-flexion at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required ankle and foot index landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 5: Medial knee position at initial contact ---
        # Padua et al., 2009: Center of patella (knee) is medial to midfoot (ankle) at IC
        if l_knee_ic and l_ank_ic and r_knee_ic and r_ank_ic:
            # In frontal view: Left knee x > Left ankle x OR Right knee x < Right ankle x
            l_medial = l_knee_ic[0] > l_ank_ic[0]
            r_medial = r_knee_ic[0] < r_ank_ic[0]
            is_error = l_medial or r_medial
            med_offset = round(max((l_knee_ic[0] - l_ank_ic[0]), (r_ank_ic[0] - r_knee_ic[0])), 4)
            items.append(LESSItemResult(
                item_number=5,
                item_name="Medial knee position at initial contact",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=med_offset,
                criterion_threshold="center of patella medial to midfoot",
                unit="spatial_ratio",
            ))
        else:
            items.append(LESSItemResult(
                item_number=5,
                item_name="Medial knee position at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required knee and ankle landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 6: Lateral trunk flexion at initial contact ---
        # Padua et al., 2009: Error when trunk midline flexed laterally to left/right (> 2.0° lateral inclination)
        if l_sh_ic and r_sh_ic and l_hip_ic and r_hip_ic:
            mid_sh_x = (l_sh_ic[0] + r_sh_ic[0]) / 2.0
            mid_sh_y = (l_sh_ic[1] + r_sh_ic[1]) / 2.0
            mid_hip_x = (l_hip_ic[0] + r_hip_ic[0]) / 2.0
            mid_hip_y = (l_hip_ic[1] + r_hip_ic[1]) / 2.0

            dx = mid_sh_x - mid_hip_x
            dy = mid_sh_y - mid_hip_y
            lat_lean_deg = round(math.degrees(math.atan2(abs(dx), abs(dy) + 1e-6)), 2)
            is_error = lat_lean_deg > 2.0
            items.append(LESSItemResult(
                item_number=6,
                item_name="Lateral trunk flexion at initial contact",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=lat_lean_deg,
                criterion_threshold="trunk midline flexed laterally (> 2.0°)",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=6,
                item_name="Lateral trunk flexion at initial contact",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required shoulder and hip landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 7: Stance width — wide ---
        # Padua et al., 2009: Error when feet greater than shoulder width (stance width > shoulder width, stance_ratio > 1.0)
        if l_sh_ic and r_sh_ic and l_ank_ic and r_ank_ic:
            sh_width = math.sqrt((l_sh_ic[0] - r_sh_ic[0]) ** 2 + (l_sh_ic[1] - r_sh_ic[1]) ** 2)
            ank_width = math.sqrt((l_ank_ic[0] - r_ank_ic[0]) ** 2 + (l_ank_ic[1] - r_ank_ic[1]) ** 2)
            if sh_width > 1e-4:
                stance_ratio = round(ank_width / sh_width, 2)
                is_error = stance_ratio > 1.0
                items.append(LESSItemResult(
                    item_number=7,
                    item_name="Stance width — wide",
                    status=STATUS_ERROR if is_error else STATUS_PASS,
                    score=1 if is_error else 0,
                    measured_value=stance_ratio,
                    criterion_threshold="feet > shoulder width (stance_ratio > 1.0)",
                    unit="ratio",
                ))
            else:
                items.append(LESSItemResult(
                    item_number=7,
                    item_name="Stance width — wide",
                    status=STATUS_NOT_COMPUTABLE,
                    score=None,
                    reason="Shoulder width calculation was zero or degenerate at initial contact.",
                ))
        else:
            items.append(LESSItemResult(
                item_number=7,
                item_name="Stance width — wide",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required shoulder and ankle landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 8: Stance width — narrow ---
        # Padua et al., 2009: Error when feet less than shoulder width (stance width < shoulder width, stance_ratio < 1.0)
        if l_sh_ic and r_sh_ic and l_ank_ic and r_ank_ic:
            sh_width = math.sqrt((l_sh_ic[0] - r_sh_ic[0]) ** 2 + (l_sh_ic[1] - r_sh_ic[1]) ** 2)
            ank_width = math.sqrt((l_ank_ic[0] - r_ank_ic[0]) ** 2 + (l_ank_ic[1] - r_ank_ic[1]) ** 2)
            if sh_width > 1e-4:
                stance_ratio = round(ank_width / sh_width, 2)
                is_error = stance_ratio < 1.0
                items.append(LESSItemResult(
                    item_number=8,
                    item_name="Stance width — narrow",
                    status=STATUS_ERROR if is_error else STATUS_PASS,
                    score=1 if is_error else 0,
                    measured_value=stance_ratio,
                    criterion_threshold="feet < shoulder width (stance_ratio < 1.0)",
                    unit="ratio",
                ))
            else:
                items.append(LESSItemResult(
                    item_number=8,
                    item_name="Stance width — narrow",
                    status=STATUS_NOT_COMPUTABLE,
                    score=None,
                    reason="Shoulder width calculation was zero or degenerate at initial contact.",
                ))
        else:
            items.append(LESSItemResult(
                item_number=8,
                item_name="Stance width — narrow",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Required shoulder and ankle landmarks missing or low visibility (< 0.5) at initial contact.",
            ))

        # --- Item 9: Foot position — external rotation ---
        items.append(LESSItemResult(
            item_number=9,
            item_name="Foot position — external rotation",
            status=STATUS_NOT_COMPUTABLE,
            score=None,
            reason="Transverse foot rotation requires foot-board calibration or multi-camera optical mocap.",
        ))

        # --- Item 10: Foot position — internal rotation ---
        items.append(LESSItemResult(
            item_number=10,
            item_name="Foot position — internal rotation",
            status=STATUS_NOT_COMPUTABLE,
            score=None,
            reason="Transverse foot rotation requires foot-board calibration or multi-camera optical mocap.",
        ))

        # --- Item 11: Symmetric initial foot contact ---
        items.append(LESSItemResult(
            item_number=11,
            item_name="Symmetric initial foot contact",
            status=STATUS_NOT_COMPUTABLE,
            score=None,
            reason="At 5 FPS video sampling rate, 200ms frame resolution is insufficient to detect millisecond initial foot contact asymmetry.",
        ))

        # --- Item 12: Knee-flexion displacement ---
        # Padua et al., 2009: Error when knee flexion displacement < 45° between IC and MKF
        l_hip_mkf, l_knee_mkf, l_ank_mkf = get_pt(mkf_frame, 23), get_pt(mkf_frame, 25), get_pt(mkf_frame, 27)
        r_hip_mkf, r_knee_mkf, r_ank_mkf = get_pt(mkf_frame, 24), get_pt(mkf_frame, 26), get_pt(mkf_frame, 28)

        ang_l_mkf = calculate_3d_angle(l_hip_mkf, l_knee_mkf, l_ank_mkf) if (l_hip_mkf and l_knee_mkf and l_ank_mkf) else None
        ang_r_mkf = calculate_3d_angle(r_hip_mkf, r_knee_mkf, r_ank_mkf) if (r_hip_mkf and r_knee_mkf and r_ank_mkf) else None
        mkf_knee_angles = [a for a in (ang_l_mkf, ang_r_mkf) if a is not None]

        if ic_knee_angles and mkf_knee_angles:
            knee_flex_ic = 180.0 - (sum(ic_knee_angles) / len(ic_knee_angles))
            knee_flex_mkf = 180.0 - (sum(mkf_knee_angles) / len(mkf_knee_angles))
            knee_disp = round(knee_flex_mkf - knee_flex_ic, 2)
            is_error = knee_disp < 45.0
            items.append(LESSItemResult(
                item_number=12,
                item_name="Knee-flexion displacement",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=knee_disp,
                criterion_threshold="< 45.0",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=12,
                item_name="Knee-flexion displacement",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Knee landmarks missing or low visibility (< 0.5) at IC or maximum knee flexion frame.",
            ))

        # --- Item 13: Hip-flexion displacement ---
        # Padua et al., 2009: Error when hip/thigh does not flex more from IC to MKF (displacement <= 0°)
        ang_hip_l_mkf = calculate_3d_angle(get_pt(mkf_frame, 11), l_hip_mkf, l_knee_mkf) if (get_pt(mkf_frame, 11) and l_hip_mkf and l_knee_mkf) else None
        ang_hip_r_mkf = calculate_3d_angle(get_pt(mkf_frame, 12), r_hip_mkf, r_knee_mkf) if (get_pt(mkf_frame, 12) and r_hip_mkf and r_knee_mkf) else None
        mkf_hip_angles = [a for a in (ang_hip_l_mkf, ang_hip_r_mkf) if a is not None]

        if ic_hip_angles and mkf_hip_angles:
            hip_flex_ic = 180.0 - (sum(ic_hip_angles) / len(ic_hip_angles))
            hip_flex_mkf = 180.0 - (sum(mkf_hip_angles) / len(mkf_hip_angles))
            hip_disp = round(hip_flex_mkf - hip_flex_ic, 2)
            is_error = hip_disp <= 0.0
            items.append(LESSItemResult(
                item_number=13,
                item_name="Hip-flexion displacement",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=hip_disp,
                criterion_threshold="hip does not flex more (displacement <= 0.0°)",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=13,
                item_name="Hip-flexion displacement",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Hip landmarks missing or low visibility (< 0.5) at IC or maximum knee flexion frame.",
            ))

        # --- Item 14: Trunk-flexion displacement ---
        # Padua et al., 2009: Error when trunk flexion does not increase from IC to MKF (displacement <= 0°)
        l_sh_mkf, r_sh_mkf = get_pt(mkf_frame, 11), get_pt(mkf_frame, 12)
        trunk_mkf = calculate_trunk_angle(l_sh_mkf, r_sh_mkf, l_hip_mkf, r_hip_mkf) if (l_sh_mkf and r_sh_mkf and l_hip_mkf and r_hip_mkf) else None

        if ('trunk_ic_val' in locals()) and (trunk_mkf is not None):
            trunk_disp = round(trunk_mkf - trunk_ic_val, 2)
            is_error = trunk_disp <= 0.0
            items.append(LESSItemResult(
                item_number=14,
                item_name="Trunk-flexion displacement",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=trunk_disp,
                criterion_threshold="trunk flexion does not increase (displacement <= 0.0°)",
                unit="degrees",
            ))
        else:
            items.append(LESSItemResult(
                item_number=14,
                item_name="Trunk-flexion displacement",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Trunk landmarks missing or low visibility (< 0.5) at IC or maximum knee flexion frame.",
            ))

        # --- Item 15: Knee-valgus displacement ---
        # Padua et al., 2009: Published geometric criterion evaluating patella position relative to great-toe/midfoot reference at MKF
        l_foot_mkf, r_foot_mkf = get_pt(mkf_frame, 31), get_pt(mkf_frame, 32)
        if l_knee_mkf and r_knee_mkf and l_foot_mkf and r_foot_mkf:
            # In frontal view: Left knee x > Left foot x OR Right knee x < Right foot x at MKF
            l_valgus = l_knee_mkf[0] > l_foot_mkf[0]
            r_valgus = r_knee_mkf[0] < r_foot_mkf[0]
            is_error = l_valgus or r_valgus
            valgus_offset = round(max((l_knee_mkf[0] - l_foot_mkf[0]), (r_foot_mkf[0] - r_knee_mkf[0])), 4)
            items.append(LESSItemResult(
                item_number=15,
                item_name="Knee-valgus displacement",
                status=STATUS_ERROR if is_error else STATUS_PASS,
                score=1 if is_error else 0,
                measured_value=valgus_offset,
                criterion_threshold="patella medial to great-toe / midfoot reference at MKF",
                unit="spatial_ratio",
            ))
        else:
            items.append(LESSItemResult(
                item_number=15,
                item_name="Knee-valgus displacement",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason="Knee and foot landmarks missing or low visibility (< 0.5) at maximum knee flexion frame.",
            ))

        # --- Item 16: Joint displacement (SOFT = 0, AVERAGE = 1, STIFF = 2) ---
        # Padua et al., 2009: Qualitative expert visual rating without published quantitative degree cutoffs.
        items.append(LESSItemResult(
            item_number=16,
            item_name="Joint displacement",
            status=STATUS_NOT_COMPUTABLE,
            score=None,
            reason="Overall joint displacement (SOFT=0, AVERAGE=1, STIFF=2) is a qualitative expert visual rating per Padua et al., 2009 without published quantitative degree thresholds.",
        ))

        # --- Item 17: Overall impression (EXCELLENT = 0, AVERAGE = 1, POOR = 2) ---
        items.append(LESSItemResult(
            item_number=17,
            item_name="Overall impression",
            status=STATUS_NOT_COMPUTABLE,
            score=None,
            reason="Overall impression is a qualitative clinical visual judgment per Padua et al., 2009.",
        ))

        # Aggregate results
        return cls._aggregate_results(items)

    @classmethod
    def _aggregate_results(cls, items: list[LESSItemResult]) -> LESSResult:
        total_score = 0
        max_computable_score = 0
        computable_count = 0
        error_count = 0
        not_computable_count = 0

        # Maximum possible error points per item in full LESS (Item 16 = 2 pts, Item 17 = 2 pts, others = 1 pt)
        item_max_points = {16: 2, 17: 2}

        for item in items:
            if item.status == STATUS_NOT_COMPUTABLE:
                not_computable_count += 1
            else:
                computable_count += 1
                max_pts = item_max_points.get(item.item_number, 1)
                max_computable_score += max_pts

                if item.status == STATUS_ERROR:
                    error_count += 1
                    total_score += (item.score if item.score is not None else 1)

        # Classification logic per prompt guidelines
        is_full_basis = (computable_count == 17)
        if is_full_basis:
            classification = (
                CLASS_ELEVATED_FULL if total_score >= 5 else CLASS_LOWER_FULL
            )
        else:
            classification = (
                CLASS_ELEVATED_APPROX if total_score >= 5 else CLASS_LOWER_APPROX
            )

        return LESSResult(
            score=total_score,
            max_computable_score=max_computable_score,
            computable_items=computable_count,
            error_items=error_count,
            not_computable_items=not_computable_count,
            classification=classification,
            source=REF_PADUA_2009,
            validation_source=REF_VALIDATION,
            source_version="v1",
            disclaimer=DISCLAIMER_TEXT,
            items=items,
        )

    @classmethod
    def _build_empty_result(cls, reason: str) -> LESSResult:
        items = [
            LESSItemResult(
                item_number=i,
                item_name=f"LESS Item {i}",
                status=STATUS_NOT_COMPUTABLE,
                score=None,
                reason=reason,
            )
            for i in range(1, 18)
        ]
        return LESSResult(
            score=0,
            max_computable_score=0,
            computable_items=0,
            error_items=0,
            not_computable_items=17,
            classification=CLASS_LOWER_APPROX,
            source=REF_PADUA_2009,
            validation_source=REF_VALIDATION,
            source_version="v1",
            disclaimer=DISCLAIMER_TEXT,
            items=items,
        )
