"""Wires together frame extraction, pose estimation, biomechanics,
risk scoring and recommendations, updating the VideoAnalysis row's status at
each stage so the frontend can poll real progress (mirrors the processing
checklist in the spec: frame extraction -> pose detection -> biomechanical
analysis -> risk prediction -> recommendations)."""

import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AthleteProfile, VideoAnalysis, VideoStatus
from app.services import biomechanics as biomech_svc
from app.services import recommendations as reco_svc
from app.services import risk_scoring
from app.services.pose_estimation import PoseEstimator, frame_pose_to_json
from app.video_processing.frame_extractor import extract_frames

logger = logging.getLogger("pipeline")

_pose_estimator: PoseEstimator | None = None


def get_pose_estimator() -> PoseEstimator:
    global _pose_estimator
    if _pose_estimator is None:
        _pose_estimator = PoseEstimator()
    return _pose_estimator


def run_pipeline(video_id: str, db_session_factory) -> None:
    db: Session = db_session_factory()
    try:
        video = db.get(VideoAnalysis, video_id)
        if video is None:
            logger.error("Video %s not found for pipeline", video_id)
            return
        athlete = db.get(AthleteProfile, video.athlete_id)

        try:
            _set_status(db, video, VideoStatus.EXTRACTING_FRAMES)
            frames, video_meta = extract_frames(video.stored_path, settings.POSE_SAMPLE_FPS)
            video.fps_sampled = video_meta["effective_sample_fps"]
            video.frame_count_sampled = video_meta["sampled_frame_count"]
            db.commit()

            _set_status(db, video, VideoStatus.RUNNING_POSE)
            estimator = get_pose_estimator()
            frame_poses = estimator.process(frames)
            video.frames_with_pose_detected = sum(1 for fp in frame_poses if fp.detected)
            video.pose_frames = {"frames": [frame_pose_to_json(fp) for fp in frame_poses]}
            db.commit()

            _set_status(db, video, VideoStatus.ANALYZING_BIOMECHANICS)
            per_frame_metrics = [biomech_svc.compute_frame_metrics(fp) for fp in frame_poses]
            biomechanics_summary = biomech_svc.aggregate_biomechanics(
                per_frame_metrics, video.activity_type.value
            )
            video.biomechanics = biomechanics_summary
            db.commit()

            _set_status(db, video, VideoStatus.SCORING_RISK)
            risk = risk_scoring.compute_risk(
                biomechanics=biomechanics_summary,
                previous_injury_count=athlete.previous_injury_count,
                days_since_last_injury=athlete.days_since_last_injury,
                current_pain_flag=athlete.current_pain_flag,
                weekly_training_hours=athlete.weekly_training_hours,
                acute_chronic_ratio=athlete.acute_chronic_ratio,
            )
            video.risk_assessment = risk
            db.commit()

            _set_status(db, video, VideoStatus.GENERATING_RECOMMENDATIONS)
            recommendations = reco_svc.build_recommendations(
                biomechanics_summary, risk, athlete.weekly_training_hours, athlete.acute_chronic_ratio
            )
            video.recommendations = recommendations
            db.commit()

            from datetime import datetime
            video.status = VideoStatus.COMPLETED
            video.completed_at = datetime.utcnow()
            db.commit()

        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline failed for video %s", video_id)
            video.status = VideoStatus.FAILED
            video.error_message = str(exc)
            db.commit()
    finally:
        db.close()


def _set_status(db: Session, video: VideoAnalysis, status: VideoStatus) -> None:
    video.status = status
    db.commit()
