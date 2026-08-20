# AI Sports Injury Risk Detection Platform

> **Undergraduate Capstone Project**  
> *AI-powered movement analysis, biomechanical screening, and injury risk prediction platform.*

---

## Project Overview

The **AI Sports Injury Risk Detection Platform** is a web-based healthcare and athletic performance application designed to analyze movement videos, extract skeletal landmarks, assess biomechanical kinematics (knee valgus, trunk lean, hip stability), and identify potential injury risk factors before injuries occur.

This repository implements the **Week 1–2 Milestone**, establishing the full system architecture, database structure, authentication system, role-based dashboards, athlete profile management, injury history CRUD, video upload pipeline, dataset documentation, and seed data.

---

## Architecture & Technology Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │               React Single Page App (UI)                │
   │      (Tailwind CSS, Axios, Lucide Icons, Chart.js)      │
   └───────────────────────────┬─────────────────────────────┘
                               │ HTTP / REST APIs (JWT)
   ┌───────────────────────────▼─────────────────────────────┐
   │                    FastAPI Backend                      │
   │      (Python 3.10+, Pydantic, Passlib, PyJWT)           │
   └───────────────┬───────────────────────────┬─────────────┘
                   │                           │
   ┌───────────────▼─────────────┐   ┌─────────▼─────────────┐
   │     SQLAlchemy ORM Data     │   │  Modular AI Services  │
   │  (PostgreSQL / SQLite DB)   │   │  (Pose, Kinematics)   │
   └─────────────────────────────┘   └───────────────────────┘
```

- **Frontend**: Single-Page React Web Application served directly via FastAPI (`/`), styled with Tailwind CSS, Axios, Lucide icons, and Chart.js.
- **Backend**: Python FastAPI REST framework with Pydantic validation, CORS middleware, background processing tasks, and Swagger OpenAPI documentation at `/docs`.
- **Database**: PostgreSQL support via `DATABASE_URL` with automatic SQLite fallback (`sql_app.db`).
- **Security**: JWT bearer token authentication, bcrypt password hashing, role-based access control (RBAC).

---

## Folder Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/                  # API router handlers
│   │   ├── core/                 # Core settings & config
│   │   ├── database/             # SQLAlchemy engine & session
│   │   ├── models/               # Database ORM models (Users, Athletes, Injuries, Videos)
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # Modular AI service stubs (Pose, Kinematics, Risks)
│   │   ├── auth.py               # JWT & bcrypt authentication
│   │   ├── database.py           # Database configuration
│   │   ├── main.py               # FastAPI main application & routes
│   │   ├── models.py             # Database models
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── video_processor.py    # MediaPipe pose landmark extraction
│   │   ├── risk_engine.py       # Biomechanical risk calculation engine
│   │   ├── recommender.py        # Corrective exercise program generator
│   │   └── report_exporter.py    # PDF & Excel report generator
│   ├── seed.py                   # Database seed script for demo data
│   ├── test_api.py               # Pytest suite for backend API testing
│   └── requirements.txt          # Python dependencies
├── frontend/
│   └── index.html                # React web application UI
├── datasets/
│   └── README.md                 # Dataset documentation (Human3.6M, SportsPose, etc.)
├── app.py                        # Server launcher script with auto-dependency check
├── run_server.py                 # Uvicorn server launcher
├── start_app.bat                 # Windows batch start script
├── WEEK_1_2_COMPLETION.md        # Week 1-2 milestone completion report for mentor
└── README.md                     # Project documentation
```

---

## Quick Start & Running the Project

### Prerequisites

- Python 3.9+ installed on your system.
- Git (optional).

### 1. Installation & Environment Setup

Navigate to the project root directory:

```powershell
cd "c:\Ai Sport Injury Rist Detection from Video"
```

Install backend dependencies:

```powershell
pip install -r backend/requirements.txt
```

### 2. Database Seeding (Demo Data)

Populate the database with sample users for all 5 roles, athlete profiles, injury records, and sample videos:

```powershell
python backend/seed.py
```

### 3. Launching the Application

Run the server launcher:

```powershell
python app.py
```

Alternatively:

```powershell
python run_server.py
```

Or on Windows:

```cmd
start_app.bat
```

Open your browser and navigate to:
**`http://127.0.0.1:8000`**

To view interactive API documentation (Swagger UI), navigate to:
**`http://127.0.0.1:8000/docs`**

---

## Demo Credentials (5 User Roles)

All demo accounts use the password: **`Password123!`**

| User Role | Email | Features & Dashboard View |
| :--- | :--- | :--- |
| **Athlete** | `athlete@demo.com` | Personal Dashboard, Physical Profile Calibration, Injury History CRUD, Video Upload, Biomechanical Telemetry & Reports |
| **Coach** | `coach@demo.com` | Team Athlete Roster, High-Risk Alerts, Team Metrics & Overview |
| **Physiotherapist** | `physio@demo.com` | Injury History Overview, Active Rehab Tracking, Joint Alignment Metrics |
| **Sports Scientist** | `scientist@demo.com` | Dataset Summaries, Anomaly Telemetry, Biomechanical Insights |
| **Administrator** | `admin@demo.com` | User Management, System Analytics, Background Jobs Monitoring |

---

## Week 1–2 Mentor Presentation Workflow (5–10 Min Demo)

Follow this step-by-step workflow during the mentor demonstration:

1. **Launch Server & Open UI**: Navigate to `http://127.0.0.1:8000`.
2. **Login as Athlete**: Enter `athlete@demo.com` / `Password123!`.
3. **Role Dashboard**: Show personalized athlete dashboard with average injury risk, latest risk category, and video list.
4. **Athlete Profile**: Click **Athlete Profile**, demonstrate updating physical metrics (e.g. Height, Weight, Training Load), and save.
5. **Injury History CRUD**:
   - Show existing injury records.
   - Click **Log Injury** to add a new record (*e.g., Quadricep Strain*).
   - Click the **Edit** icon on an injury record, change severity/remarks, and save.
   - Click the **Delete** icon to delete a record.
6. **Video Upload Preparation**:
   - Click **Upload Video**.
   - Select activity (*e.g., Squatting* or *Cutting Movement*).
   - Select an MP4 video file and click **Start Analysis**.
   - Observe upload progress and background status (`processing` → `completed`).
7. **View Analysis & Telemetry**: Click **View Analysis** on a completed video to view skeletal video tracking, biomechanical line chart, predicted injury probabilities, corrective recommendations, and export PDF/Excel reports.
8. **Role Switching**: Log out and log in as `coach@demo.com` or `admin@demo.com` to demonstrate role-based authorization and customized dashboards.
9. **API Swagger**: Open `http://127.0.0.1:8000/docs` to show endpoints and backend architecture.

---

## Testing

Run automated tests using pytest:

From project root (`c:\Ai Sport Injury Rist Detection from Video`):
```powershell
python -m pytest backend/test_api.py -v
```

From `backend/` directory (`c:\Ai Sport Injury Rist Detection from Video\backend`):
```powershell
python -m pytest test_api.py -v
```

---

## Milestone Status

- **Week 1–2**: Completed & Verified (System Architecture, Auth, Roles, Profile, Injury CRUD, Video Pipeline, Demo Data, Docs).
- **Week 3–4 (Next Milestone)**: 3D Pose estimation enhancement, skeleton tracking refinement, biomechanical joint angle kinematics engine.
