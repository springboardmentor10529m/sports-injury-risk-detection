import os
import random
import requests

BASE_URL = "http://127.0.0.1:8000/api"

def test_network_workflow():
    print("🌍 Starting Live Server HTTP Network Verification...")
    
    # Generate unique email to prevent collision
    rand_id = random.randint(1000, 9999)
    email = f"athlete_{rand_id}@example.com"
    password = "secure_password_123"
    
    # 1. Register User
    print(f"👉 Registering new user with email: {email}...")
    register_payload = {
        "name": "Live Tester",
        "email": email,
        "password": password,
        "role": "athlete",
        "phone": "+1999999999"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if response.status_code != 201:
        print(f"❌ Registration failed: {response.text}")
        return False
    print("✅ User registered successfully.")

    # 2. Login User
    print("👉 Logging in to retrieve JWT token...")
    login_payload = {
        "email": email,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return False
    
    token_data = response.json()
    access_token = token_data["access_token"]
    print("✅ Login successful. JWT token acquired.")

    # Headers for authentication
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Create Athlete Profile
    print("👉 Creating athlete profile metrics...")
    profile_payload = {
        "sport": "Basketball",
        "position": "Guard",
        "age": 20,
        "height": 190.5,
        "weight": 85.0,
        "flexibility": 8.0,
        "strength": 8.5,
        "balance": 9.0,
        "endurance": 8.0,
        "coach_notes": "Fast agility, needs knee alignment tracking."
    }
    response = requests.post(f"{BASE_URL}/athlete/profile", json=profile_payload, headers=headers)
    if response.status_code != 200:
        print(f"❌ Profile creation failed: {response.text}")
        return False
    print("✅ Athlete profile saved successfully.")

    # 4. Upload Video
    print("👉 Uploading video over HTTP to live server...")
    dummy_video_path = "/Users/thalladaakhilkumar/Sports/dummy_video.mp4"
    
    if not os.path.exists(dummy_video_path):
        with open(dummy_video_path, "w") as f:
            f.write("dummy content")
            
    with open(dummy_video_path, "rb") as video_file:
        files = {
            "file": ("jumping_test.mp4", video_file, "video/mp4")
        }
        data = {
            "activity": "Jumping"
        }
        response = requests.post(f"{BASE_URL}/video/upload", data=data, files=files, headers=headers)
        
    if response.status_code != 200:
        print(f"❌ Video upload failed: {response.text}")
        return False
        
    video_data = response.json()
    print(f"✅ Video uploaded successfully! Video Path stored in DB: {video_data['video_url']}")

    # 5. List Videos
    print("👉 Querying athlete upload history list...")
    response = requests.get(f"{BASE_URL}/video/list", headers=headers)
    if response.status_code != 200:
        print(f"❌ List videos failed: {response.text}")
        return False
        
    videos_list = response.json()
    print(f"✅ Video history retrieved successfully. Total videos: {len(videos_list)}")
    
    # 6. Verify static file retrieval
    print("👉 Verifying static file retrieval...")
    video_relative_url = video_data['video_url']
    static_url = f"http://127.0.0.1:8000{video_relative_url}"
    response = requests.get(static_url)
    if response.status_code != 200:
        print(f"❌ Failed to download uploaded video statically from {static_url}!")
        return False
    print(f"✅ Statically served video file retrieved successfully (Size: {len(response.content)} bytes).")

    print("\n🎉 ALL LIVE NETWORK ENDPOINT VERIFICATIONS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    test_network_workflow()
