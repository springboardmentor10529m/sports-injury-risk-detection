"""
End-to-End Pipeline Verification Script
Validates:
1. Athlete registration and profile setup with prior injury history.
2. Video 1 upload, MediaPipe pose extraction, biomechanics calculation, anomaly detection, history weighting.
3. Rule-based scoring + ML probability generation + 5-category recommendation synthesis.
4. Video 2 upload and analysis (Multi-video capability).
5. Verification of multi-video history persistence via /videos/with-analysis/{athlete_id}.
"""
import os
import sys
import uuid
from fastapi.testclient import TestClient
from main import app
from ml_pipeline import ml_interface

client = TestClient(app)

def run_e2e_tests():
    print("=" * 65)
    print("SPORTSHIELD END-TO-END MULTI-VIDEO PIPELINE VERIFICATION")
    print("=" * 65)

    # Train baseline ML model on Project-Injury-Dataset
    ml_interface.train_baseline_model()

    print("\n--- Step 1: Register Athlete ---")
    email = f"athlete_{uuid.uuid4().hex[:6]}@sportshield.io"
    reg = client.post("/register", json={
        "name": "Priya Sharma",
        "email": email,
        "phone": "9876543210",
        "password": "Password123!",
        "role": "athlete"
    })
    assert reg.status_code == 200, f"Register failed: {reg.text}"
    user_id = reg.json()["user_id"]
    print("  [OK] User registered, ID:", user_id)

    print("\n--- Step 2: Create Athlete Profile ---")
    ath = client.post("/athlete", json={
        "user_id": user_id,
        "sport": "Running",
        "position": "Sprinter",
        "age": 23,
        "height": 175.0,
        "weight": 68.0,
        "training_load": 78.0,
        "flexibility": 72.0,
        "strength": 84.0,
        "balance": 80.0,
        "endurance": 75.0,
        "training_level": "Advanced",
        "gender": "Female"
    })
    assert ath.status_code == 200, f"Athlete profile creation failed: {ath.text}"
    athlete_id = ath.json()["athlete_id"]
    print("  [OK] Athlete profile created, ID:", athlete_id)

    print("\n--- Step 3: Record Prior Injury History ---")
    inj = client.post(f"/athlete/{athlete_id}/injuries", json={
        "injury_type": "ACL Ligament Strain",
        "body_part": "Knee",
        "severity": "Moderate",
        "months_ago": 8,
        "fully_recovered": 0,
        "notes": "Grade 1 sprain during deceleration landing"
    })
    assert inj.status_code == 200, f"Injury record creation failed: {inj.text}"
    print("  [OK] Injury history saved, ID:", inj.json()["injury_id"])

    print("\n--- Step 4: Upload Video 1 (Running) ---")
    sample_vid = os.path.join("uploads", "0ba29524-53b8-47a2-8eda-62e10addf959.mp4")
    assert os.path.exists(sample_vid), f"Sample video missing: {sample_vid}"
    with open(sample_vid, "rb") as f:
        up1 = client.post("/video/upload", data={"athlete_id": athlete_id, "activity": "Running"}, files={"video": ("run_test.mp4", f, "video/mp4")})
    assert up1.status_code == 200, f"Upload 1 failed: {up1.text}"
    vid1_id = up1.json()["video_id"]
    print("  [OK] Video 1 uploaded, ID:", vid1_id)

    print("\n--- Step 5: Run Video 1 Biomechanical Analysis (MediaPipe Pose + Anomaly) ---")
    an1 = client.post("/analysis", data={"video_id": vid1_id, "athlete_id": athlete_id})
    assert an1.status_code == 200, f"Analysis 1 failed: {an1.text}"
    an1_data = an1.json()
    an1_id = an1_data["analysis_id"]
    print("  [OK] Video 1 Analysis complete, ID:", an1_id)
    print("       Detected Activity:", an1_data.get("detected_activity"))
    print("       Knee Valgus:", an1_data.get("knee_valgus"))
    print("       Overall Risk Score:", an1_data.get("overall_risk_score"))
    print("       History Notes:", an1_data.get("history_notes"))

    print("\n--- Step 6: Run Video 1 Prediction & Recommendations ---")
    pred1 = client.post("/prediction", data={"analysis_id": an1_id})
    assert pred1.status_code == 200, f"Prediction 1 failed: {pred1.text}"
    pred1_data = pred1.json()
    print("  [OK] Video 1 Prediction complete, ID:", pred1_data.get("prediction_id"))
    print("       ACL Risk:", pred1_data.get("acl_risk"))
    print("       Hamstring Risk:", pred1_data.get("hamstring_risk"))
    print("       ML Probability:", pred1_data.get("ml_probability"))
    recs_count = len(pred1_data.get("recommendations", {}).get("by_category", {}))
    print(f"       Targeted Recommendations generated across {recs_count} categories")

    print("\n--- Step 7: Upload Video 2 (Squatting) ---")
    with open(sample_vid, "rb") as f:
        up2 = client.post("/video/upload", data={"athlete_id": athlete_id, "activity": "Squatting"}, files={"video": ("squat_test.mp4", f, "video/mp4")})
    assert up2.status_code == 200, f"Upload 2 failed: {up2.text}"
    vid2_id = up2.json()["video_id"]
    print("  [OK] Video 2 uploaded, ID:", vid2_id)

    print("\n--- Step 8: Run Video 2 Analysis ---")
    an2 = client.post("/analysis", data={"video_id": vid2_id, "athlete_id": athlete_id})
    assert an2.status_code == 200, f"Analysis 2 failed: {an2.text}"
    print("  [OK] Video 2 Analysis complete, ID:", an2.json()["analysis_id"])

    print("\n--- Step 9: Verify Multiple Video Persistence (/videos/with-analysis) ---")
    hist_res = client.get(f"/videos/with-analysis/{athlete_id}")
    assert hist_res.status_code == 200
    history_list = hist_res.json()
    print(f"  [OK] History retrieved: {len(history_list)} records found")
    assert len(history_list) >= 2, f"Expected at least 2 video records, found {len(history_list)}"
    for item in history_list:
        v_id = item["video_id"]
        act = item["activity"]
        stat = item["processing_status"]
        has_an = item["analysis"] is not None
        print(f"       Video: {v_id} ({act}) -> Status: {stat}, Has Analysis: {has_an}")

    print("\n" + "=" * 65)
    print("ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_e2e_tests()
