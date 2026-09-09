import sqlite3
import json
from fastapi.testclient import TestClient
import sys, os

sys.path.insert(0, os.path.abspath('backend'))
from app.main import app
from app import models
from app.database import SessionLocal
from app.auth import create_access_token

client = TestClient(app)
db = SessionLocal()

video_id = "2e39eaffbbfe4172ae84539446b57fe0"
user = db.query(models.User).first()
token = create_access_token(data={"sub": str(user.user_id)}) if user else ""

print("==================================================")
print("FINAL END-TO-END TELEMETRY VERIFICATION")
print("==================================================")

# 1. Video Check
import uuid
video = db.query(models.Video).filter(models.Video.video_id == uuid.UUID(video_id)).first()
print(f"1. Video Record:")
print(f"   - video_id: {video.video_id}")
print(f"   - status: {video.processing_status}")
print(f"   - video_url: {video.video_url}")
print(f"   - file exists on disk: {os.path.exists(video.video_url)}")

# 2. Analysis & Risk Check
analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.video_id == uuid.UUID(video_id)).first()
print(f"2. Analysis Record:")
print(f"   - Risk Score: {analysis.overall_risk_score}")
print(f"   - Risk Level: {analysis.risk_level}")

# 3. Telemetry Endpoint Direct Call
headers = {"Authorization": f"Bearer {token}"}
response = client.get(f"/videos/{video_id}/telemetry", headers=headers)
print(f"3. Telemetry API Endpoint:")
print(f"   - HTTP Status: {response.status_code}")
data = response.json()
telemetry = data.get("telemetry", [])
print(f"   - Response JSON keys: {list(data.keys())}")
print(f"   - Number of telemetry frames: {len(telemetry)}")
if telemetry:
    print(f"   - First telemetry record: {telemetry[0]}")
    print(f"   - Last telemetry record: {telemetry[-1]}")
    
# 4. Check Processed Video File Static Route
processed_res = client.get(f"/{video.video_url}")
print(f"4. Processed Video Static File Endpoint:")
print(f"   - HTTP Status: {processed_res.status_code}")

db.close()
