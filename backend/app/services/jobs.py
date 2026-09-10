"""Database-backed queue; production runs exactly one dedicated worker."""
import logging
from pathlib import Path

from app.core.config import settings
from app.models import VideoAnalysis, VideoStatus

logger = logging.getLogger(__name__)
TERMINAL = (VideoStatus.COMPLETED, VideoStatus.FAILED, VideoStatus.INSUFFICIENT_DATA)


def recover_interrupted(db):
    """Called only after acquiring the worker's PostgreSQL advisory lock."""
    for video in db.query(VideoAnalysis).filter(VideoAnalysis.status.notin_(TERMINAL)).all():
        video.status = VideoStatus.UPLOADED
        video.error_message = None
        video.pose_frames = None
        video.biomechanics = None
        video.risk_assessment = None
        video.recommendations = None
        video.completed_at = None
        video.frames_with_pose_detected = None
        video.frame_count_sampled = None
        video.fps_sampled = None
    db.commit()


def finish_aborted(db, video_id, message):
    video = db.get(VideoAnalysis, video_id)
    if video and video.status not in TERMINAL:
        video.status = VideoStatus.FAILED
        video.error_message = message
        video.risk_assessment = None
        video.recommendations = None
        video.completed_at = None
        db.commit()


def remove_completed_upload(db, video_id):
    if not settings.DELETE_PROCESSED_UPLOADS:
        return
    video = db.get(VideoAnalysis, video_id)
    if video and video.status in TERMINAL:
        path = Path(video.stored_path).resolve()
        if path.parent == settings.upload_path.resolve():
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Unable to remove processed upload %s", video_id)
