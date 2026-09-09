import urllib.request
import sqlite3
import os

db_path = "sql_app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT video_id, video_url FROM videos WHERE processing_status = 'completed'")
rows = cur.fetchall()
conn.close()

base_url = "http://127.0.0.1:8000"

with open("http_video_report.txt", "w", encoding="utf-8") as f:
    f.write("==================================================\n")
    f.write("TESTING HTTP VIDEO SERVING & RANGE HEADERS\n")
    f.write("==================================================\n\n")

    for vid_id, raw_url in rows:
        clean_url = raw_url.replace("\\", "/")
        filename = os.path.basename(clean_url)
        if not filename.startswith("processed_"):
            filename = f"processed_{filename}"
            
        video_http_path = f"/uploads/processed/{filename}"
        full_url = f"{base_url}{video_http_path}"
        
        f.write(f"Video ID     : {vid_id}\n")
        f.write(f"HTTP URL     : {full_url}\n")
        
        # Test Standard GET Request
        try:
            req = urllib.request.Request(full_url, method="GET")
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                content_type = resp.headers.get("Content-Type")
                content_length = resp.headers.get("Content-Length")
                accept_ranges = resp.headers.get("Accept-Ranges")
                f.write(f"Standard GET Status : {status}\n")
                f.write(f"Content-Type        : {content_type}\n")
                f.write(f"Content-Length      : {content_length} bytes\n")
                f.write(f"Accept-Ranges       : {accept_ranges}\n")
        except Exception as e:
            f.write(f"Standard GET Error  : {e}\n")
            
        # Test HTTP Range Request (bytes=0-1024)
        try:
            range_req = urllib.request.Request(full_url, headers={"Range": "bytes=0-1024"}, method="GET")
            with urllib.request.urlopen(range_req) as resp:
                status = resp.status
                content_range = resp.headers.get("Content-Range")
                content_type = resp.headers.get("Content-Type")
                f.write(f"Range Request Status: {status} (Expected 206 Partial Content or 200 OK)\n")
                f.write(f"Content-Range       : {content_range}\n")
        except Exception as e:
            f.write(f"Range Request Error : {e}\n")
            
        f.write("-" * 50 + "\n\n")
        
    f.flush()

os._exit(0)
