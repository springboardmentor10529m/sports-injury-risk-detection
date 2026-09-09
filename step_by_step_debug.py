import sqlite3
import os
import json
import urllib.request
import cv2

db_path = "sql_app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=" * 70)
print("STEP 1: FINDING REAL VIDEO IN DB & FILESYSTEM")
print("=" * 70)
cur.execute("SELECT video_id, filename, video_url, processing_status, created_at FROM videos WHERE processing_status = 'completed'")
rows = cur.fetchall()

if not rows:
    print("No completed videos found in DB!")
else:
    for vid_id, orig_filename, video_url, status, created_at in rows:
        print(f"Video ID          : {vid_id}")
        print(f"Original Filename : {orig_filename}")
        print(f"DB video_url      : {video_url}")
        print(f"Status            : {status}")
        print(f"Created At        : {created_at}")
        
        # Check raw & processed paths
        uploads_abs = os.path.abspath("uploads")
        raw_path = os.path.join(uploads_abs, "raw", os.path.basename(video_url))
        proc_filename = f"processed_{os.path.basename(video_url)}"
        if "processed_" in os.path.basename(video_url):
            proc_filename = os.path.basename(video_url)
        proc_path = os.path.join(uploads_abs, "processed", proc_filename)
        
        print(f"Raw file path     : {raw_path} (Exists: {os.path.exists(raw_path)})")
        print(f"Processed path    : {proc_path} (Exists: {os.path.exists(proc_path)})")
        if os.path.exists(proc_path):
            print(f"Processed Size    : {os.path.getsize(proc_path)} bytes")
            
            # STEP 2: Verify Video File Codec & Details
            print("\n" + "=" * 70)
            print("STEP 2: VERIFYING VIDEO FILE CODEC & PROPS")
            print("=" * 70)
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
                
                print(f"FourCC Codec     : '{fourcc_str}' (FourCC Int: {fourcc_int})")
                print(f"Resolution       : {w} x {h}")
                print(f"FPS              : {fps}")
                print(f"Total Frames     : {frame_count}")
                print(f"Duration         : {dur:.2f} seconds")
            else:
                print("Failed to open processed video with OpenCV")
                
        # STEP 3: Check Backend API Response
        print("\n" + "=" * 70)
        print("STEP 3 & 4: TESTING BACKEND API & HTTP MEDIA SERVING")
        print("=" * 70)
        api_url = f"http://127.0.0.1:8000/videos/{vid_id}/analysis"
        try:
            req = urllib.request.Request(api_url)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                print("API JSON Response for Analysis:")
                print(f"  filepath returned: '{data.get('filepath')}'")
                print(f"  video_id         : {data.get('video_id')}")
                print(f"  status           : {data.get('status')}")
                print(f"  risk_level       : {data.get('risk_level')}")
                print(f"  risk_score       : {data.get('risk_score')}")
                
                video_subpath = data.get('filepath', '')
                if video_subpath:
                    clean_subpath = video_subpath.replace('\\', '/')
                    if not clean_subpath.startswith('/'):
                        clean_subpath = '/' + clean_subpath
                    full_media_url = f"http://127.0.0.1:8000{clean_subpath}"
                    print(f"\nTesting Full Media HTTP URL: {full_media_url}")
                    
                    media_req = urllib.request.Request(full_media_url)
                    with urllib.request.urlopen(media_req) as media_resp:
                        print(f"  HTTP Status        : {media_resp.status}")
                        print(f"  Content-Type       : {media_resp.headers.get('Content-Type')}")
                        print(f"  Content-Length     : {media_resp.headers.get('Content-Length')} bytes")
                        print(f"  Accept-Ranges      : {media_resp.headers.get('Accept-Ranges')}")
                        
                    range_req = urllib.request.Request(full_media_url, headers={"Range": "bytes=0-100"})
                    with urllib.request.urlopen(range_req) as range_resp:
                        print(f"  Range Request Status: {range_resp.status} (Content-Range: {range_resp.headers.get('Content-Range')})")
        except Exception as e:
            print(f"API Request Exception: {e}")
        print("-" * 70)

conn.close()
os._exit(0)
