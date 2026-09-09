import os
import sys
import sqlite3

db_path = "sql_app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT video_id, video_url, processing_status FROM videos WHERE processing_status = 'completed'")
rows = cur.fetchall()

uploads_dir = os.path.abspath("uploads")

print(f"Found {len(rows)} completed videos in database:")
for video_id, video_url, status in rows:
    video_url_clean = (video_url or "").replace("\\", "/")
    if video_url_clean and not video_url_clean.startswith("/"):
        video_url_clean = "/" + video_url_clean

    if "/uploads/raw/" in video_url_clean:
        raw_filename = video_url_clean.split("/")[-1]
        processed_filename = f"processed_{raw_filename}"
        processed_rel = f"/uploads/processed/{processed_filename}"
        processed_abs = os.path.join(uploads_dir, "processed", processed_filename)
        if os.path.exists(processed_abs):
            video_url_clean = processed_rel

    disk_path = os.path.join(uploads_dir, video_url_clean.replace("/uploads/", ""))
    exists = os.path.exists(disk_path)
    print(f"Video ID: {video_id}")
    print(f"  DB video_url : {video_url}")
    print(f"  API filepath : {video_url_clean}")
    print(f"  Physical path: {disk_path}")
    print(f"  Exists on disk: {exists}")
    print("-" * 50)

conn.close()
