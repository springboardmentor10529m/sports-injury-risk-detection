import sqlite3
import os
import json
import urllib.request
import cv2

db_path = "sql_app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

with open("debug_trace_results.txt", "w", encoding="utf-8") as out:
    out.write("==================================================\n")
    out.write("STEP 1: FINDING REAL VIDEO IN DB & FILESYSTEM\n")
    out.write("==================================================\n")
    cur.execute("SELECT video_id, filename, video_url, processing_status, created_at FROM videos WHERE processing_status = 'completed'")
    rows = cur.fetchall()

    if not rows:
        out.write("No completed videos found in DB!\n")
    else:
        for vid_id, orig_filename, video_url, status, created_at in rows:
            out.write(f"Video ID          : {vid_id}\n")
            out.write(f"Original Filename : {orig_filename}\n")
            out.write(f"DB video_url      : {video_url}\n")
            out.write(f"Status            : {status}\n")
            out.write(f"Created At        : {created_at}\n")
            
            uploads_abs = os.path.abspath("uploads")
            raw_path = os.path.join(uploads_abs, "raw", os.path.basename(video_url))
            proc_filename = f"processed_{os.path.basename(video_url)}"
            if "processed_" in os.path.basename(video_url):
                proc_filename = os.path.basename(video_url)
            proc_path = os.path.join(uploads_abs, "processed", proc_filename)
            
            out.write(f"Raw file path     : {raw_path} (Exists: {os.path.exists(raw_path)})\n")
            out.write(f"Processed path    : {proc_path} (Exists: {os.path.exists(proc_path)})\n")
            if os.path.exists(proc_path):
                out.write(f"Processed Size    : {os.path.getsize(proc_path)} bytes\n")
                
                out.write("\n" + "=" * 50 + "\n")
                out.write("STEP 2: VERIFYING VIDEO FILE CODEC & PROPS\n")
                out.write("=" * 50 + "\n")
                cap = cv2.VideoCapture(proc_path)
                if cap.isOpened():
                    fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
                    fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)])
                    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    dur = frame_count / fps if fps > 0 else 0
                    cap.release()
                    
                    out.write(f"FourCC Codec     : '{fourcc_str}' (FourCC Int: {fourcc_int})\n")
                    out.write(f"Resolution       : {w} x {h}\n")
                    out.write(f"FPS              : {fps}\n")
                    out.write(f"Total Frames     : {frame_count}\n")
                    out.write(f"Duration         : {dur:.2f} seconds\n")
                else:
                    out.write("Failed to open processed video with OpenCV\n")
                    
            out.write("\n" + "=" * 50 + "\n")
            out.write("STEP 3 & 4: TESTING BACKEND API & HTTP MEDIA SERVING\n")
            out.write("=" * 50 + "\n")
            api_url = f"http://127.0.0.1:8000/videos/{vid_id}/analysis"
            try:
                req = urllib.request.Request(api_url)
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    out.write("API JSON Response for Analysis:\n")
                    out.write(f"  filepath returned: '{data.get('filepath')}'\n")
                    out.write(f"  video_id         : {data.get('video_id')}\n")
                    out.write(f"  status           : {data.get('status')}\n")
                    out.write(f"  risk_level       : {data.get('risk_level')}\n")
                    out.write(f"  risk_score       : {data.get('risk_score')}\n")
                    
                    video_subpath = data.get('filepath', '')
                    if video_subpath:
                        clean_subpath = video_subpath.replace('\\', '/')
                        if not clean_subpath.startswith('/'):
                            clean_subpath = '/' + clean_subpath
                        full_media_url = f"http://127.0.0.1:8000{clean_subpath}"
                        out.write(f"\nTesting Full Media HTTP URL: {full_media_url}\n")
                        
                        media_req = urllib.request.Request(full_media_url)
                        with urllib.request.urlopen(media_req) as media_resp:
                            out.write(f"  HTTP Status        : {media_resp.status}\n")
                            out.write(f"  Content-Type       : {media_resp.headers.get('Content-Type')}\n")
                            out.write(f"  Content-Length     : {media_resp.headers.get('Content-Length')} bytes\n")
                            out.write(f"  Accept-Ranges      : {media_resp.headers.get('Accept-Ranges')}\n")
                            
                        range_req = urllib.request.Request(full_media_url, headers={"Range": "bytes=0-100"})
                        with urllib.request.urlopen(range_req) as range_resp:
                            out.write(f"  Range Request Status: {range_resp.status} (Content-Range: {range_resp.headers.get('Content-Range')})\n")
            except Exception as e:
                out.write(f"API Request Exception: {e}\n")
            out.write("-" * 50 + "\n\n")

conn.close()
os._exit(0)
