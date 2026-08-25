# InjuryGuard AI — Full Platform (All 5 Roles)

Real, working implementation of the video → pose estimation → biomechanics →
injury risk → recommendations pipeline, now with all 5 roles from the spec:
**Athlete, Coach, Physiotherapist, Sports Scientist, and Administrator.**
No mocked data anywhere: every number a user sees is computed from real
uploaded videos, real profile data, or real database queries.

## What's real here

- **Pose estimation**: MediaPipe BlazePose (Tasks API, `pose_landmarker_full`
  model), 33 keypoints, run frame-by-frame on your uploaded video.
- **Biomechanics**: joint angles, knee valgus, trunk lean, symmetry, hip
  stability, balance, stride length, and a fatigue signal — all computed with
  real vector math on the detected 3D keypoints (`backend/app/services/biomechanics.py`).
- **Risk scoring**: the exact weighted formula from the spec (35% biomechanical
  deviation / 20% historical injury / 20% asymmetry / 15% training load / 10%
  fatigue), fully deterministic and auditable (`backend/app/services/risk_scoring.py`).
- **Recommendations**: rule-based, each one only fires when a specific
  computed metric crosses a documented threshold (`backend/app/services/recommendations.py`).
- **Role-based access control**: a coach/physio/scientist can only see an
  athlete's data after that athlete is explicitly linked to them (by email) -
  enforced server-side on every request, not just hidden in the UI. Verified
  with real cross-role tests (see below).
- **Admin**: real platform stats from live DB queries (user counts by role,
  video pipeline status breakdown, platform-wide average risk), user
  activation/deactivation that's actually enforced at login, and role changes.
- **Physiotherapist clinical notes**: real free-text notes logged against an
  athlete by phase (mobility/strength/return-to-sport) - not a fabricated
  "recovery %" that no pipeline actually computes.
- **Sports Scientist analytics**: real aggregate stats (avg risk, category
  distribution, avg biomechanics metrics) and a real Pearson correlation
  between training-load risk and overall risk, computed across the
  scientist's linked athlete dataset with numpy.

## Architecture

```
frontend/          React 19 + Vite, plain CSS, recharts for the trend chart
backend/
  app/
    main.py               FastAPI app, CORS, router registration
    models.py              SQLAlchemy models (User + 4 role profiles, AthleteLink, ClinicalNote, VideoAnalysis)
    schemas.py              Pydantic request/response schemas
    core/
      config.py             Settings (.env driven)
      database.py            SQLAlchemy engine/session
      security.py            JWT + bcrypt password hashing
    routers/
      auth.py                 Registration (all 5 roles) + login
      athlete.py               Athlete's own profile
      video.py                  Video upload + pipeline trigger
      analysis.py                Athlete's own dashboard/history
      coach.py                    Team roster, add/remove athletes, athlete detail
      physio.py                    Patient roster, athlete detail, clinical notes
      scientist.py                  Dataset roster, aggregate analytics
      admin.py                      Platform stats, user management
      deps.py                        Role guards + AthleteLink access-control dependency
    services/
      pose_estimation.py     MediaPipe wrapper
      biomechanics.py         Joint-angle / symmetry / fatigue math
      risk_scoring.py          Weighted risk formula
      recommendations.py       Rule engine
      pipeline.py               Orchestrates the full pipeline + status updates
      roster.py                  Shared roster-building helper (coach/physio/scientist)
    video_processing/
      frame_extractor.py       OpenCV frame sampling
    ml_models/                 Pose model bundle goes here (downloaded, not committed)
  scripts/
    download_models.sh         Fetches the MediaPipe model bundle
    create_admin.py             Bootstraps the first admin account (CLI)
docker-compose.yml            Postgres + backend, for a spec-compliant deployment
```

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # or use your preferred env manager
pip install -r requirements.txt

cp .env.example .env
# Defaults to SQLite for zero-setup local dev. Switch DATABASE_URL to Postgres
# in .env when you want the spec-compliant database (see docker-compose.yml).

./scripts/download_models.sh   # fetches pose_landmarker_full.task (~30MB) — required, run once

uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs` once running.

**Create the first admin account** (admin accounts aren't publicly
self-registrable, per the spec):
```bash
python3 scripts/create_admin.py
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env    # points VITE_API_BASE_URL at http://localhost:8000
npm install
npm run dev
```

Open `http://localhost:5173`. Go to **Sign up** to register as an Athlete,
Coach, Physiotherapist, or Sports Scientist. Log in as the admin you created
above to reach `/admin/dashboard`.

### 3. (Optional) Postgres via Docker

```bash
docker compose up --build
```

## Using the multi-role features

1. Register an **Athlete** account and fill in their profile.
2. Register a **Coach** (or Physiotherapist / Sports Scientist) account.
3. From that staff account's dashboard, use **Add athlete** / **Add patient**
   / **Add to dataset** and enter the athlete's email — this creates the
   access-control link. Until this link exists, that staff account gets a
   403 if it tries to query that athlete directly.
4. Have the athlete upload and complete a video analysis (needs the pose
   model downloaded, see above) — the staff dashboards will then show real
   risk scores, biomechanics, and (for physios) let you log clinical notes.
5. Log in as the **Admin** to see live platform-wide stats and manage any
   user's active/deactivated status or role.

## Scope & honest limitations (read before demoing)

A few things worth understanding about the pipeline itself:

- **No calibrated camera** means metrics like knee valgus and stride length
  are computed from MediaPipe's hip-centered "world landmarks" (approximate
  metric scale), not true goniometry. They're internally consistent and
  comparable run-to-run for the same athlete/camera setup, but shouldn't be
  read as clinical-grade measurements.
- **No trained ML risk model.** The risk engine is the deterministic
  weighted formula from the spec, not a classifier — there's no labeled
  injury dataset to train one on yet. Every sub-score is traceable to a
  specific rule in `risk_scoring.py`.
- **No invite/acceptance flow.** A coach/physio/scientist adds an athlete by
  email and the link is created immediately (no athlete-side approval step).
  This was a deliberate scope simplification - add an `AthleteLink.status`
  field (pending/accepted) and a confirmation endpoint if you want that.
- **Background processing runs in-process** (FastAPI `BackgroundTasks`), fine
  for local use and small deployments. For production concurrency, swap this
  for Celery/RQ + a task queue — the pipeline function itself
  (`services/pipeline.py`) doesn't need to change.
- **Not built yet**: notification/alert system, PDF/Excel export, calendar,
  organizations/multi-tenant grouping. The data model and routing already
  separate cleanly so these are additive.
- **All output is decision support, not diagnosis** — surfaced explicitly in
  the recommendations payload and the UI.

