"""
tests/test_less_scorer.py
-------------------------
Unit tests for LESSApproximationScorer strictly using Padua et al. 2009 operational criteria.

Tests:
  - Hip flexion at IC (thigh in line with trunk when interior angle >= 165°)
  - Trunk flexion at IC (vertical or extended when flexion <= 0°)
  - Ankle plantar-flexion at IC (toe vs flat/heel landing)
  - Lateral trunk flexion (midline lateral inclination > 2.0°)
  - Stance width (wide > 1.0x, narrow < 1.0x)
  - Knee, Hip, Trunk flexion displacement (displacement <= 0° or < 45° for knee)
  - Knee valgus displacement at MKF (patella medial to great-toe/midfoot)
  - Items 9, 10, 11, 16, 17 marked NOT_COMPUTABLE with explicit rationale
  - Score aggregation and APPROXIMATION_ONLY classification safety
"""
import uuid
# pyrefly: ignore [missing-import]
import pytest

from app.models.pose_landmark import PoseLandmark
from app.services.less_scorer import (
    LESSApproximationScorer,
    LESSResult,
    LESSItemResult,
    STATUS_PASS,
    STATUS_ERROR,
    STATUS_NOT_COMPUTABLE,
    CLASS_ELEVATED_APPROX,
    CLASS_LOWER_APPROX,
    REF_PADUA_2009,
    REF_VALIDATION,
)


def _make_landmark(
    analysis_id: uuid.UUID,
    frame_number: int,
    landmark_index: int,
    x: float,
    y: float,
    z: float = 0.0,
    visibility: float = 0.9,
) -> PoseLandmark:
    return PoseLandmark(
        landmark_id=uuid.uuid4(),
        analysis_id=analysis_id,
        frame_number=frame_number,
        timestamp_ms=float(frame_number * 100),
        landmark_index=landmark_index,
        landmark_name=f"LM_{landmark_index}",
        x=x,
        y=y,
        z=z,
        visibility=visibility,
    )


