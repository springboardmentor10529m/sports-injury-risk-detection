# AI Sports Injury Risk Detection Platform

> **Undergraduate Capstone Project — Infosys Springboard**
> *AI-powered video analysis, biomechanical screening, pose estimation, and injury risk prediction platform.*

---

## Project Overview

The **AI Sports Injury Risk Detection Platform** is a full-stack healthcare and athletic performance web application that processes uploaded movement videos, extracts 33 3D skeletal landmarks via MediaPipe, computes joint kinematics, evaluates movement quality, detects biomechanical risk indicators, and presents actionable insights through an interactive dashboard — all without making clinical medical diagnoses.

> ⚠️ **Research Disclaimer**: This platform provides biomechanical movement risk screening and technique evaluation based on video pose landmarks. It is intended solely for educational, athletic training, and preventative screening purposes and does **NOT** provide medical diagnosis.

---

## Milestone Progress

| Week | Focus Area | Status |
|------|-----------|--------|
| **Week 1–2** | System Architecture, Auth, RBAC, Athlete Profiles, Injury CRUD, Video Upload Pipeline | ✅ Complete |
| **Week 3** | AI Computer Vision Pipeline, MediaPipe Pose Estimation, Biomechanical Analysis | ✅ Complete |
| **Week 4** | Advanced Kinematics, Movement Phase Detection, PDF/Excel Reports, Frontend Dashboard | ✅ Complete |

---

## Architecture & Technology Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │               React Single Page App (UI)                │
   │      (Tailwind CSS, Axios, Lucide Icons, Chart.js)      │
   └───────────────────────────┬─────────────────────────────┘
                               │ HTTP / REST APIs (JWT Bearer)
   ┌───────────────────────────▼─────────────────────────────┐
   │                    FastAPI Backend                      │
   │      (Python 3.10+, Pydantic, Passlib, PyJWT)           │
   └───────────────┬───────────────────────────┬─────────────┘
                   │                           │
   ┌───────────────▼─────────────┐   ┌─────────▼─────────────┐
   │     SQLAlchemy ORM Data     │   │  Modular AI Services  │
   │  (PostgreSQL / SQLite DB)   │   │  (Pose, Kinematics,   │
   └─────────────────────────────┘   │   Risk, Anomaly)      │
                                     └───────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | React SPA, Tailwind CSS, Axios, Chart.js, Lucide Icons |
| **Backend** | Python FastAPI, Pydantic, Uvicorn, CORS Middleware |
| **Database** | SQLAlchemy ORM — PostgreSQL (`DATABASE_URL`) / SQLite fallback |
| **AI / CV** | MediaPipe Pose Landmarker, OpenCV, NumPy |
| **Security** | JWT Bearer Tokens, bcrypt password hashing, RBAC |
| **Reporting** | ReportLab (PDF), OpenPyXL (Excel) |
| **Testing** | Pytest, HTTPX |
| **Containerization** | Docker, Docker Compose |

---

## Folder Structure

```
sports-injury-detection/
├── backend/
│   ├── app/
│   │   ├── api/                       # Modular API router handlers
│   │   ├── core/                      # Core config & settings
│   │   ├── database/                  # SQLAlchemy engine & session
│   │   ├── models/                    # ORM models (Users, Athletes, Injuries, Videos)
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── pose_service.py        # MediaPipe landmark extraction & skeleton overlay
│   │   │   ├── biomechanics_service.py    # Joint angles, ROM, symmetry, trunk lean
│   │   │   ├── movement_analysis_service.py  # Quality scoring & rule-based anomaly detection
│   │   │   └── video_service.py       # Background pipeline orchestrator & DB persistence
│   │   ├── auth.py                    # JWT & bcrypt authentication
│   │   ├── main.py                    # FastAPI application & all routes
│   │   ├── models.py                  # Database ORM models
│   │   ├── schemas.py                 # Pydantic schemas
│   │   ├── risk_engine.py             # Biomechanical risk engine
│   │   ├── recommender.py             # Corrective exercise recommendations
│   │   └── report_exporter.py         # PDF & Excel report generator
│   ├── seed.py                        # Demo data seed script
│   ├── test_api.py                    # Pytest API test suite
│   └── requirements.txt               # Python dependencies
├── frontend/
│   └── index.html                     # React SPA (served by FastAPI)
├── datasets/
│   └── README.md                      # Reference dataset documentation
├── uploads/
│   └── processed/                     # Annotated output videos (MP4)
├── pose_landmarker_full.task          # MediaPipe Pose Landmarker model
├── app.py                             # Server launcher with dependency auto-check
├── run_server.py                      # Uvicorn launcher
├── start_app.bat                      # Windows batch launcher
├── docker-compose.yml                 # Multi-service Docker Compose config
├── Dockerfile                         # Application Docker image
├── test_e2e_week34.py                 # End-to-end test suite (Week 3–4)
├── .env.example                       # Environment variable template
├── WEEK_1_2_COMPLETION.md             # Week 1–2 milestone report
├── WEEK_3_COMPLETION.md               # Week 3 milestone report
├── WEEK_3_4_COMPLETION.md             # Week 3–4 milestone report
└── README.md                          # This file
```

