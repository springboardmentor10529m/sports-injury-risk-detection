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
- The `Agents.md` file is intentionally ignored by `.gitignore` and should not be committed to remote branches.
- All development for this session should occur on the `danny-soundaraj` branch.

Docker / full local stack
------------------------
This repo includes a `docker-compose.yml` to run InfluxDB OSS, the backend, and the frontend together.

Set environment variables (example in `backend/.env.example`) and then:

```bash
docker-compose up --build
```

After InfluxDB starts, open http://localhost:8086 to initialize your organization, bucket, and token (or use the `influx` CLI).

Firebase
--------
Creating a Firebase project and deploying requires the Firebase CLI and an authenticated user. Example commands (run locally):

```bash
npm install -g firebase-tools
firebase login
firebase projects:create your-project-id --display-name "SIR-Project"
firebase init hosting
firebase deploy --only hosting
```

Replace `your-project-id` with the project id you choose. Update `.firebaserc` with the project id.
# sports-injury-risk-detection