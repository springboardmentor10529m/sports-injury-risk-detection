import os
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base

# Setup clean test tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_full_workflow():
    print("🚀 Starting API integration verification...")
    
    # 1. Register User
    print("👉 Registering new user...")
    register_payload = {
        "name": "Alex Hunter",
        "email": "alex.hunter@example.com",
        "password": "securepassword123",
        "role": "athlete",
        "phone": "+1234567890"
    }
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 201, f"Registration failed: {response.text}"
    user_data = response.json()
    assert user_data["email"] == "alex.hunter@example.com"
    assert user_data["role"] == "athlete"
    print("✅ User registered successfully.")

    # 2. Login User
    print("👉 Logging in to get JWT token...")
    login_payload = {
        "email": "alex.hunter@example.com",
        "password": "securepassword123"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200, f"Login failed: {response.text}"
    token_data = response.json()
    access_token = token_data["access_token"]
    assert token_data["role"] == "athlete"
    print("✅ Login successful. JWT token acquired.")

    # Set authentication headers for subsequent requests
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Create Athlete Profile
    print("👉 Creating athlete profile...")
    profile_payload = {
        "sport": "Soccer",
        "position": "Forward",
        "age": 22,
        "height": 182.5,
        "weight": 76.2,
        "flexibility": 8.5,
        "strength": 9.0,
        "balance": 8.0,
        "endurance": 9.5,
        "coach_notes": "Highly athletic, needs recovery management."
    }
    response = client.post("/api/athlete/profile", json=profile_payload, headers=headers)
    assert response.status_code == 200, f"Profile creation failed: {response.text}"
    profile_data = response.json()
    assert profile_data["sport"] == "Soccer"
    assert profile_data["age"] == 22
    print("✅ Athlete profile saved successfully.")

    # 4. Upload Video
    print("👉 Uploading test video file...")
    dummy_video_content = b"DUMMY_MP4_VIDEO_STREAM_DATA"
    files = {
        "file": ("test_jump_assessment.mp4", dummy_video_content, "video/mp4")
    }
    data = {
        "activity": "Jumping"
    }
    response = client.post("/api/video/upload", data=data, files=files, headers=headers)
    assert response.status_code == 200, f"Video upload failed: {response.text}"
    video_data = response.json()
    assert video_data["activity"] == "Jumping"
    assert video_data["processing_status"] == "Uploaded"
    assert video_data["video_url"].startswith("/uploads/")
    
    # Check if file was saved physically on disk
    filename = os.path.basename(video_data["video_url"])
    saved_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", filename)
    assert os.path.exists(saved_path), "Video file was not written to uploads directory!"
    print("✅ Video uploaded and saved to disk successfully.")

    # 5. List Videos
    print("👉 Fetching uploaded videos list...")
    response = client.get("/api/video/list", headers=headers)
    assert response.status_code == 200, f"List videos failed: {response.text}"
    videos_list = response.json()
    assert len(videos_list) == 1
    assert videos_list[0]["video_id"] == video_data["video_id"]
    print("✅ Video list retrieved successfully.")

    # 6. Register Coach User
    print("👉 Registering new coach...")
    coach_register_payload = {
        "name": "Coach Carter",
        "email": "coach.carter@example.com",
        "password": "securepassword123",
        "role": "coach"
    }
    response = client.post("/api/auth/register", json=coach_register_payload)
    assert response.status_code == 201, f"Coach registration failed: {response.text}"
    print("✅ Coach registered successfully.")

    # 7. Login Coach User
    print("👉 Logging in as coach...")
    coach_login_payload = {
        "email": "coach.carter@example.com",
        "password": "securepassword123"
    }
    response = client.post("/api/auth/login", json=coach_login_payload)
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    coach_token_data = response.json()
    coach_headers = {"Authorization": f"Bearer {coach_token_data['access_token']}"}
    print("✅ Coach login successful.")

    # 8. Fetch Athlete List as Coach
    print("👉 Fetching athlete list as coach...")
    response = client.get("/api/athlete/list", headers=coach_headers)
    assert response.status_code == 200, f"Fetch athlete list failed: {response.text}"
    athlete_list = response.json()
    assert len(athlete_list) == 1
    athlete_id = athlete_list[0]["athlete_id"]
    assert athlete_list[0]["user"]["email"] == "alex.hunter@example.com"
    print("✅ Athlete list successfully retrieved by coach.")

    # 9. Fetch Athlete Videos as Coach
    print("👉 Fetching athlete videos as coach...")
    response = client.get(f"/api/athlete/{athlete_id}/videos", headers=coach_headers)
    assert response.status_code == 200, f"Fetch athlete videos failed: {response.text}"
    athlete_videos = response.json()
    assert len(athlete_videos) == 1
    assert athlete_videos[0]["video_id"] == video_data["video_id"]
    print("✅ Athlete videos successfully retrieved by coach.")

    # 10. Update Coach Notes as Coach
    print("👉 Updating coach notes as coach...")
    notes_payload = {
        "coach_notes": "Updated remarks: Needs more work on jump landing mechanics."
    }
    response = client.put(f"/api/athlete/{athlete_id}/notes", json=notes_payload, headers=coach_headers)
    assert response.status_code == 200, f"Updating coach notes failed: {response.text}"
    updated_profile = response.json()
    assert updated_profile["coach_notes"] == notes_payload["coach_notes"]
    print("✅ Coach notes updated successfully by coach.")

    # 11. Verify Authorization Restrictions (Athlete trying to access expert endpoints)
    print("👉 Verifying athlete cannot access expert endpoints...")
    response = client.get("/api/athlete/list", headers=headers)
    assert response.status_code == 403, "Athlete was incorrectly allowed to fetch athlete list"
    
    response = client.get(f"/api/athlete/{athlete_id}/videos", headers=headers)
    assert response.status_code == 403, "Athlete was incorrectly allowed to fetch other athlete's videos"
    
    response = client.put(f"/api/athlete/{athlete_id}/notes", json=notes_payload, headers=headers)
    assert response.status_code == 403, "Athlete was incorrectly allowed to write coach notes"
    print("✅ Endpoint security successfully verified.")

    print("\n🎉 ALL BACKEND VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_workflow()