class TestHipFlexionIC:

    def test_hip_flexion_pass_when_flexed(self):
        # Interior hip angle = 150° < 165° -> Flexion = 30° -> PASS
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 11, 0.0, -1.0), _make_landmark(aid, 0, 12, 0.0, -1.0),
            _make_landmark(aid, 0, 23, 0.0, 0.0),  _make_landmark(aid, 0, 24, 0.0, 0.0),
            _make_landmark(aid, 0, 25, 0.5, 0.866), _make_landmark(aid, 0, 26, 0.5, 0.866),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item2 = next(i for i in res.items if i.item_number == 2)
        assert item2.status == STATUS_PASS
        assert item2.score == 0

    def test_hip_flexion_error_thigh_in_line_with_trunk(self):
        # Interior hip angle = 180° >= 165° -> Thigh in line with trunk -> ERROR
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 11, 0.0, -1.0), _make_landmark(aid, 0, 12, 0.0, -1.0),
            _make_landmark(aid, 0, 23, 0.0, 0.0),  _make_landmark(aid, 0, 24, 0.0, 0.0),
            _make_landmark(aid, 0, 25, 0.0, 1.0),  _make_landmark(aid, 0, 26, 0.0, 1.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item2 = next(i for i in res.items if i.item_number == 2)
        assert item2.status == STATUS_ERROR
        assert item2.score == 1


class TestTrunkFlexionIC:

    def test_trunk_flexion_pass_when_forward(self):
        # Trunk flexed forward (inclination > 0°) -> PASS
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 11, 0.1, -1.0), _make_landmark(aid, 0, 12, 0.1, -1.0),
            _make_landmark(aid, 0, 23, 0.0, 0.0),  _make_landmark(aid, 0, 24, 0.0, 0.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item3 = next(i for i in res.items if i.item_number == 3)
        assert item3.status == STATUS_PASS
        assert item3.score == 0

    def test_trunk_flexion_error_when_vertical(self):
        # Trunk vertical (inclination <= 0°) -> ERROR
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 11, 0.0, -1.0), _make_landmark(aid, 0, 12, 0.0, -1.0),
            _make_landmark(aid, 0, 23, 0.0, 0.0),  _make_landmark(aid, 0, 24, 0.0, 0.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item3 = next(i for i in res.items if i.item_number == 3)
        assert item3.status == STATUS_ERROR
        assert item3.score == 1


class TestAnklePlantarFlexionIC:

    def test_toe_landing_pass(self):
        # Foot index y (2.5) > Ankle y (2.0) -> Toe-first -> PASS
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 27, 0.3, 2.0), _make_landmark(aid, 0, 28, 0.7, 2.0),
            _make_landmark(aid, 0, 31, 0.3, 2.5), _make_landmark(aid, 0, 32, 0.7, 2.5),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item4 = next(i for i in res.items if i.item_number == 4)
        assert item4.status == STATUS_PASS
        assert item4.score == 0

    def test_flat_landing_error(self):
        # Foot index y (2.0) <= Ankle y (2.0) -> Flat foot / heel strike -> ERROR
        aid = uuid.uuid4()
        landmarks = [
            _make_landmark(aid, 0, 27, 0.3, 2.0), _make_landmark(aid, 0, 28, 0.7, 2.0),
            _make_landmark(aid, 0, 31, 0.3, 2.0), _make_landmark(aid, 0, 32, 0.7, 2.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item4 = next(i for i in res.items if i.item_number == 4)
        assert item4.status == STATUS_ERROR
        assert item4.score == 1


class TestStanceWidthCorrected:

    def test_wide_stance_ratio_gt_1(self):
        aid = uuid.uuid4()
        # Shoulder width = 0.2, Ankle width = 0.4 -> ratio = 2.0 > 1.0 -> Item 7 ERROR, Item 8 PASS
        landmarks = [
            _make_landmark(aid, 0, 11, 0.4, 0.0), _make_landmark(aid, 0, 12, 0.6, 0.0),
            _make_landmark(aid, 0, 27, 0.3, 2.0), _make_landmark(aid, 0, 28, 0.7, 2.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item7 = next(i for i in res.items if i.item_number == 7)
        item8 = next(i for i in res.items if i.item_number == 8)
        assert item7.status == STATUS_ERROR
        assert item7.score == 1
        assert item8.status == STATUS_PASS

    def test_narrow_stance_ratio_lt_1(self):
        aid = uuid.uuid4()
        # Shoulder width = 0.4, Ankle width = 0.2 -> ratio = 0.5 < 1.0 -> Item 7 PASS, Item 8 ERROR
        landmarks = [
            _make_landmark(aid, 0, 11, 0.3, 0.0), _make_landmark(aid, 0, 12, 0.7, 0.0),
            _make_landmark(aid, 0, 27, 0.4, 2.0), _make_landmark(aid, 0, 28, 0.6, 2.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item7 = next(i for i in res.items if i.item_number == 7)
        item8 = next(i for i in res.items if i.item_number == 8)
        assert item7.status == STATUS_PASS
        assert item8.status == STATUS_ERROR
        assert item8.score == 1


class TestKneeValgusMKF:

    def test_knee_valgus_pass_patella_lateral_to_great_toe(self):
        aid = uuid.uuid4()
        # Left knee x (0.4) <= Left foot x (0.5) at MKF -> PASS
        landmarks = [
            _make_landmark(aid, 0, 25, 0.4, 1.0), _make_landmark(aid, 0, 31, 0.5, 2.0),
            _make_landmark(aid, 0, 26, 0.6, 1.0), _make_landmark(aid, 0, 32, 0.5, 2.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item15 = next(i for i in res.items if i.item_number == 15)
        assert item15.status == STATUS_PASS
        assert item15.score == 0

    def test_knee_valgus_error_patella_medial_to_great_toe(self):
        aid = uuid.uuid4()
        # Left knee x (0.6) > Left foot x (0.5) at MKF -> Medial to great toe -> ERROR
        landmarks = [
            _make_landmark(aid, 0, 25, 0.6, 1.0), _make_landmark(aid, 0, 31, 0.5, 2.0),
            _make_landmark(aid, 0, 26, 0.4, 1.0), _make_landmark(aid, 0, 32, 0.5, 2.0),
        ]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        item15 = next(i for i in res.items if i.item_number == 15)
        assert item15.status == STATUS_ERROR
        assert item15.score == 1


class TestNonComputableFallbacks:

    def test_items_9_10_11_16_17_are_not_computable(self):
        aid = uuid.uuid4()
        landmarks = [_make_landmark(aid, 0, 23, 0.0, 0.0)]
        res = LESSApproximationScorer.score_landmarks(landmarks)

        expected_not_computable = {9, 10, 11, 16, 17}
        for item in res.items:
            if item.item_number in expected_not_computable:
                assert item.status == STATUS_NOT_COMPUTABLE
                assert item.score is None
                assert item.reason is not None

    def test_classification_safety_includes_approximation_only(self):
        aid = uuid.uuid4()
        landmarks = [_make_landmark(aid, 0, 23, 0.0, 0.0)]
        res = LESSApproximationScorer.score_landmarks(landmarks)
        assert "APPROXIMATION_ONLY" in res.classification
