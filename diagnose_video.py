import sqlite3
import os
import cv2

db_path = "sql_app.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

with open("diagnose_report.txt", "w", encoding="utf-8") as f:
    f.write("==================================================\n")
    f.write("STEP 1: FINDING REAL PROCESSED VIDEO FOR COMPLETED VIDEOS\n")
    f.write("==================================================\n")

    cur.execute("SELECT video_id, activity, video_url, processing_status FROM videos WHERE processing_status = 'completed'")
    completed_videos = cur.fetchall()

    if not completed_videos:
        f.write("No completed videos found in DB!\n")
    else:
        for vid_id, activity, video_url, status in completed_videos:
            f.write(f"Video ID          : {vid_id}\n")
            f.write(f"Activity          : {activity}\n")
            f.write(f"Status            : {status}\n")
            f.write(f"DB video_url      : {video_url}\n")
            
            clean_url = video_url.replace("\\", "/")
            filename = os.path.basename(clean_url)
            processed_path = os.path.join("uploads", "processed", filename)
            if not os.path.exists(processed_path) and not filename.startswith("processed_"):
                processed_path = os.path.join("uploads", "processed", f"processed_{filename}")
                
            abs_path = os.path.abspath(processed_path)
            exists = os.path.exists(abs_path)
            size_bytes = os.path.getsize(abs_path) if exists else 0
            ext = os.path.splitext(abs_path)[1]
            
            f.write(f"Processed Filename: {os.path.basename(abs_path)}\n")
            f.write(f"Absolute Path     : {abs_path}\n")
            f.write(f"File Exists       : {exists}\n")
            f.write(f"File Size         : {size_bytes} bytes ({size_bytes / (1024*1024):.2f} MB)\n")
            f.write(f"Extension         : {ext}\n\n")
            
            f.write("==================================================\n")
            f.write("STEP 2: VERIFYING VIDEO CODEC & CONTAINER DETAILS\n")
            f.write("==================================================\n")
            if exists and size_bytes > 0:
                cap = cv2.VideoCapture(abs_path)
                if cap.isOpened():
                    fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
                    fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)])
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    duration_sec = frame_count / fps if fps > 0 else 0
                    cap.release()
                    
                    f.write(f"OpenCV FourCC Codec : '{fourcc_str}' (FourCC Int: {fourcc_int})\n")
                    f.write(f"Resolution         : {width} x {height}\n")
                    f.write(f"FPS                : {fps}\n")
                    f.write(f"Frame Count        : {frame_count}\n")
                    f.write(f"Duration (seconds) : {duration_sec:.2f}s\n\n")
                    
                    if fourcc_str.lower() == "mp4v":
                        f.write("[CRITICAL DIAGNOSIS FINDING]:\n")
                        f.write("  Codec is 'mp4v' (MPEG-4 Part 2). HTML5 <video> elements in web browsers (Chrome/Edge/Firefox)\n")
                        f.write("  DO NOT support 'mp4v' for native video playback!\n")
                        f.write("  This causes the video player to display duration 0:00 and a grey/blank screen.\n")
                        f.write("  Web browsers require H.264 ('avc1') video codec in MP4 container.\n")
                else:
                    f.write("OpenCV failed to open video file!\n")
            f.write("--------------------------------------------------\n\n")

conn.close()
