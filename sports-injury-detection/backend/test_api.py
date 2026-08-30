import pytest
from fastapi.testclient import TestClient
import uuid
import json
from datetime import date

# pyrefly: ignore [missing-import]
from app.main import app, get_db
# pyrefly: ignore [missing-import]
from app.database import Base, engine
from app import models
# pyrefly: ignore [missing-import]
from app.risk_engine import calculate_injury_risk
# pyrefly: ignore [missing-import]
from app.recommender import generate_recommendations

client = TestClient(app)

Base.metadata.create_all(bind=engine)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_database_connection():
    response = client.get("/database-test")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_full_athlete_data_flow():
    # 1. Register Athlete
    email = f"test_athlete_{uuid.uuid4().hex[:6]}@example.com"
    register_data = {
        "name": "Alex Hunter",
        "email": email,
        "password": "password123",
        "role": "athlete",
        "phone": "+1987654321"
    }
    reg_response = client.post("/auth/register", json=register_data)
    assert reg_response.status_code == 200
    assert reg_response.json()["email"] == email

    # 2. Login
    login_data = {
        "email": email,
        "password": "password123"
    }
    login_response = client.post("/auth/login", json=login_data)
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Athlete Profile (athletes table)
    profile_data = {
        "sport": "Soccer",
        "position": "Midfielder",
        "age": 21,
        "height": 178.5,
        "weight": 72.0,
        "training_load": 14.5,
        "flexibility": 82.0,
        "strength": 78.5,
        "balance": 88.0,
        "endurance": 80.0,
        "coach_notes": "Good baseline metrics."
    }
    prof_response = client.post("/athlete/profile", json=profile_data, headers=headers)
    assert prof_response.status_code == 200
    assert prof_response.json()["sport"] == "Soccer"
    assert prof_response.json()["endurance"] == 80.0

    # 4. Add Injury Record (injury_history table)
    injury_data = {
        "injury_type": "Hamstring Pull",
        "body_part": "Left Hamstring",
        "severity": "Moderate",
        "injury_date": "2025-05-10",
        "recovery_date": "2025-06-05",
        "remarks": "Physical therapy completed."
    }
    inj_response = client.post("/athlete/injury-history", json=injury_data, headers=headers)
    assert inj_response.status_code == 200
    assert inj_response.json()["body_part"] == "Left Hamstring"
    assert inj_response.json()["severity"] == "Moderate"

    # 5. Fetch Injury History
    get_inj_response = client.get("/athlete/injury-history", headers=headers)
    assert get_inj_response.status_code == 200
    assert len(get_inj_response.json()) == 1


def test_calculations_logic():
    # Test data simulating high valgus drop and pelvis shift
    mock_assessment_data = {
        "processed": True,
        "joint_angles": {
            "left_knee_min": 112.0,
            "left_knee_max": 176.0,
            "left_knee_avg": 143.0,
            "right_knee_min": 108.0,
            "right_knee_max": 177.0,
            "right_knee_avg": 145.0,
            "left_hip_avg": 121.0,
            "right_hip_avg": 123.0,
            "trunk_lean_avg": 25.0,
            "hip_tilt_max": 6.5,
            "min_knee_valgus_ratio": 0.77  # Severe inward collapse
        },
        "range_of_motion": {
            "left_knee_rom": 64.0,
            "right_knee_rom": 69.0,
            "left_hip_rom": 56.0,
            "right_hip_rom": 58.0
        },
        "symmetry_score": 92.7,
        "posture_assessment": "Test observations",
        "frames_timeline": [
            {"frame": i, "left_knee_angle": 142.0, "right_knee_angle": 145.0, "trunk_lean": 21.0, "hip_tilt": 4.5, "knee_valgus_ratio": 0.78}
            for i in range(15)
        ]
    }

    mock_profile = {
        "sport_type": "Soccer",
        "injury_history": [{"injury_type": "Hamstring Pull", "severity": "Moderate"}],
        "training_load": 14.5
    }

    # Run calculations
    risk_results = calculate_injury_risk(mock_assessment_data, mock_profile)
    assert risk_results["risk_score"] > 0
    assert risk_results["acl_risk"] > 0
    assert risk_results["ankle_risk"] > 0
    assert risk_results["overuse_risk"] > 0
    assert risk_results["risk_category"] in ["Low", "Moderate", "High", "Critical"]

    # Generate recommendations matching new columns
    rec_results = generate_recommendations(risk_results)
    assert "- " in rec_results["exercise"]
    assert "- " in rec_results["mobility"]
    assert "- " in rec_results["strengthening"]
    assert "Status:" in rec_results["recovery"]
    assert len(rec_results["training_modification"]) > 0

def test_extended_endpoints_flow():
    # 1. Admin Login or Register
    admin_email = f"test_admin_{uuid.uuid4().hex[:6]}@example.com"
    admin_reg = client.post("/auth/register", json={
        "name": "Admin User",
        "email": admin_email,
        "password": "adminpassword123",
        "role": "administrator"
    })
    assert admin_reg.status_code == 200

    admin_login = client.post("/auth/login", json={"email": admin_email, "password": "adminpassword123"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Test User Profile Me
    me_resp = client.get("/auth/me", headers=admin_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == admin_email
    assert me_resp.json()["role"] == "administrator"

    # 3. Test Password Change
    pwd_resp = client.put("/auth/password", json={
        "old_password": "adminpassword123",
        "new_password": "newadminpassword456"
    }, headers=admin_headers)
    assert pwd_resp.status_code == 200

    # Verify login with new password
    new_login = client.post("/auth/login", json={"email": admin_email, "password": "newadminpassword456"})
    assert new_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {new_login.json()['access_token']}"}

    # 4. Test Role Dashboard Summaries
    summary_resp = client.get("/dashboard/role-summary", headers=admin_headers)
    assert summary_resp.status_code == 200
    assert summary_resp.json()["role"] == "administrator"

    # 5. Test Admin Analytics
    analytics_resp = client.get("/admin/analytics", headers=admin_headers)
    assert analytics_resp.status_code == 200
    assert "users_by_role" in analytics_resp.json()

    # 6. Test Admin Jobs List
    jobs_resp = client.get("/admin/users", headers=admin_headers)
    assert jobs_resp.status_code == 200
    assert isinstance(jobs_resp.json(), list)

def test_reports_and_anomalies_mock():
    # Register Athlete for report tests
    ath_email = f"ath_report_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/auth/register", json={
        "name": "Report Athlete",
        "email": ath_email,
        "password": "password123",
        "role": "athlete"
    })
    ath_login = client.post("/auth/login", json={"email": ath_email, "password": "password123"})
    ath_token = ath_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {ath_token}"}

    fake_uuid = str(uuid.uuid4())
    # Test PDF report 404 for nonexistent video
    pdf_resp = client.get(f"/reports/{fake_uuid}/pdf", headers=headers)
    assert pdf_resp.status_code == 404

    # Test Excel report 404 for nonexistent video
    excel_resp = client.get(f"/reports/{fake_uuid}/excel", headers=headers)
    assert excel_resp.status_code == 404

    # Test Anomalies 404 for nonexistent video
    anom_resp = client.get(f"/anomalies/{fake_uuid}", headers=headers)
    assert anom_resp.status_code == 404

