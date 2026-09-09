import sqlite3
import json
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.abspath('backend'))
from app.main import app

client = TestClient(app)

video_id = "2e39eaffbbfe4172ae84539446b57fe0"

print(f"=== TESTING TELEMETRY ENDPOINT FOR VIDEO {video_id} ===")
response = client.get(f"/videos/{video_id}/telemetry")
print(f"HTTP Status: {response.status_code}")
data = response.json()
print(f"Response JSON keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
telemetry = data.get("telemetry", []) if isinstance(data, dict) else []
print(f"Number of telemetry frames: {len(telemetry)}")
if telemetry:
    print(f"First record: {telemetry[0]}")
    print(f"Last record: {telemetry[-1]}")
else:
    print("Telemetry array is EMPTY!")

print("\n=== INSPECTING RAW LANDMARKS FOR FRAME 0 & 1 ===")
conn = sqlite3.connect("sql_app.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT frames FROM pose_data WHERE video_id = ?", (video_id,))
row = cur.fetchone()
if row and row["frames"]:
    frames = json.loads(row["frames"])
    print(f"Total frames stored: {len(frames)}")
    if frames:
        f0 = frames[0]
        print("Frame 0 structure:", {k: (type(v) if k != 'landmarks' else type(v)) for k, v in f0.items()})
        lms = f0.get("landmarks")
        if isinstance(lms, dict):
            print("Landmarks dict keys sample:", list(lms.keys())[:10])
            first_key = list(lms.keys())[0]
            print(f"Sample landmark [{first_key}]:", lms[first_key])
        elif isinstance(lms, list):
            print("Landmarks list len:", len(lms))
            print("Sample landmark [0]:", lms[0])
conn.close()