---

## Week 1–2: Foundation, Auth & Data Layer

### System Architecture & Setup
- **Full-Stack Integration**: FastAPI backend connected to a React SPA via REST APIs and JWT authentication.
- **Database Architecture**: SQLAlchemy ORM supporting PostgreSQL with automatic SQLite fallback (`sql_app.db`).
- **Environment**: Standardized `.env` configuration and `requirements.txt`.

### Authentication & Role-Based Access Control (RBAC)
- Full registration & login with bcrypt password hashing and JWT access token generation.
- **5 User Roles**:

| Role | Dashboard Capabilities |
|------|----------------------|
| **Athlete** | Personal Dashboard, Physical Profile, Injury History, Video Upload, Biomechanical Reports |
| **Coach** | Team Athlete Roster, High-Risk Alerts, Team Metrics |
| **Physiotherapist** | Injury History Overview, Active Rehab Tracking, Joint Alignment Metrics |
| **Sports Scientist** | Dataset Summaries, Anomaly Telemetry, Biomechanical Insights |
| **Administrator** | User Management, System Analytics, Background Processing Jobs |

### Athlete Profile Management
- Full profile CRUD: Sport, Position, Age, Height, Weight, Training Load, Flexibility, Strength, Balance, Endurance, Coach Notes.
- REST APIs: `GET /athlete/profile`, `POST /athlete/profile`, `GET /athletes/{id}`, `PUT /athletes/{id}`

### Injury History CRUD
- **View, Add, Edit, Delete** injury records (Injury Type, Body Part, Severity, Injury Date, Recovery Date, Remarks).
- REST APIs: `GET /athletes/{id}/injuries`, `POST /athletes/{id}/injuries`, `PUT /injuries/{id}`, `DELETE /injuries/{id}`

### Video Upload Pipeline
- Upload form supporting 8 activity types: *Running, Sprinting, Jumping, Squatting, Landing, Throwing, Cutting Movement, Sport-Specific Drill*.
- Asynchronous background processing with status progression: `UPLOADED` → `VALIDATING` → `READY_FOR_ANALYSIS` / `COMPLETED`.
- Video metadata tracking: Duration, FPS, Resolution, Quality Score.

### Demo Seed Data
- `python backend/seed.py` — generates 5 role-specific demo accounts, sample athlete profiles, injury records, and video analyses.

---

## Week 3: AI Computer Vision & Biomechanical Pipeline

### Modular Service Architecture

```
backend/app/services/
├── pose_service.py              # MediaPipe Landmark Extraction & Skeleton Drawing
├── biomechanics_service.py      # Joint Kinematics, ROM, Symmetry, Trunk Lean, Balance
├── movement_analysis_service.py # Quality Scoring & Rule-Based Anomaly Detection
└── video_service.py             # Background Pipeline Orchestrator & Persistence
```

### PoseService (`pose_service.py`)
- Initializes MediaPipe Pose Landmarker with the `pose_landmarker_full.task` model.
- Extracts **33 standard keypoints per frame** (X, Y, Z coordinates + visibility/confidence score).
- Renders HUD overlay: `@Frame {idx}` counter and `Conf: {score}%` indicator.
- Draws skeletal topology — cyan connector lines + red landmark nodes — onto each video frame.
- Exports annotated MP4 files to `uploads/processed/`.

