import os
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base
from app import models

# Setup tables if not present
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_injury_prediction_workflow():
    print("🚀 Starting Injury Prediction verification...")

    # 1. Register Athlete
    import time
    uid = int(time.time() * 1000)
    athlete_email = f"jordan_{uid}@example.com"
    print("👉 Registering new athlete...")
    athlete_register_payload = {
        "name": "Jordan Spieth",
        "email": athlete_email,
        "password": "password123",
        "role": "athlete",
        "phone": "+15551234"
    }
    response = client.post("/api/auth/register", json=athlete_register_payload)
    assert response.status_code == 201
    
    # Login Athlete
    response = client.post("/api/auth/login", json={
        "email": athlete_email,
        "password": "password123"
    })
    assert response.status_code == 200
    athlete_token = response.json()["access_token"]
    athlete_headers = {"Authorization": f"Bearer {athlete_token}"}

    # 2. Create Athlete Profile with historical notes & training load
    print("👉 Creating athlete profile...")
    profile_payload = {
        "sport": "Basketball",
        "position": "Guard",
        "age": 25,
        "height": 190.0,
        "weight": 85.0,
        "training_load": 6.5,
        "flexibility": 7.0,
        "strength": 8.0,
        "balance": 6.5,
        "endurance": 8.5,
        "coach_notes": "History of mild ACL strain on left knee, complains of ankle instability."
    }
    response = client.post("/api/athlete/profile", json=profile_payload, headers=athlete_headers)
    assert response.status_code == 200
    athlete_id = response.json()["athlete_id"]

    # 3. Upload video to run biomechanical + risk prediction pipeline
    print("👉 Generating programmatically valid test video...")
    # pyrefly: ignore [missing-import]
    import cv2
    # pyrefly: ignore [missing-import]
    import numpy as np
    temp_video_path = "temp_test_video.mp4"
    fourcc = cv2.VideoWriter.fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_video_path, fourcc, 10.0, (100, 100))
    for _ in range(3):
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        out.write(frame)
    out.release()

    with open(temp_video_path, "rb") as f:
        video_content = f.read()

    if os.path.exists(temp_video_path):
        os.remove(temp_video_path)

    print("👉 Uploading video...")
    files = {
        "file": ("test_squat.mp4", video_content, "video/mp4")
    }
    data = {
        "activity": "Squatting"
    }
    response = client.post("/api/video/upload", data=data, files=files, headers=athlete_headers)
    assert response.status_code == 200
    video_id = response.json()["video_id"]
    print("✅ Video uploaded successfully. Video ID:", video_id)

    # 4. Fetch the detailed injury prediction for this video
    print("👉 Fetching injury prediction for the video...")
    response = client.get(f"/api/injury/prediction/video/{video_id}", headers=athlete_headers)
    assert response.status_code == 200, f"Failed to get video prediction: {response.text}"
    prediction = response.json()
    
    assert prediction["video_id"] == video_id
    assert prediction["athlete_id"] == athlete_id
    assert "acl_risk_prob" in prediction
    assert "hamstring_risk_prob" in prediction
    assert "overall_risk_score" in prediction
    assert prediction["risk_category"] in ["Low", "Moderate", "High", "Critical"]
    print(f"✅ Injury prediction successfully retrieved. Overall Risk Score: {prediction['overall_risk_score']} ({prediction['risk_category']})")

    # 5. Fetch predictions list for the athlete
    print("👉 Fetching predictions list for the athlete...")
    response = client.get(f"/api/injury/predictions/athlete/{athlete_id}", headers=athlete_headers)
    assert response.status_code == 200
    predictions_list = response.json()
    assert len(predictions_list) == 1
    assert predictions_list[0]["prediction_id"] == prediction["prediction_id"]
    print("✅ Athlete injury history retrieved successfully.")

    # 6. Register & Login Coach to verify team predictions
    coach_email = f"coach_{uid}@example.com"
    print("👉 Registering coach...")
    coach_register_payload = {
        "name": "Coach K",
        "email": coach_email,
        "password": "password123",
        "role": "coach"
    }
    response = client.post("/api/auth/register", json=coach_register_payload)
    assert response.status_code == 201

    response = client.post("/api/auth/login", json={
        "email": coach_email,
        "password": "password123"
    })
    assert response.status_code == 200
    coach_token = response.json()["access_token"]
    coach_headers = {"Authorization": f"Bearer {coach_token}"}

    # Get team predictions
    print("👉 Fetching team predictions as coach...")
    response = client.get("/api/injury/predictions/team", headers=coach_headers)
    assert response.status_code == 200
    team_predictions = response.json()
    assert len(team_predictions) >= 1
    assert any(p["athlete_id"] == athlete_id for p in team_predictions)
    print("✅ Team predictions successfully retrieved by coach.")

    print("\n🎉 ALL INJURY PREDICTION TEST CASESS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_injury_prediction_workflow()
