import sqlite3
import json
import os

db_paths = [
    r"d:\Infosys certificates\Infosys Project\sports-injury-detection\sql_app.db",
    r"d:\Infosys certificates\Infosys Project\sports-injury-detection\backend\sql_app.db"
]

with open(r"d:\Infosys certificates\Infosys Project\sports-injury-detection\db_report.txt", "w") as out:
    for path in db_paths:
        out.write(f"=== DB: {path} (exists: {os.path.exists(path)}) ===\n")
        if not os.path.exists(path):
            continue
        try:
            conn = sqlite3.connect(path)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [t[0] for t in cur.fetchall()]
            out.write(f"Tables: {tables}\n")
            
            if "videos" in tables:
                cur.execute("SELECT video_id, activity, processing_status, video_url FROM videos")
                videos = cur.fetchall()
                out.write(f"Videos ({len(videos)}): {videos}\n")
                
            if "analysis_results" in tables:
                cur.execute("SELECT video_id, risk_score, risk_level, knee_valgus, trunk_lean FROM analysis_results")
                analysis = cur.fetchall()
                out.write(f"AnalysisResults ({len(analysis)}): {analysis}\n")
                
            if "pose_data" in tables:
                cur.execute("SELECT pose_id, video_id, frames, keypoints FROM pose_data")
                poses = cur.fetchall()
                out.write(f"PoseData rows: {len(poses)}\n")
                for pose in poses:
                    pose_id, vid_id, frames_json, keypoints_json = pose
                    out.write(f"  Pose ID: {pose_id}, Video ID: {vid_id}\n")
                    
                    frames = json.loads(frames_json) if frames_json else []
                    out.write(f"  frames count: {len(frames) if isinstance(frames, list) else 'Not a list'}\n")
                    if frames and isinstance(frames, list) and len(frames) > 0:
                        first_f = frames[0]
                        out.write(f"  frame[0] keys: {list(first_f.keys()) if isinstance(first_f, dict) else type(first_f)}\n")
                        if isinstance(first_f, dict):
                            for k, v in first_f.items():
                                if k == "landmarks":
                                    out.write(f"    landmarks count: {len(v) if isinstance(v, list) else type(v)}\n")
                                elif k == "telemetry":
                                    out.write(f"    telemetry: {v}\n")
                                else:
                                    out.write(f"    key {k}: {str(v)[:100]}\n")
                                    
                    keypoints = json.loads(keypoints_json) if keypoints_json else {}
                    out.write(f"  keypoints type: {type(keypoints)}\n")
                    if isinstance(keypoints, dict):
                        out.write(f"  keypoints keys: {list(keypoints.keys())}\n")
                        if "telemetry" in keypoints:
                            t_data = keypoints["telemetry"]
                            out.write(f"  keypoints['telemetry'] len: {len(t_data) if isinstance(t_data, list) else type(t_data)}\n")
                            if isinstance(t_data, list) and len(t_data) > 0:
                                out.write(f"  keypoints['telemetry'][0]: {t_data[0]}\n")
            conn.close()
        except Exception as e:
            out.write(f"Error reading DB: {e}\n")
        out.write("\n")
