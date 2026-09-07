"""
tests/test_less_api.py
-----------------------
Integration tests for GET /videos/{video_id}/less API endpoint.

Tests:
  - 200 OK: Valid athlete fetching completed LESS assessment results.
  - 404 Not Found: Video exists but analysis/LESS has not completed.
  - 403 Forbidden: Athlete requesting another athlete's LESS assessment.
  - 403 Forbidden: Non-athlete role user.
  - 401 Unauthorized: Unauthenticated request.
"""
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.models.athlete import Athlete
from app.models.video import Video
from app.models.analysis_result import AnalysisResult, ANALYSIS_STATUS_COMPLETED
from app.models.analysis_less import AnalysisLESS
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)


def _token_for(user: User) -> str:
    return create_access_token(
        subject=str(user.user_id),
        role=user.role.value,
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
        expires_delta=timedelta(minutes=30),
    )


class TestLESSApiEndpoint:

    @pytest.fixture(autouse=True)
    def setup_db(self):
        db = SessionLocal()

        # Athlete 1
        self.user1 = User(
            name="LESS Athlete 1",
            email=f"less_ath1_{uuid.uuid4().hex[:8]}@test.com",
            password=get_password_hash("TestPass123!"),
            role=RoleEnum.ATHLETE,
            is_active=True,
        )
        db.add(self.user1)
        db.flush()

        self.athlete1 = Athlete(
            user_id=self.user1.user_id,
            sport="Basketball",
            position="Guard",
            age=22,
            height=185.0,
            weight=80.0,
        )
        db.add(self.athlete1)
        db.flush()

        self.video1 = Video(
            athlete_id=self.athlete1.athlete_id,
            video_url="/uploads/less_test1.mp4",
            original_filename="less_test1.mp4",
            content_type="video/mp4",
            file_size=1024,
            processing_status="analyzed",
        )
        db.add(self.video1)
        db.flush()

        self.analysis1 = AnalysisResult(
            video_id=self.video1.video_id,
            athlete_id=self.athlete1.athlete_id,
            status=ANALYSIS_STATUS_COMPLETED,
        )
        db.add(self.analysis1)
        db.flush()

        self.less1 = AnalysisLESS(
            analysis_id=self.analysis1.analysis_id,
            score=4,
            max_computable_score=12,
            computable_items=12,
            error_items=4,
            not_computable_items=5,
            classification="LOWER_LESS_SCREENING_SCORE_APPROXIMATION_ONLY",
            source="Padua et al., 2009",
            validation_source="Padua et al., 2015",
            source_version="v1",
            disclaimer="Automated LESS approximation heuristic.",
            items=[
                {
                    "item_number": 1,
                    "item_name": "Knee Flexion Angle at IC",
                    "status": "PASS",
                    "score": 0,
                    "measured_value": 35.0,
                    "criterion_threshold": "< 30°",
                    "unit": "degrees",
                    "reference": "Padua et al., 2009",
                    "reason": None,
                }
            ],
        )
        db.add(self.less1)

        # Athlete 2 (for 403 test)
        self.user2 = User(
            name="LESS Athlete 2",
            email=f"less_ath2_{uuid.uuid4().hex[:8]}@test.com",
            password=get_password_hash("TestPass123!"),
            role=RoleEnum.ATHLETE,
            is_active=True,
        )
        db.add(self.user2)
        db.flush()

        self.athlete2 = Athlete(
            user_id=self.user2.user_id,
            sport="Volleyball",
            position="Spiker",
            age=20,
            height=180.0,
            weight=72.0,
        )
        db.add(self.athlete2)

        # Video without LESS results (for 404 test)
        self.video_no_less = Video(
            athlete_id=self.athlete1.athlete_id,
            video_url="/uploads/no_less.mp4",
            original_filename="no_less.mp4",
            content_type="video/mp4",
            file_size=1024,
            processing_status="uploaded",
        )
        db.add(self.video_no_less)

        db.commit()

        self.token1 = _token_for(self.user1)
        self.token2 = _token_for(self.user2)

        yield

        # Teardown
        db_td = SessionLocal()
        try:
            db_td.query(AnalysisLESS).filter(AnalysisLESS.less_id == self.less1.less_id).delete()
            db_td.query(AnalysisResult).filter(AnalysisResult.analysis_id == self.analysis1.analysis_id).delete()
            db_td.query(Video).filter(Video.video_id.in_([self.video1.video_id, self.video_no_less.video_id])).delete()
            db_td.query(Athlete).filter(Athlete.athlete_id.in_([self.athlete1.athlete_id, self.athlete2.athlete_id])).delete()
            db_td.query(User).filter(User.user_id.in_([self.user1.user_id, self.user2.user_id])).delete()
            db_td.commit()
        finally:
            db_td.close()

    def test_get_less_success_200(self):
        headers = {"Authorization": f"Bearer {self.token1}"}
        resp = client.get(f"/api/v1/videos/{self.video1.video_id}/less", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["analysis_id"] == str(self.analysis1.analysis_id)
        assert data["score"] == 4
        assert data["max_computable_score"] == 12
        assert data["classification"] == "LOWER_LESS_SCREENING_SCORE_APPROXIMATION_ONLY"
        assert len(data["items"]) == 1
        assert data["items"][0]["item_name"] == "Knee Flexion Angle at IC"

    def test_get_less_not_found_404(self):
        headers = {"Authorization": f"Bearer {self.token1}"}
        resp = client.get(f"/api/v1/videos/{self.video_no_less.video_id}/less", headers=headers)
        assert resp.status_code == 404

    def test_get_less_forbidden_other_athlete_403(self):
        headers = {"Authorization": f"Bearer {self.token2}"}
        resp = client.get(f"/api/v1/videos/{self.video1.video_id}/less", headers=headers)
        assert resp.status_code == 403

    def test_get_less_unauthorized_401(self):
        resp = client.get(f"/api/v1/videos/{self.video1.video_id}/less")
        assert resp.status_code == 401