### BiomechanicsService (`biomechanics_service.py`)
- Calculates 2D joint angles via vector geometry for Knees, Hips, Elbows, and Shoulders.
- Computes sequence-level metrics:
  - **Range of Motion (ROM)**: `max_angle − min_knee_angle`
  - **Limb Symmetry Ratio (%)**: `100 − (|Left_ROM − Right_ROM| / max_ROM × 100)`
  - **Lateral Pelvic Tilt**: Bilateral hip height difference analysis
  - **Forward Trunk Lean (°)**: Angle between vertical spine line and hip-shoulder axis
  - **Stride Displacement (m)**: Foot landmark trajectory distance
  - **Balance / Center-of-Mass Stability Score**

### MovementAnalysisService (`movement_analysis_service.py`)
- **Movement Quality Score (0–100%)** — deterministic formula:

| Component | Weight |
|-----------|--------|
| Pose Confidence | 15% |
| Limb Symmetry | 25% |
| Trunk Control | 20% |
| Stability | 20% |
| Smoothness & Structural Alignment | 20% |

- **Rule-based anomaly detection** (non-clinical terminology):
  - Inward knee alignment deviation (knee valgus)
  - Trunk forward overlean
  - Lateral pelvic tilt
  - Limb flexion asymmetry

### VideoService (`video_service.py`)
- Manages full background job lifecycle:
  `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`
- Frame-by-frame pose detection → overlay rendering → output video writing → DB persistence.
- High-fidelity fallback telemetry generator for robust cross-system performance.

---

## Week 4: Advanced Kinematics, Phase Detection & Reporting

### Enhanced Pose Estimation Engine
- **Frame confidence overlays**: Real-time `Conf: {score}%` per frame.
- **3D landmark tracking**: 33 MediaPipe keypoints (normalized X, Y, Z) per frame.

### Advanced Biomechanical Kinematic Calculations
- **Joint Angle Kinematics**:
  - Knee Flexion: Hip–Knee–Ankle vector geometry
  - Hip Flexion: Shoulder–Hip–Knee vector geometry
  - Elbow Flexion: Shoulder–Elbow–Wrist vector geometry
  - Shoulder Extension/Flexion: Hip–Shoulder–Elbow vector geometry
- **Knee Valgus Ratio**: Midpoint distance ratio between bilateral knees vs bilateral hips
- **Movement Phase Detection**: Automatic classification into:
  - `Standing` → `Descending (Flexion)` → `Bottom Position (Peak Depth)` → `Ascending (Extension)`
- **Movement Smoothness**: Acceleration variance analysis across keypoint trajectories
- **Landing Mechanics**: Peak knee/hip flexion angle capture during impact phase
- **Structural Joint Alignment Score**: Kinetic chain stack alignment evaluation

### Extended Backend API & Database Persistence

| Endpoint | Description |
|---------:|-------------|
| `POST /videos/upload` | Upload video, register job, launch background pipeline |
| `GET /videos/{id}/status` | Real-time job status, current step, frame count |
| `GET /videos/{id}/pose` | Full 33-landmark telemetry per frame (JSON) |
| `GET /videos/{id}/processed-video` | Stream annotated MP4 with skeletal overlay |
| `GET /videos/{id}/analysis` | Aggregated metrics, phase timeline, anomalies, recommendations |
| `GET /analyses/{id}` | Individual analysis record |
| `GET /reports/{id}/biomechanics` | Full biomechanical assessment summary |
| `GET /reports/{id}/pdf` | Downloadable PDF report |
| `GET /reports/{id}/excel` | Downloadable Excel report |

### Interactive Frontend Dashboard
- **Skeletal Landmark Video Streaming**: HTML5 video player with annotated MP4 overlay.
- **Biomechanical Telemetry Timeline**: Chart.js interactive graph — Knee & Hip angles over time.
- **Movement Observations & Anomalies**: Flagged events with timestamps, affected joints, and severity.
- **Medical Disclaimer**: Non-clinical research prototype disclaimer across all UI views and exports.

---

## Quick Start

