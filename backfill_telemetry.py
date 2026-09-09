import sqlite3
import json
import os
import sys

sys.path.insert(0, os.path.abspath('backend'))
from app.services.biomechanics_service import biomechanics_service

db_paths = [
    r"d:\Infosys certificates\Infosys Project\sports-injury-detection\sql_app.db",
    r"d:\Infosys certificates\Infosys Project\sports-injury-detection\backend\sql_app.db"
]

for path in db_paths:
    if not os.path.exists(path):
        continue
    print(f"=== Backfilling DB: {path} ===")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT pose_id, video_id, frames, keypoints FROM pose_data")
    rows = cur.fetchall()
    print(f"Found {len(rows)} pose_data records")
    
    for row in rows:
        pose_id = row["pose_id"]
        video_id = row["video_id"]
        frames_raw = row["frames"]
        keypoints_raw = row["keypoints"]
        
        frames = json.loads(frames_raw) if frames_raw else []
        keypoints = json.loads(keypoints_raw) if keypoints_raw else {}
        if isinstance(keypoints, str):
            keypoints = json.loads(keypoints)
            
        print(f"Processing video {video_id}: {len(frames)} frames...")
        
        telemetry = []
        if frames:
            for idx, fr in enumerate(frames):
                lms = fr.get("landmarks", {})
                if lms:
                    kin = biomechanics_service.compute_frame_kinematics(lms)
                    telemetry.append({
                        "frame": fr.get("frame", idx),
                        "timestamp": fr.get("timestamp_seconds", round(float(idx / 24.0), 2)),
                        "knee_valgus": float(kin.get("knee_valgus_ratio", 1.0)),
                        "knee_valgus_ratio": float(kin.get("knee_valgus_ratio", 1.0)),
                        "trunk_lean": float(kin.get("trunk_lean", 0.0)),
                        "hip_tilt": float(kin.get("hip_tilt", 0.0)),
                        "left_knee_angle": float(kin.get("left_knee_angle", 180.0)),
                        "right_knee_angle": float(kin.get("right_knee_angle", 180.0))
                    })
                    
        print(f"Calculated {len(telemetry)} telemetry frame records for video {video_id}")
        keypoints["telemetry"] = telemetry
        keypoints["total_frames"] = len(frames)
        keypoints["fps"] = 24.0
        
        cur.execute("UPDATE pose_data SET keypoints = ? WHERE pose_id = ?", (json.dumps(keypoints), pose_id))
        
    conn.commit()
    conn.close()
    print("Backfill completed successfully for:", path)
