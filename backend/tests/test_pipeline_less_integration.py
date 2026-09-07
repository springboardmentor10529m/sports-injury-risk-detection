"""
tests/test_pipeline_less_integration.py
----------------------------------------
Integration tests verifying that run_analysis_pipeline() connects real pose landmarks
to LESSApproximationScorer and produces an in-memory LESSResult.
"""
import uuid
from unittest.mock import MagicMock, patch
from pathlib import Path

import pytest

from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.models.athlete import Athlete
from app.models.video import Video
from app.models.analysis_result import AnalysisResult, ANALYSIS_STATUS_COMPLETED
from app.core.security import get_password_hash
from app.services.analysis_pipeline import run_analysis_pipeline
from app.services.less_scorer import LESSApproximationScorer, LESSResult
from app.services.pose_estimator import BasePoseEstimator, LandmarkResult, SingleLandmark


class MockPoseEstimator(BasePoseEstimator):
    """
    Mock pose estimator that generates representative 33-landmark pose frames for IC and MKF.
    """
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def close(self):
        pass

    def process_frame(self, frame_number: int, timestamp_ms: float, image_bgr) -> LandmarkResult | None:
        landmarks = []
        # Generate 33 landmarks
        for idx in range(33):
            x, y, z = 0.5, 0.5, 0.0
            visibility = 0.9

            if frame_number == 0:
                # IC frame: ankles at bottom (y=0.9), straight legs
                if idx in (11, 12): x, y = (0.4 if idx == 11 else 0.6), 0.2  # Shoulders
                elif idx in (23, 24): x, y = (0.4 if idx == 23 else 0.6), 0.4  # Hips
                elif idx in (25, 26): x, y = (0.4 if idx == 25 else 0.6), 0.65 # Knees
                elif idx in (27, 28): x, y = (0.4 if idx == 27 else 0.6), 0.9  # Ankles
                elif idx in (31, 32): x, y = (0.4 if idx == 31 else 0.6), 0.95 # Foot index (toe first)
            else:
                # MKF frame: deep flexed squat (knees flexed, y=0.85)
                if idx in (11, 12): x, y = (0.4 if idx == 11 else 0.6), 0.35
                elif idx in (23, 24): x, y = (0.4 if idx == 23 else 0.6), 0.5
                elif idx in (25, 26): x, y = (0.4 if idx == 25 else 0.6), 0.7
                elif idx in (27, 28): x, y = (0.4 if idx == 27 else 0.6), 0.85
                elif idx in (31, 32): x, y = (0.4 if idx == 31 else 0.6), 0.88

            landmarks.append(
                SingleLandmark(
                    landmark_index=idx,
                    landmark_name=f"LM_{idx}",
                    x=x,
                    y=y,
                    z=z,
                    visibility=visibility,
                )
            )
        return LandmarkResult(frame_number=frame_number, timestamp_ms=timestamp_ms, landmarks=landmarks)


