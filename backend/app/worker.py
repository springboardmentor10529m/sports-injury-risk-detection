"""Run with python -m app.worker. One queue consumer, isolated timed jobs."""
import logging
import multiprocessing
import signal
import threading

from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import VideoAnalysis, VideoStatus
from app.services.jobs import finish_aborted, recover_interrupted, remove_completed_upload

logger = logging.getLogger(__name__)


def process_video(video_id):
    from app.services.pipeline import run_pipeline
    run_pipeline(video_id, SessionLocal)


def run_job(video_id, stop, context=None, check_lock=None):
    context = context or multiprocessing.get_context("spawn")
    child = context.Process(target=process_video, args=(video_id,))
    child.start()
    try:
        import time
        deadline = time.monotonic() + settings.JOB_TIMEOUT_SECONDS
        while child.is_alive() and not stop.is_set() and time.monotonic() < deadline:
            child.join(timeout=1)
            if check_lock:
                check_lock()
        if stop.is_set():
            return  # the next worker recovers this persisted job
        timed_out = child.is_alive()
        if timed_out:
            child.terminate()
            child.join(timeout=5)
            if child.is_alive():
                child.kill()
                child.join()
        with SessionLocal() as db:
            finish_aborted(db, video_id, "Video processing timed out. Try a shorter clip." if timed_out
                           else "Video processing stopped unexpectedly. Please retry.")
            remove_completed_upload(db, video_id)
    finally:
        if child.is_alive():
            child.terminate()
            child.join(timeout=5)
            if child.is_alive():
                child.kill()
                child.join()


def main():
    logging.basicConfig(level=logging.INFO)
    if engine.dialect.name != "postgresql":
        raise RuntimeError("The dedicated worker requires PostgreSQL")
    stop = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stop.set())
    # Session-level advisory lock survives commits and prevents two consumers.
    with engine.connect() as lock:
        if not lock.scalar(text("SELECT pg_try_advisory_lock(73190421)")):
            raise RuntimeError("Another video worker is already running")
        with SessionLocal() as db:
            recover_interrupted(db)
            for video_id, in db.query(VideoAnalysis.id).filter(VideoAnalysis.status.in_(
                    [VideoStatus.COMPLETED, VideoStatus.FAILED, VideoStatus.INSUFFICIENT_DATA])).all():
                remove_completed_upload(db, video_id)
        while not stop.is_set():
            lock.execute(text("SELECT 1"))  # fail closed if the lock connection is lost
            with SessionLocal() as db:
                row = db.query(VideoAnalysis.id).filter(VideoAnalysis.status == VideoStatus.UPLOADED).order_by(
                    VideoAnalysis.created_at).first()
            if row:
                logger.info("Processing video %s", row.id)
                run_job(row.id, stop, check_lock=lambda: lock.execute(text("SELECT 1")))
            else:
                stop.wait(2)


if __name__ == "__main__":
    main()