### Prerequisites
- Python 3.9+
- Git (optional)
- MediaPipe model: `pose_landmarker_full.task` (included in repo root)

### 1. Install Dependencies

```powershell
cd "d:\Infosys certificates\Infosys Project\sports-injury-detection"
pip install -r backend/requirements.txt
```

### 2. Configure Environment

```powershell
copy .env.example .env
# Edit .env if using PostgreSQL; SQLite is used automatically otherwise
```

### 3. Seed Demo Data

```powershell
python backend/seed.py
```

### 4. Launch the Application

```powershell
# Option A – smart launcher
python app.py

# Option B – direct Uvicorn
python run_server.py

# Option C – Windows batch
start_app.bat
```

Open: **`http://127.0.0.1:8000`**
API Docs (Swagger): **`http://127.0.0.1:8000/docs`**

### 5. Docker (Optional)

```powershell
docker-compose up --build
```

---

## Demo Credentials

All demo accounts use password: **`Password123!`**

| Role | Email |
|------|-------|
| **Athlete** | `athlete@demo.com` |
| **Coach** | `coach@demo.com` |
| **Physiotherapist** | `physio@demo.com` |
| **Sports Scientist** | `scientist@demo.com` |
| **Administrator** | `admin@demo.com` |

---

## Demo Walkthrough (Mentor Presentation)

1. **Launch & Open**: Navigate to `http://127.0.0.1:8000`.
2. **Login as Athlete**: `athlete@demo.com` / `Password123!`.
3. **Athlete Dashboard**: View injury risk summary, latest risk category, video list.
4. **Profile Update**: Edit physical metrics (Height, Weight, Training Load) and save.
5. **Injury History CRUD**:
   - View existing records → **Log Injury** (e.g., *Quadricep Strain*) → Edit → Delete.
6. **Video Upload & Analysis**:
   - Click **Upload Video** → select activity (e.g., *Squatting*) → upload MP4 → click **Start Analysis**.
   - Watch live status progression: `PROCESSING` → `POSE_ESTIMATION` → `BIOMECHANICAL_ANALYSIS` → `COMPLETED`.
7. **View Analysis**: Click **View Analysis** on a completed video to see:
   - Annotated skeletal overlay video
   - Biomechanical kinematics timeline (Chart.js)
   - Movement quality score & phase classification
   - Flagged anomaly events with timestamps
   - Corrective exercise recommendations
   - Export PDF / Excel report
8. **Role Switching**: Log out → log in as `coach@demo.com` or `admin@demo.com` for role-specific views.
9. **API Explorer**: `http://127.0.0.1:8000/docs` — Swagger interactive documentation.

---

## Testing

### API Unit & Integration Tests

```powershell
python -m pytest backend/test_api.py -v
```

### End-to-End Pipeline Tests (Week 3–4)

```powershell
python -m pytest test_e2e_week34.py -v
```

Tests cover: keypoint extraction, kinematic calculations, movement quality scoring, database persistence, PDF/HTML report generation, and frontend video streaming.

---

## Dataset References

See [`datasets/README.md`](datasets/README.md) for documentation on reference datasets used for research and model validation:

- **Human3.6M** — Large-scale 3D human pose dataset
- **MPII Human Pose** — 2D human pose benchmark
- **COCO Keypoints** — Multi-person keypoint detection dataset
- **SportsPose** — Sports-specific pose estimation dataset
- **FIFA Injury Dataset** — Professional football injury epidemiology data

---

## Milestone Completion Summary

| Milestone | Deliverables | Status |
|-----------|-------------|--------|
| **Week 1–2** | System architecture, FastAPI + React stack, JWT RBAC (5 roles), athlete profile + injury CRUD, video upload pipeline, seed data | ✅ Complete |
| **Week 3** | MediaPipe pose extraction, BiomechanicsService, MovementAnalysisService, VideoService pipeline, annotated video export, API endpoints | ✅ Complete |
| **Week 4** | Advanced joint kinematics, movement phase detection, Movement Quality Score, anomaly flags, PDF/Excel report export, interactive Chart.js dashboard | ✅ Complete |

---

*Project developed as part of the **Infosys Springboard** undergraduate capstone program.*