class TestPipelineLESSIntegration:

    @pytest.fixture(autouse=True)
    def setup_db(self):
        db = SessionLocal()
        self.user = User(
            name="Pipeline LESS User",
            email=f"pipeless_{uuid.uuid4().hex[:8]}@test.com",
            password=get_password_hash("TestPass123!"),
            role=RoleEnum.ATHLETE,
            is_active=True,
        )
        db.add(self.user)
        db.flush()

        self.athlete = Athlete(
            user_id=self.user.user_id,
            sport="Soccer",
            position="Midfielder",
            age=21,
            height=175.0,
            weight=70.0,
        )
        db.add(self.athlete)
        db.flush()

        self.video = Video(
            athlete_id=self.athlete.athlete_id,
            video_url="/uploads/mock_jump.mp4",
            original_filename="mock_jump.mp4",
            content_type="video/mp4",
            file_size=2048,
            processing_status="uploaded",
        )
        db.add(self.video)
        db.flush()

        self.analysis = AnalysisResult(
            video_id=self.video.video_id,
            athlete_id=self.athlete.athlete_id,
            status="PENDING",
        )
        db.add(self.analysis)
        db.commit()
        db.refresh(self.analysis)

        yield

        # Teardown
        db_td = SessionLocal()
        try:
            db_td.query(AnalysisResult).filter(AnalysisResult.video_id == self.video.video_id).delete()
            db_td.query(Video).filter(Video.video_id == self.video.video_id).delete()
            db_td.query(Athlete).filter(Athlete.user_id == self.user.user_id).delete()
            db_td.query(User).filter(User.user_id == self.user.user_id).delete()
            db_td.commit()
        finally:
            db_td.close()

    def test_a_run_analysis_pipeline_invokes_less_scorer(self):
        """
        Verify run_analysis_pipeline executes pose extraction, calls LESSApproximationScorer,
        and returns a valid LESSResult.
        """
        mock_extracted_frame1 = MagicMock(frame_number=0, timestamp_ms=0.0, image=MagicMock())
        mock_extracted_frame2 = MagicMock(frame_number=1, timestamp_ms=200.0, image=MagicMock())

        mock_extraction = MagicMock()
        mock_extraction.metadata.fps = 30.0
        mock_extraction.metadata.frame_count = 2
        mock_extraction.metadata.duration_seconds = 0.067
        mock_extraction.metadata.width = 1920
        mock_extraction.metadata.height = 1080
        mock_extraction.frames = [mock_extracted_frame1, mock_extracted_frame2]

        db = SessionLocal()
        try:
            with patch("app.services.analysis_pipeline.VideoProcessingService.process", return_value=mock_extraction):
                estimator = MockPoseEstimator()
                less_res = run_analysis_pipeline(
                    analysis_id=self.analysis.analysis_id,
                    video_url=self.video.video_url,
                    db=db,
                    pose_estimator=estimator,
                )

            assert less_res is not None
            assert isinstance(less_res, LESSResult)
            assert less_res.computable_items > 0
            assert "APPROXIMATION_ONLY" in less_res.classification
            assert len(less_res.items) == 17

            # Verify analysis record updated to COMPLETED
            ar = db.get(AnalysisResult, self.analysis.analysis_id)
            assert ar is not None
            assert ar.status == ANALYSIS_STATUS_COMPLETED
            assert ar.frames_processed == 2

            # Verify AnalysisLESS persisted to DB
            from app.models.analysis_less import AnalysisLESS
            less_db = db.query(AnalysisLESS).filter(AnalysisLESS.analysis_id == self.analysis.analysis_id).first()
            assert less_db is not None
            assert less_db.score == less_res.score
            assert less_db.classification == less_res.classification
            assert len(less_db.items) == 17
        finally:
            db.close()

    def test_b_less_scorer_failure_is_non_fatal(self):
        """
        Verify that if LESSApproximationScorer raises an exception, the background pipeline
        logs a warning without setting status to FAILED or corrupting pose/feature analysis.
        """
        mock_extracted_frame = MagicMock(frame_number=0, timestamp_ms=0.0, image=MagicMock())
        mock_extraction = MagicMock()
        mock_extraction.metadata.fps = 30.0
        mock_extraction.metadata.frame_count = 1
        mock_extraction.metadata.duration_seconds = 0.033
        mock_extraction.metadata.width = 1920
        mock_extraction.metadata.height = 1080
        mock_extraction.frames = [mock_extracted_frame]

        db = SessionLocal()
        try:
            with patch("app.services.analysis_pipeline.VideoProcessingService.process", return_value=mock_extraction), \
                 patch("app.services.analysis_pipeline.less_scorer.LESSApproximationScorer.score_landmarks", side_effect=ValueError("Scorer crash simulation")):

                estimator = MockPoseEstimator()
                less_res = run_analysis_pipeline(
                    analysis_id=self.analysis.analysis_id,
                    video_url=self.video.video_url,
                    db=db,
                    pose_estimator=estimator,
                )

            assert less_res is None
            ar = db.get(AnalysisResult, self.analysis.analysis_id)
            assert ar is not None
            assert ar.status == ANALYSIS_STATUS_COMPLETED
        finally:
            db.close()
