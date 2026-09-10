import asyncio
import io
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, settings
from app.core.database import Base
from app.models import ActivityType, AthleteProfile, User, UserRole, VideoAnalysis, VideoStatus
from app.routers import auth, video
from app.services import jobs
from app.video_processing import frame_extractor as frames


@pytest.fixture
def db(tmp_path, monkeypatch):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as session:
        user = User(email="invited@example.com", full_name="Test", hashed_password="unused", role=UserRole.ATHLETE)
        session.add(AthleteProfile(user=user, sport="Football", age=22, height_cm=175, weight_kg=70))
        session.commit()
        monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
        monkeypatch.setattr(settings, "PROCESSING_MODE", "worker")
        yield session, user
    engine.dispose()


def upload(db, content=b"clip", filename="clip.mp4"):
    session, user = db
    return video.upload_video(UploadFile(filename=filename, file=io.BytesIO(content)),
                              ActivityType.JUMPING, user, session)


def test_upload_is_persisted_without_starting_api_thread(db, monkeypatch):
    submit = Mock()
    monkeypatch.setattr(video.local_executor, "submit", submit)
    result = upload(db)
    assert result.status == VideoStatus.UPLOADED
    assert len(list(settings.upload_path.iterdir())) == 1
    submit.assert_not_called()


@pytest.mark.parametrize("content,filename,status", [(b"", "a.mp4", 400), (b"x", None, 400),
                                                     (b"x", "a.exe", 400), (b"x" * 1048577, "a.mp4", 413)],
                         ids=["empty", "missing-name", "extension", "oversized"])
def test_bad_upload_does_not_leave_file_or_record(db, monkeypatch, content, filename, status):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    with pytest.raises(HTTPException) as error:
        upload(db, content, filename)
    assert error.value.status_code == status
    assert not list(settings.upload_path.iterdir())
    assert db[0].query(VideoAnalysis).count() == 0


def test_queue_limit_and_storage_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "MAX_PENDING_PER_ATHLETE", 1)
    upload(db)
    with pytest.raises(HTTPException) as error:
        upload(db)
    assert error.value.status_code == 429
    assert db[0].query(VideoAnalysis).count() == 1
    monkeypatch.setattr(settings, "MAX_PENDING_PER_ATHLETE", 2)
    monkeypatch.setattr(video.shutil, "disk_usage", lambda _: SimpleNamespace(free=0))
    with pytest.raises(HTTPException) as error:
        upload(db)
    assert error.value.status_code == 507


def test_recovery_preserves_terminal_results_and_requeues_partial_job(db):
    pending = upload(db)
    completed = upload(db)
    pending.status = VideoStatus.RUNNING_POSE
    pending.pose_frames = {"partial": True}
    completed.status = VideoStatus.COMPLETED
    completed.risk_assessment = {"score": 42}
    db[0].commit()
    jobs.recover_interrupted(db[0])
    assert pending.status == VideoStatus.UPLOADED
    assert pending.pose_frames is None
    assert completed.risk_assessment == {"score": 42}
    jobs.finish_aborted(db[0], completed.id, "timeout")
    assert completed.status == VideoStatus.COMPLETED
    jobs.finish_aborted(db[0], pending.id, "timeout")
    assert pending.status == VideoStatus.FAILED


def test_cleanup_only_terminal_files_inside_upload_directory(db, tmp_path, monkeypatch):
    item = upload(db)
    monkeypatch.setattr(settings, "DELETE_PROCESSED_UPLOADS", True)
    jobs.remove_completed_upload(db[0], item.id)
    assert list(settings.upload_path.iterdir())
    item.status = VideoStatus.COMPLETED
    db[0].commit()
    jobs.remove_completed_upload(db[0], item.id)
    assert not list(settings.upload_path.iterdir())
    outside = tmp_path / "keep.mp4"
    outside.write_bytes(b"keep")
    item.stored_path = str(outside)
    db[0].commit()
    jobs.remove_completed_upload(db[0], item.id)
    assert outside.exists()


