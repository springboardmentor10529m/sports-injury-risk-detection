import os, sqlite3
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, os.path.abspath('backend'))
from app.main import app

client = TestClient(app)

video_id = "2e39eaffbbfe4172ae84539446b57fe0"
conn = sqlite3.connect("sql_app.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT video_url FROM videos WHERE video_id = ?", (video_id,))
row = cur.fetchone()
conn.close()

if row:
    url = row["video_url"]
    print(f"DB video_url: '{url}'")
    full_disk_path = os.path.abspath(url)
    print(f"Full disk path: '{full_disk_path}'")
    print(f"Exists on disk? {os.path.exists(url) or os.path.exists(full_disk_path)}")
    
    # Test HTTP GET via TestClient
    http_path = f"/{url.replace('\\\\', '/').replace('\\', '/')}"
    print(f"Testing HTTP GET {http_path}")
    res = client.get(http_path)
    print(f"Static route response status: {res.status_code}")
