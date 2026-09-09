import sqlite3
import json
import urllib.request

conn = sqlite3.connect("sql_app.db")
cur = conn.cursor()
cur.execute("SELECT video_id FROM videos WHERE processing_status = 'completed'")
rows = cur.fetchall()
conn.close()

for (vid_id,) in rows:
    api_url = f"http://127.0.0.1:8000/videos/{vid_id}/analysis"
    print(f"Calling API: {api_url}")
    try:
        req = urllib.request.Request(api_url)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("API Response:")
            print(json.dumps(data, indent=2))
            
            filepath = data.get("filepath")
            if filepath:
                full_video_url = f"http://127.0.0.1:8000{filepath}"
                print(f"\nTesting Video HTTP URL: {full_video_url}")
                v_req = urllib.request.Request(full_video_url)
                with urllib.request.urlopen(v_req) as v_resp:
                    print(f"  HTTP Status     : {v_resp.status}")
                    print(f"  Content-Type    : {v_resp.headers.get('Content-Type')}")
                    print(f"  Content-Length  : {v_resp.headers.get('Content-Length')} bytes")
                    print(f"  Accept-Ranges   : {v_resp.headers.get('Accept-Ranges')}")
    except Exception as e:
        print(f"API Call Failed: {e}")
    print("=" * 60)