def test_production_rejects_insecure_configuration():
    with pytest.raises(ValueError):
        Settings(_env_file=None, ENVIRONMENT="production")
    safe = dict(ENVIRONMENT="production", JWT_SECRET_KEY="a" * 64, PROCESSING_MODE="worker",
                DATABASE_HOST="postgres", CORS_ORIGINS="https://example.com")
    assert Settings(_env_file=None, **safe).ENVIRONMENT == "production"
    for key, value in [("JWT_SECRET_KEY", "short"), ("PROCESSING_MODE", "local"),
                       ("CORS_ORIGINS", "*")]:
        with pytest.raises(ValueError):
            Settings(_env_file=None, **(safe | {key: value}))


def test_production_registration_is_invitation_only(db, monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "test-secret-" * 4)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "REGISTRATION_EMAILS", "allowed@example.com")
    with pytest.raises(HTTPException) as error:
        auth._check_email_free(db[0], "stranger@example.com")
    assert error.value.status_code == 403
    from app.core.security import create_invitation
    auth._check_email_free(db[0], " ALLOWED@example.com ", create_invitation("allowed@example.com", "athlete"))


def test_storage_cleanup_race_does_not_break_upload(db, monkeypatch):
    from pathlib import Path
    vanished = Mock()
    vanished.is_file.return_value = True
    vanished.stat.side_effect = FileNotFoundError
    original = Path.iterdir
    monkeypatch.setattr(Path, "iterdir", lambda path: iter([vanished]) if path == settings.upload_path else original(path))
    assert upload(db).status == VideoStatus.UPLOADED


def test_settings_errors_do_not_echo_secrets():
    secret = "private-test-secret-" * 4
    with pytest.raises(ValueError) as error:
        Settings(_env_file=None, ENVIRONMENT="production", JWT_SECRET_KEY=secret,
                 PROCESSING_MODE="local")
    assert secret not in str(error.value)


def test_frame_limit_releases_capture(monkeypatch):
    cap = Mock()
    cap.isOpened.return_value = True
    cap.get.side_effect = lambda field: {frames.cv2.CAP_PROP_FPS: 10,
        frames.cv2.CAP_PROP_FRAME_COUNT: 0, frames.cv2.CAP_PROP_FRAME_WIDTH: 10,
        frames.cv2.CAP_PROP_FRAME_HEIGHT: 10}[field]
    cap.read.return_value = (True, np.zeros((10, 10, 3), dtype=np.uint8))
    monkeypatch.setattr(frames.cv2, "VideoCapture", lambda _: cap)
    monkeypatch.setattr(settings, "MAX_SAMPLED_FRAMES", 10)
    with pytest.raises(frames.VideoReadError, match="too many"):
        frames.extract_frames("unknown-duration.mp4", 10)
    assert cap.release.call_count == 2


def test_real_video_decode_and_duration_guard(tmp_path, monkeypatch):
    path = tmp_path / "short.avi"
    writer = frames.cv2.VideoWriter(str(path), frames.cv2.VideoWriter_fourcc(*"MJPG"), 10, (64, 64))
    assert writer.isOpened()
    for _ in range(20):
        writer.write(np.zeros((64, 64, 3), dtype=np.uint8))
    writer.release()
    decoded, metadata = frames.extract_frames(str(path), 10)
    assert len(decoded) == 20
    assert metadata["sampled_frame_count"] == 20
    streamed, streaming_meta = frames.extract_frames(str(path), 10, True)
    assert streaming_meta["sampled_frame_count"] == 0
    next(streamed)
    assert streaming_meta["sampled_frame_count"] == 1
    streamed.close()
    monkeypatch.setattr(settings, "MAX_VIDEO_SECONDS", 1)
    with pytest.raises(frames.VideoReadError, match="second"):
        frames.extract_frames(str(path), 10)
