from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import (ActivityType, AthleteProfile, Notification, User, UserRole,
                        VideoAnalysis, VideoStatus)
from app.schemas import VideoAnalysisOut
from app.services import pipeline
from app.services.pose_estimation import FramePose


def pose(index, valid=True):
    landmarks = {
        "left_shoulder": (-0.2, -0.5, 0, 0.9), "right_shoulder": (0.2, -0.5, 0, 0.9),
        "left_hip": (-0.15, 0, 0, 0.9), "right_hip": (0.15, 0, 0, 0.9),
        "left_knee": (-0.15, 0.4, 0, 0.9), "right_knee": (0.15, 0.4, 0, 0.9),
        "left_ankle": (-0.15, 0.8, 0, 0.9), "right_ankle": (0.15, 0.8, 0, 0.9),
    }
    return FramePose(index * 100, index, valid, landmarks if valid else None,
                     landmarks if valid else None)


@pytest.fixture
def harness(monkeypatch):
    # No application startup, live database or ML artifact is touched.
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        user = User(email="phase1@example.com", full_name="Test athlete",
                    hashed_password="unused", role=UserRole.ATHLETE)
        athlete = AthleteProfile(user=user, sport="Running", age=25, height_cm=175,
                                 weight_kg=70, weekly_training_hours=0)
        video = VideoAnalysis(athlete=athlete, activity_type=ActivityType.SQUATTING,
                              original_filename="test.mp4", stored_path="unused.mp4")
        db.add(video)
        db.commit()
        video_id = video.id

    state = SimpleNamespace(frames=[pose(i) for i in range(10)], error=None, closed=0)

    def extract(*args):
        return [], {"effective_sample_fps": 10, "sampled_frame_count": len(state.frames)}

    class Estimator:
        def process(self, frames, on_progress, progress_every):
            if state.error:
                raise state.error
            on_progress(state.frames)
            return state.frames

        def close(self):
            state.closed += 1

    monkeypatch.setattr(pipeline, "extract_frames", extract)
    monkeypatch.setattr(pipeline, "get_pose_estimator", Estimator)
    state.run = lambda: pipeline.run_pipeline(video_id, sessions)
    state.sessions = sessions
    state.video_id = video_id
    yield state
    engine.dispose()


@pytest.mark.parametrize("valid,total", [(0, 10), (9, 9), (10, 21)])
def test_insufficient_frames_never_score_or_recommend(harness, monkeypatch, valid, total):
    harness.frames = [pose(i, i < valid) for i in range(total)]
    score = Mock(side_effect=AssertionError("Must not score insufficient poses"))
    recommendations = Mock(side_effect=AssertionError("Must not recommend for insufficient poses"))
    monkeypatch.setattr(pipeline.risk_scoring, "compute_risk", score)
    monkeypatch.setattr(pipeline.reco_svc, "build_recommendations", recommendations)
    harness.run()
    with harness.sessions() as db:
        video = db.get(VideoAnalysis, harness.video_id)
        assert video.status == VideoStatus.INSUFFICIENT_DATA
        assert VideoAnalysisOut.model_validate(video).model_dump(mode="json")["status"] == "insufficient_data"
        assert video.risk_assessment is None
        assert video.recommendations is None
        assert video.completed_at is None
        assert "Insufficient data" in video.error_message
        assert video.biomechanics["frames_with_pose"] == valid
        assert [n.title for n in db.query(Notification).all()] == ["Insufficient data"]
    score.assert_not_called()
    recommendations.assert_not_called()
    assert harness.closed == 1


@pytest.mark.parametrize("defect", ["missing", "visibility", "nan", "infinite", "degenerate"])
def test_unusable_landmarks_are_insufficient_data(harness, defect):
    for frame in harness.frames:
        if defect == "missing":
            del frame.world_landmarks["left_ankle"]
        elif defect == "visibility":
            frame.world_landmarks["left_ankle"] = (-0.15, 0.8, 0, 0.49)
        elif defect == "nan":
            frame.world_landmarks["left_ankle"] = (float("nan"), 0.8, 0, 0.9)
        elif defect == "infinite":
            frame.world_landmarks["left_ankle"] = (float("inf"), 0.8, 0, 0.9)
        else:
            frame.world_landmarks["left_ankle"] = frame.world_landmarks["left_knee"]
    harness.run()
    with harness.sessions() as db:
        video = db.get(VideoAnalysis, harness.video_id)
        assert video.status == VideoStatus.INSUFFICIENT_DATA
        assert video.risk_assessment is None


@pytest.mark.parametrize("total", [10, 20])
def test_quality_threshold_accepts_valid_frames(harness, total):
    harness.frames = [pose(i, i < 10) for i in range(total)]
    harness.run()
    with harness.sessions() as db:
        video = db.get(VideoAnalysis, harness.video_id)
        assert video.status == VideoStatus.COMPLETED
        assert video.risk_assessment["overall_risk_score"] == 0
        assert video.completed_at is not None
    assert harness.closed == 1


@pytest.mark.parametrize("outcome", ["completed", "failed", "insufficient_data"])
def test_notification_failure_preserves_committed_outcome(harness, monkeypatch, outcome):
    if outcome == "failed":
        harness.error = RuntimeError("Pose processing failed")
    elif outcome == "insufficient_data":
        harness.frames = [pose(i, False) for i in range(10)]

    def fail_notification(db, video):
        # Also test rollback of an actual failed SQLAlchemy flush.
        db.add(User(full_name="Missing required fields", role=UserRole.ATHLETE))
        db.flush()

    notify = Mock(side_effect=fail_notification)
    monkeypatch.setattr(pipeline.notif_svc, "notify_after_pipeline", notify)
    harness.run()
    with harness.sessions() as db:
        video = db.get(VideoAnalysis, harness.video_id)
        assert video.status.value == outcome
        if outcome == "completed":
            assert video.completed_at is not None
            assert video.risk_assessment is not None
            assert video.recommendations is not None
            assert video.error_message is None
        else:
            assert video.risk_assessment is None
            assert video.error_message
        assert db.query(User).count() == 1
    notify.assert_called_once()
    assert harness.closed == 1
