from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock
import threading

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.request_limits import RequestLimits
from app.core.security import (create_access_token, create_invitation, decode_access_token,
                               hash_password, verify_invitation, verify_password)
from app.routers import auth, video, athlete
from app.schemas import RegisterCoachRequest
from app import worker


def test_tokens_and_invitations_are_not_interchangeable(monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "test-key-" * 8)
    code = create_invitation("test@example.com", "athlete")
    assert verify_invitation(code, "TEST@example.com", "athlete")
    assert not verify_invitation(code, "other@example.com", "athlete")
    assert not verify_invitation(code, "test@example.com", "coach")
    assert decode_access_token(code) is None
    token = create_access_token("user-123")
    assert decode_access_token(token) == "user-123"
    assert not verify_invitation(token, "test@example.com", "athlete")
    expired = jwt.encode({"sub": "user-123", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
                         settings.JWT_SECRET_KEY, algorithm="HS256")
    assert decode_access_token(expired) is None
    assert decode_access_token(token[:-5] + "wrong") is None


def test_bcrypt_passwords_do_not_silently_truncate():
    hashed = hash_password("correct-password")
    assert verify_password("correct-password", hashed)
    assert not verify_password("incorrect-password", hashed)
    assert not verify_password("x" * 73, hashed)
    with pytest.raises(ValueError):
        RegisterCoachRequest(email="a@example.com", full_name="A", sport="Tennis", password="é" * 40)


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    def database():
        with sessions() as session:
            yield session
    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(video.router)
    app.include_router(athlete.router)
    app.add_middleware(RequestLimits)
    app.dependency_overrides[get_db] = database
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "PROCESSING_MODE", "worker")
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "test-key-" * 8)
    monkeypatch.setattr(settings, "REGISTRATION_EMAILS", "first@example.com,second@example.com")
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
    with TestClient(app) as http:
        yield http
    engine.dispose()


def register(http, email):
    response = http.post("/api/auth/register", json={
        "email": email, "password": "correct-password", "full_name": "Athlete", "sport": "Basketball",
        "age": 22, "height_cm": 175, "weight_kg": 70,
        "invitation_code": create_invitation(email, "athlete"),
    })
    assert response.status_code == 201, response.text
    response = http.post("/api/auth/login-json", json={"email": email, "password": "correct-password"})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_registration_login_upload_history_and_ownership(client):
    first = register(client, "first@example.com")
    second = register(client, "second@example.com")
    assert client.get("/api/auth/me", headers=first).status_code == 200
    response = client.post("/api/videos/upload", headers=first,
                           data={"activity_type": "jumping"}, files={"file": ("clip.mp4", b"test", "video/mp4")})
    assert response.status_code == 201, response.text
    item = response.json()
    assert item["status"] == "uploaded"
    original = client.get(f"/api/videos/{item['id']}/original", headers=first)
    assert original.status_code == 200
    assert original.content == b"test"
    assert original.headers["cache-control"] == "private, no-store"
    assert client.get(f"/api/videos/{item['id']}/original", headers=second).status_code == 404
    assert client.get(f"/api/videos/{item['id']}/original").status_code == 401
    assert len(client.get("/api/videos", headers=first).json()) == 1
    assert client.get("/api/videos", headers=second).json() == []
    assert client.get(f"/api/videos/{item['id']}", headers=second).status_code == 404
    assert client.get(f"/api/videos/{item['id']}/pose-frames", headers=second).status_code == 404
    assert client.get("/api/videos").status_code == 401
    for uploaded in settings.upload_path.iterdir():
        uploaded.unlink()
    assert client.get(f"/api/videos/{item['id']}/original", headers=first).status_code == 404


def test_auth_throttle_and_closed_registration(client):
    for _ in range(30):
        response = client.post("/api/auth/login-json", json={"email": "none@example.com", "password": "bad"})
        assert response.status_code == 401
    response = client.post("/api/auth/login-json", json={"email": "none@example.com", "password": "bad"})
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"


def test_worker_terminates_on_lost_lock(monkeypatch):
    child = Mock()
    child.is_alive.side_effect = [True, True, False]
    context = SimpleNamespace(Process=Mock(return_value=child))
    def lost_lock():
        raise RuntimeError("connection lost")
    with pytest.raises(RuntimeError, match="connection lost"):
        worker.run_job("id", threading.Event(), context, check_lock=lost_lock)
    child.terminate.assert_called_once()


def test_worker_timeout_marks_unfinished_job_failed(monkeypatch):
    child = Mock()
    child.is_alive.side_effect = [True, True, False, False]
    context = SimpleNamespace(Process=Mock(return_value=child))
    monkeypatch.setattr(settings, "JOB_TIMEOUT_SECONDS", -1)
    session = Mock()
    session.__enter__ = Mock(return_value=session)
    session.__exit__ = Mock(return_value=False)
    monkeypatch.setattr(worker, "SessionLocal", lambda: session)
    finish = Mock()
    monkeypatch.setattr(worker, "finish_aborted", finish)
    monkeypatch.setattr(worker, "remove_completed_upload", Mock())
    worker.run_job("id", threading.Event(), context)
    child.terminate.assert_called_once()
    assert "timed out" in finish.call_args.args[2]
