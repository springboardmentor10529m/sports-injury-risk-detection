# Backend (skeleton)

This is a minimal FastAPI backend skeleton for the Sports Injury Risk Detection project.

Run locally:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Endpoints:
- `GET /health` - basic health check
- `GET /api/info` - project info (skeleton)
