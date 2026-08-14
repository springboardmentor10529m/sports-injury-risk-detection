# Sports Injury Risk Detection (Skeleton)

Minimal project skeleton for the Sports Injury Risk Detection platform.

This repository currently contains a basic frontend and backend skeleton with no
AI or database integration. Work is done on the `danny-soundaraj` branch.

Structure:

- `backend/` — FastAPI skeleton with `app/main.py` (health and info endpoints)
- `frontend/` — React skeleton (App.js, public/index.html)
- `Agents.md` — local agent rules (ignored via `.gitignore`)

Quick start

Backend:
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (development):
```bash
cd frontend
npm install
npm start
```

Notes:
- The `Agents.md` file is intentionally ignored by `.gitignore` and should not be
  committed to remote branches.
- All development for this session should occur on the `danny-soundaraj` branch.
# sports-injury-risk-detection