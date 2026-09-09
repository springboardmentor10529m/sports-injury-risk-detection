import sqlite3
import json
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.main import app
from app import models
from app.database import SessionLocal

db = SessionLocal()
user = db.query(models.User).first()
video_id = "2e39eaffbbfe4172ae84539446b57fe0"

from app.auth import create_access_token
token = create_access_token(data={"sub": str(user.user_id)}) if user else ""

client = TestClient(app)

print(f"=== TESTING TELEMETRY ENDPOINT WITH AUTH TOKEN ===")
headers = {"Authorization": f"Bearer {token}"}
response = client.get(f"/videos/{video_id}/telemetry", headers=headers)
print(f"HTTP Status: {response.status_code}")
data = response.json()
print("Response JSON:", json.dumps(data, indent=2))

print("\n=== SCANNING ALL 358 FRAMES IN POSE DATA ===")
conn = sqlite3.connect("sql_app.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT frames, keypoints FROM pose_data WHERE video_id = ?", (video_id,))
row = cur.fetchone()
if row:
    frames = json.loads(row["frames"]) if row["frames"] else []
    keypoints = json.loads(row["keypoints"]) if row["keypoints"] else {}
    print(f"Total frames: {len(frames)}")
    
    non_empty_lm_frames = 0
    sample_frame_with_lms = None
    for idx, f in enumerate(frames):
        lms = f.get("landmarks", {})
        if lms and len(lms) > 0:
            non_empty_lm_frames += 1
            if sample_frame_with_lms is None:
                sample_frame_with_lms = (idx, f)
                
    print(f"Frames with non-empty landmarks: {non_empty_lm_frames} / {len(frames)}")
    if sample_frame_with_lms:
        idx, f = sample_frame_with_lms
        print(f"Sample frame {idx} landmark keys count: {len(f['landmarks'])}")
        print("Sample frame landmark 0:", list(f['landmarks'].items())[0])

    print("Keypoints dict:", keypoints)

conn.close()
db.close()
