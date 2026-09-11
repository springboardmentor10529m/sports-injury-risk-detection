import pytest
import uuid
import json
from datetime import datetime
from fastapi.testclient import TestClient
import main
import models
import auth
from database import SessionLocal

client = TestClient(main.app)


def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "AthleteGuard"


def test_unauthorized_analysis_access():
    response = client.get("/api/analysis/nonexistent-id/status")
    assert response.status_code == 401


def test_end_to_end_analysis_api_flow():
    """
    End-to-End Test:
    User Registration -> Token Generation -> Create Video & AnalysisJob
    -> Query Risk, Anomalies, Risk Factors, Recommendations, Complete Report
    -> Download PDF and Excel reports.
    """
    db = SessionLocal()
    unique_email = f"athlete_{uuid.uuid4().hex[:8]}@athleteguard.ai"

    # 1. Register User
    reg_payload = {
        "name": "Jordan Athlete",
        "email": unique_email,
        "password": "SecurePassword123!",
        "role": "ATHLETE"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code in [200, 201]
    user_id = reg_res.json()["user_id"]

    # 2. Login to obtain JWT Token
    login_res = client.post("/api/auth/login", json={"email": unique_email, "password": "SecurePassword123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Retrieve Auto-created Athlete Profile & Video in DB
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == user_id).first()
    if not athlete:
        athlete = models.Athlete(user_id=user_id, sport="Basketball", position="Point Guard", training_load=75.0)
        db.add(athlete)
        db.flush()
    else:
        athlete.sport = "Basketball"
        athlete.position = "Point Guard"
        athlete.training_load = 75.0
        db.commit()

    video = models.Video(
        video_id=str(uuid.uuid4()),
        athlete_id=athlete.athlete_id,
        user_id=user_id,
        activity="Jump Landing",
        video_url="/uploads/videos/sample.mp4",
        filename="sample.mp4",
        duration=8.5,
        fps=30
    )
    db.add(video)
    db.flush()

    # 4. Create Analysis Job & AnalysisResult & Anomalies
    job_id = str(uuid.uuid4())
    job = models.AnalysisJob(
        id=job_id,
        video_id=video.video_id,
        user_id=user_id,
        status="completed",
        stage="Analysis Complete",
        progress=100.0,
        completed_at=datetime.utcnow()
    )
    db.add(job)
    db.flush()

    result = models.AnalysisResult(
        analysis_id=job_id,
        video_id=video.video_id,
        athlete_id=athlete.athlete_id,
        knee_valgus=14.2,
        hip_stability=82.0,
        trunk_lean=7.5,
        symmetry_score=84.0,
        movement_quality=85.0,
        overall_risk_score=62.5,
        risk_level="HIGH",
        confidence=0.94,
        model_version="2.0.0-weighted",
        biomechanical_summary=json.dumps({
            "knee_valgus_angle": {"mean": 14.2, "max": 20.1, "p95": 18.0, "high_risk_frame_percentage": 25.0, "threshold": 12.0},
            "trunk_lean": {"mean": 7.5, "threshold": 10.0}
        })
    )
    db.add(result)
    db.flush()

    # Risk Factor
    rf = models.RiskFactor(
        analysis_id=result.analysis_id,
        factor="Knee valgus deviation",
        body_region="knee",
        severity="HIGH",
        contribution=16.5
    )
    db.add(rf)

    # Anomaly
    anom = models.MovementAnomaly(
        analysis_id=job_id,
        frame=45,
        timestamp=1.5,
        type="knee_valgus",
        score=0.88,
        severity="HIGH",
        body_region="left_knee",
        explanation="Knee collapsed inward during landing."
    )
    db.add(anom)

    # Prediction
    pred = models.InjuryPrediction(
        analysis_id=result.analysis_id,
        acl_risk=68.5,
        hamstring_risk=42.0,
        ankle_risk=28.0,
        shoulder_risk=15.0,
        lower_back_risk=35.0,
        overuse_risk=52.0
    )
    db.add(pred)
    db.flush()

    # Recommendation
    rec = models.Recommendation(
        prediction_id=pred.prediction_id,
        exercise="Gluteus medius band walks",
        mobility="Thoracic rotations",
        strengthening="Nordic hamstring curls",
        recovery="Contrast bath",
        training_modification="Reduce plyometrics by 20%",
        detailed_json=json.dumps([
            {
                "priority": "HIGH",
                "category": "strengthening",
                "target_region": "knee",
                "exercise": "Band walks",
                "suggested_frequency": "3x/wk",
                "expected_objective": "Stabilize knee",
                "reason": "Elevated knee valgus"
            }
        ])
    )
    db.add(rec)
    db.commit()

    # --- 5. Verify New API Endpoints ---

    # A. GET /api/analysis/{analysis_id}/risk
    res_risk = client.get(f"/api/analysis/{job_id}/risk", headers=headers)
    assert res_risk.status_code == 200
    risk_data = res_risk.json()
    assert risk_data["overall_score"] == 62.5
    assert risk_data["risk_level"] == "HIGH"
    assert len(risk_data["contributors"]) >= 1

    # B. GET /api/analysis/{analysis_id}/anomalies
    res_anom = client.get(f"/api/analysis/{job_id}/anomalies", headers=headers)
    assert res_anom.status_code == 200
    anoms_data = res_anom.json()
    assert len(anoms_data) >= 1
    assert anoms_data[0]["type"] == "knee_valgus"

    # C. GET /api/analysis/{analysis_id}/risk-factors
    res_rf = client.get(f"/api/analysis/{job_id}/risk-factors", headers=headers)
    assert res_rf.status_code == 200
    assert len(res_rf.json()) >= 1

    # D. GET /api/analysis/{analysis_id}/recommendations
    res_rec = client.get(f"/api/analysis/{job_id}/recommendations", headers=headers)
    assert res_rec.status_code == 200
    assert "disclaimer" in res_rec.json()
    assert len(res_rec.json()["recommendations"]) >= 1

    # E. GET /api/analysis/{analysis_id}/complete-report
    res_full = client.get(f"/api/analysis/{job_id}/complete-report", headers=headers)
    assert res_full.status_code == 200
    full_data = res_full.json()
    assert "analysis" in full_data
    assert "risk" in full_data
    assert "injury_prediction" in full_data
    assert "biomechanics" in full_data
    assert "anomalies" in full_data
    assert "recommendations" in full_data

    # F. GET /api/analysis/{analysis_id}/download/pdf
    res_pdf = client.get(f"/api/analysis/{job_id}/download/pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF")

    # G. GET /api/analysis/{analysis_id}/download/excel
    res_excel = client.get(f"/api/analysis/{job_id}/download/excel", headers=headers)
    assert res_excel.status_code == 200
    assert len(res_excel.content) > 1000

    # H. Ownership test: Another user cannot access Jordan's analysis
    other_token = auth.create_access_token({"sub": "another-user-uuid"})
    other_headers = {"Authorization": f"Bearer {other_token}"}
    res_unauth = client.get(f"/api/analysis/{job_id}/risk", headers=other_headers)
    assert res_unauth.status_code in [401, 403, 404]

    db.close()
