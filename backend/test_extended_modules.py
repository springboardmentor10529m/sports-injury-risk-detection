import os
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_extended_modules():
    print("🚀 Starting Extended Modules Integration Test (Sports Scientist, Recommendations, Notifications, Reports, Admin)...")

    # 1. Register and Login Athlete
    athlete_email = "test.athlete.ext@example.com"
    client.post("/api/auth/register", json={
        "name": "David Silva", "email": athlete_email, "password": "password123", "role": "athlete"
    })
    athlete_tok = client.post("/api/auth/login", json={"email": athlete_email, "password": "password123"}).json()["access_token"]
    athlete_headers = {"Authorization": f"Bearer {athlete_tok}"}

    prof_res = client.post("/api/athlete/profile", json={
        "sport": "Basketball", "position": "Guard", "age": 25, "height": 190.0, "weight": 85.0, "training_load": 6.5
    }, headers=athlete_headers)
    assert prof_res.status_code == 200
    athlete_id = prof_res.json()["athlete_id"]
    print("✅ Athlete registered & profile saved.")

    # 2. Register & Login Sports Scientist
    sci_email = "scientist@example.com"
    client.post("/api/auth/register", json={
        "name": "Dr. Sarah Biomech", "email": sci_email, "password": "password123", "role": "sports_scientist"
    })
    sci_tok = client.post("/api/auth/login", json={"email": sci_email, "password": "password123"}).json()["access_token"]
    sci_headers = {"Authorization": f"Bearer {sci_tok}"}
    print("✅ Sports Scientist registered & authenticated.")

    # 3. Register & Login Admin
    admin_email = "admin@example.com"
    client.post("/api/auth/register", json={
        "name": "System Admin", "email": admin_email, "password": "password123", "role": "admin"
    })
    admin_tok = client.post("/api/auth/login", json={"email": admin_email, "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_tok}"}
    print("✅ Admin registered & authenticated.")

    # 4. Test Exercise Library & Recommendations
    lib_res = client.get("/api/recommendations/library")
    assert lib_res.status_code == 200
    assert len(lib_res.json()) > 0
    print(f"✅ Exercise Library verified: {len(lib_res.json())} sports medicine drills available.")

    recs_res = client.get(f"/api/recommendations/athlete/{athlete_id}", headers=athlete_headers)
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0
    rec_id = recs[0]["recommendation_id"]
    print(f"✅ Athlete recommendations fetched: {len(recs)} active drills.")

    # Toggle completion
    toggle_res = client.put(f"/api/recommendations/{rec_id}/toggle", headers=athlete_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["completed"] == True
    print("✅ Corrective recommendation completion toggle verified.")

    # 5. Test Notifications
    notifs_res = client.get("/api/notifications", headers=athlete_headers)
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) > 0
    notif_id = notifs[0]["notification_id"]
    print(f"✅ Athlete notifications retrieved: {len(notifs)} alerts.")

    read_res = client.put(f"/api/notifications/{notif_id}/read", headers=athlete_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] == True
    print("✅ Notification marked as read.")

    read_all_res = client.put("/api/notifications/read-all", headers=athlete_headers)
    assert read_all_res.status_code == 200
    print("✅ Mark all notifications as read verified.")

    # 6. Test Reports & Exports
    summary_res = client.get(f"/api/reports/athlete/{athlete_id}/summary", headers=athlete_headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["athlete_id"] == athlete_id
    assert "injury_risk_forecast" in summary_data
    print("✅ Comprehensive Athlete Clinical Report generated successfully.")

    csv_res = client.get(f"/api/reports/athlete/{athlete_id}/export/csv", headers=athlete_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    print("✅ Athlete Biomechanics CSV Export verified.")

    team_csv_res = client.get("/api/reports/team/export/csv", headers=admin_headers)
    assert team_csv_res.status_code == 200
    assert "text/csv" in team_csv_res.headers.get("content-type", "")
    print("✅ Team Injury Risk Matrix CSV Export verified.")

    research_res = client.get("/api/reports/biometrics/research", headers=sci_headers)
    assert research_res.status_code == 200
    research_data = research_res.json()
    assert "reference_baselines" in research_data
    assert "cohort_metrics" in research_data
    print("✅ Sports Science Biomechanics & Cohort Research API verified.")

    # 7. Test Admin Endpoints
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users_list = users_res.json()
    assert len(users_list) >= 3
    print(f"✅ Admin users list verified: {len(users_list)} registered accounts.")

    metrics_res = client.get("/api/admin/metrics", headers=admin_headers)
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "total_users" in metrics_data
    assert "risk_distribution" in metrics_data
    print(f"✅ Admin platform throughput metrics verified: {metrics_data}.")

    print("\n🎉 ALL EXTENDED MODULE INTEGRATIONS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_extended_modules()
