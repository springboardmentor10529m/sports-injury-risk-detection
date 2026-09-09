import sqlite3
import json
import os

path = r"d:\Infosys certificates\Infosys Project\sports-injury-detection\sql_app.db"

with open(r"d:\Infosys certificates\Infosys Project\sports-injury-detection\db_report_detail.txt", "w") as out:
    out.write(f"=== DB: {path} ===\n")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # 1. Videos
    cur.execute("SELECT * FROM videos")
    videos = [dict(row) for row in cur.fetchall()]
    out.write(f"VIDEOS:\n{json.dumps(videos, indent=2, default=str)}\n\n")
    
    # 2. Analysis Results
    cur.execute("SELECT * FROM analysis_results")
    analysis = [dict(row) for row in cur.fetchall()]
    out.write(f"ANALYSIS RESULTS:\n{json.dumps(analysis, indent=2, default=str)}\n\n")

    # 3. Injury Predictions
    cur.execute("SELECT * FROM injury_predictions")
    preds = [dict(row) for row in cur.fetchall()]
    out.write(f"INJURY PREDICTIONS:\n{json.dumps(preds, indent=2, default=str)}\n\n")

    # 4. Pose Data
    cur.execute("SELECT pose_id, video_id, athlete_id FROM pose_data")
    poses = [dict(row) for row in cur.fetchall()]
    out.write(f"POSE DATA SUMMARY:\n{json.dumps(poses, indent=2, default=str)}\n\n")
    
    for p in poses:
        vid_id = p["video_id"]
        out.write(f"--- Detail for PoseData of Video {vid_id} ---\n")
        cur.execute("SELECT frames, keypoints FROM pose_data WHERE video_id = ?", (vid_id,))
        row = cur.fetchone()
        if row:
            frames_raw = row["frames"]
            keypoints_raw = row["keypoints"]
            
            frames = json.loads(frames_raw) if frames_raw else None
            keypoints = json.loads(keypoints_raw) if keypoints_raw else None
            
            out.write(f"  frames type: {type(frames)}\n")
            if isinstance(frames, list):
                out.write(f"  frames length: {len(frames)}\n")
                if len(frames) > 0:
                    out.write(f"  frame[0] keys: {list(frames[0].keys()) if isinstance(frames[0], dict) else type(frames[0])}\n")
                    if isinstance(frames[0], dict) and "landmarks" in frames[0]:
                        out.write(f"  frame[0]['landmarks'] len: {len(frames[0]['landmarks']) if isinstance(frames[0]['landmarks'], list) else type(frames[0]['landmarks'])}\n")
                        if isinstance(frames[0]['landmarks'], list) and len(frames[0]['landmarks']) > 0:
                            out.write(f"  sample landmark 0: {frames[0]['landmarks'][0]}\n")
            
            out.write(f"  keypoints type: {type(keypoints)}\n")
            if isinstance(keypoints, dict):
                out.write(f"  keypoints keys: {list(keypoints.keys())}\n")
                if "telemetry" in keypoints:
                    out.write(f"  keypoints['telemetry'] len: {len(keypoints['telemetry']) if isinstance(keypoints['telemetry'], list) else type(keypoints['telemetry'])}\n")
                    if isinstance(keypoints['telemetry'], list) and len(keypoints['telemetry']) > 0:
                        out.write(f"  sample telemetry[0]: {keypoints['telemetry'][0]}\n")

    conn.close()
