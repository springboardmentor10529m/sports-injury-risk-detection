# 🏋️ Sports Injury Risk Detection & Biomechanical Analytics Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-BlazePose-007ACC.svg?style=flat&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end, AI-powered sports biomechanics and injury risk detection platform. The system leverages computer vision (**MediaPipe BlazePose**), kinematic modeling, machine learning (**Isolation Forest**, **Random Forest**, **XGBoost**), and sports medicine heuristics to assess injury probability, detect movement anomalies, and deliver personalized corrective exercise protocols.

Tailored for **Athletes**, **Coaches**, **Physiotherapists**, **Sports Scientists**, and **Administrators**.

---

## 📑 Table of Contents
- [Key Features](#-key-features)
- [Complete 13-Module Architecture](#-complete-13-module-architecture)
- [System Architecture Diagram](#-system-architecture-diagram)
- [Machine Learning & Biomechanical Models](#-machine-learning--biomechanical-models)
  - [Reference Datasets](#1-training--baseline-reference-datasets)
  - [Feature Extraction Vector](#2-feature-schema--inputs)
  - [Predictive Models & Anomaly Scoring](#3-predictive-models--anomaly-scoring)
  - [5-Factor Risk Scoring Formula](#4-5-factor-weighted-risk-scoring-formula)
- [Role-Based Experiences](#-role-based-experiences)
- [Project Directory Structure](#-project-directory-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Option 1: Docker Compose (Recommended)](#method-1-running-with-docker-compose-recommended)
  - [Option 2: Local Development (FastAPI + Vite React)](#method-2-running-locally-without-docker)
- [API Documentation](#-api-documentation)
- [Automated Verification & Test Suites](#-automated-verification--test-suites)

---

## 🌟 Key Features

### 1. 3D Pose Estimation & Computer Vision
* Real-time 33-landmark 3D skeletal tracking using **MediaPipe BlazePose** (Modern Tasks API & Legacy Solutions).
* High-definition video re-encoding pipeline with **FFMPEG libx264** standardizing pixel format to `yuv420p` for instant cross-browser playback.
* Resolution-adaptive skeletal overlay rendering angles, joints, and valgus risk vectors directly on each frame.
* Robust fallback to mathematical kinematic modeling when external vision solver libraries are not available.

### 2. Biomechanical & Kinematic Analysis
* **Knee Valgus Detection:** Medial knee collapse tracking relative to ankles and hips during deep movement phases.
* **Trunk Lean Angle:** Forward-tilt measurements from mid-hip to mid-shoulder vectors.
* **Lateral Hip Sway:** Stability index calculation using mid-hip lateral standard deviation.
* **Joint Range of Motion (ROM) & Symmetry:** Left-to-right bilateral symmetry percentages for knee and hip flexion/extension.

### 3. Multi-Vector Injury Risk Forecasting
* Granular risk percentage predictions ($0.0\% - 100.0\%$) across 5 major athletic injury categories:
  * **ACL Injury Risk**
  * **Hamstring Strain**
  * **Ankle Sprain**
  * **Shoulder Impingement**
  * **Lower Back Strain**
* 5-factor risk decomposition breaking down points from kinematics, training load, asymmetry, movement velocity, and prior injury history.

### 4. Sports Medicine Recommendation Engine
* Built-in dynamic exercise library categorized by **Mobility**, **Strengthening**, **Recovery**, and **Technique**.
* Automated generation of prescribed drills targeting detected biomechanical deviations with interactive completion toggles.

### 5. Multi-Role Workspaces & Clinical Dashboards
* Dedicated interfaces tailored for 5 user personas: Athlete, Coach, Physiotherapist, Sports Scientist, and System Administrator.

### 6. Notifications & Clinical Reporting
* In-app alerts for critical risk scores, load spikes, and recovery milestones.
* Longitudinal assessment data exports (CSV) and team-wide injury risk matrix exports.

---

## 🧩 Complete 13-Module Architecture

The platform is structured into 13 interconnected clinical and technical modules:

| Module | Name | Description |
| :--- | :--- | :--- |
| **Module 1** | **Authentication & RBAC** | JWT-authenticated role-based access for Athletes, Coaches, Physiotherapists, Scientists, and Admins. |
| **Module 2** | **Athlete Profile Management** | Comprehensive physical records: demographics, sport/position, flexibility, strength, balance, training load, and medical notes. |
| **Module 3** | **Video Upload & Transcoding** | Multipart video upload pipeline with container validation and FFMPEG H.264/yuv420p standardization. |
| **Module 4** | **3D Pose Estimation Engine** | BlazePose 33-keypoint spatial extraction with 3D joint coordinate tracking. |
| **Module 5** | **Biomechanical Analysis Engine** | Real-time calculations of Knee Valgus ratio, Trunk Lean, Hip Sway, ROM, and Bilateral Symmetry. |
| **Module 6** | **Injury Risk Prediction Engine** | Supervised Random Forest and XGBoost classifiers predicting injury probabilities. |
| **Module 7** | **Movement Anomaly Detection** | Isolation Forest model benchmarking movement against standard SportsPose & Human3.6M datasets. |
| **Module 8** | **Risk Scoring & Decomposition** | Composite risk formula ($1.0 - 10.0$ / $0 - 100\%$) categorized into Low, Moderate, High, or Critical. |
| **Module 9** | **Corrective Recommendation Engine** | Clinical exercise prescriber targeting identified risk vectors with dosage and sets/reps. |
| **Module 10** | **Role-Tailored Dashboards** | Interactive React 19 dashboards customized for each persona. |
| **Module 11** | **Notification & Alert System** | Real-time alert feed for dangerous movement patterns, high-risk flags, and fatigue overload. |
| **Module 12** | **Clinical Reporting & Export** | PDF/HTML athlete health reports and CSV exports for team matrices and longitudinal research. |
| **Module 13** | **Deployment & Infrastructure** | Production-ready Docker Compose stack with PostgreSQL and Nginx/Vite configurations. |

For a complete architectural deep-dive, see [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md).

---

## 🏗 System Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                               FRONTEND (React 19 + Vite)                      |
|  Athlete Hub | Coach Radar | Physio Rehab | Sports Scientist | Admin Console  |
+---------------------------------------+---------------------------------------+
                                        |  REST API / JWT
                                        v
+-------------------------------------------------------------------------------+
|                            BACKEND API (FastAPI)                              |
|  /api/auth   |  /api/athlete  |  /api/video   |  /api/injury                  |
|  /api/reports|  /api/recs     |  /api/notifs  |  /api/admin                   |
+-------------------+---------------------------------------+-------------------+
                    |                                       |
                    v                                       v
+---------------------------------------+   +-----------------------------------+
|        POSE & BIOMECHANICS ENGINE     |   |         DATABASE LAYER            |
|  - MediaPipe BlazePose (33 keypoints) |   |  - PostgreSQL (Production/Docker) |
|  - 3D Joint Angle & ROM Tracking      |   |  - SQLite (Local Dev Fallback)    |
|  - Knee Valgus & Trunk Lean Detection |   |  - SQLAlchemy 2.0 ORM Models      |
|  - FFMPEG H.264 / yuv420p Transcoder  |   +-----------------------------------+
+-------------------+-------------------+
                    |
                    v
+-------------------------------------------------------------------------------+
|                            AI & MACHINE LEARNING LAYER                        |
|  - Isolation Forest (Anomaly Score against SportsPose / Human3.6M)           |
|  - Random Forest & XGBoost Classifiers (ACL, Hamstring, Ankle, Back, Shoulder)|
|  - 5-Factor Weighted Risk Scoring & Decomposition Engine                      |
+-------------------------------------------------------------------------------+
```

---

## 🧠 Machine Learning & Biomechanical Models

### 1. Training & Baseline Reference Datasets
* **FIFA Injury Dataset:** Models statistical correlations between player demographics, weekly training hours, fatigue, and historical injury recurrence.
* **SportsPose Dataset:** Provides kinematic standard ranges of motion (ROM) for compound athletic movements (e.g., jump landings, squats, cuts).
* **Human3.6M Dataset:** Validates human anatomical proportions and multi-angle keypoint consistency.

### 2. Feature Schema & Inputs

The machine learning pipeline consumes a 14-dimensional structured feature vector:

| Feature Name | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| `left_knee_rom` | Float | Pose Engine | Left knee Range of Motion in degrees |
| `right_knee_rom` | Float | Pose Engine | Right knee Range of Motion in degrees |
| `left_hip_rom` | Float | Pose Engine | Left hip Range of Motion in degrees |
| `right_hip_rom` | Float | Pose Engine | Right hip Range of Motion in degrees |
| `knee_valgus_detected` | String | Pose Engine | Medial knee caving classification (`Yes`, `No`, `Borderline`) |
| `symmetry_score` | Float | Pose Engine | Bilateral left-to-right ROM symmetry percentage ($0\% - 100\%$) |
| `balance_score` | Float | Pose Engine | Lateral hip sway stability index ($0.0 - 10.0$) |
| `trunk_lean` | Float | Pose Engine | Maximum forward trunk flexion angle in degrees |
| `age` | Integer | Athlete Profile | Athlete age in years |
| `weight` | Float | Athlete Profile | Athlete weight in kilograms |
| `sport` | String | Athlete Profile | Primary athletic discipline (Basketball, Football, Soccer, etc.) |
| `position` | String | Athlete Profile | Player role or position |
| `training_load` | Float | Athlete Profile | Weekly logged training volume (hours/week) |
| `coach_notes` | Text | Athlete Profile | NLP keyword extraction for historical trauma markers |

### 3. Predictive Models & Anomaly Scoring
* **Biomechanical Anomaly Detection:** An **Isolation Forest** model evaluates joint angles against normative kinematic baselines, returning an `anomaly_score` ($0.0 - 1.0$).
* **Injury Risk Classifiers:** Supervised **Random Forest and XGBoost** models generate individual risk percentages for:
  * **ACL Injury Risk**
  * **Hamstring Strain**
  * **Ankle Sprain**
  * **Shoulder Impingement**
  * **Lower Back Strain**

### 4. 5-Factor Weighted Risk Scoring Formula

The overall injury risk score is computed using the following clinical formula:

$$\text{Overall Risk Score} = 0.35 \times D_{\text{kinematics}} + 0.20 \times H_{\text{prior}} + 0.20 \times A_{\text{symmetry}} + 0.15 \times L_{\text{training}} + 0.10 \times F_{\text{fatigue}}$$

Scores map directly to four risk categories:
* **Low Risk:** $< 30\%$
* **Moderate Risk:** $30\% - 60\%$
* **High Risk:** $60\% - 80\%$
* **Critical Risk:** $> 80\%$

---

## 👥 Role-Based Experiences

| Persona | Primary Functionality |
| :--- | :--- |
| **Athlete** | Personal biomechanics score, video form playback with skeleton overlay, assigned corrective exercises checklist, historical risk trends, and profile configuration. |
| **Coach** | Squad injury risk radar, athlete roster cards filtered by risk level, video reviews, and coach notes. |
| **Physiotherapist** | Rehabilitation tracking, recovery logs, and movement correction analytics. |
| **Sports Scientist** | Cohort biomechanical intelligence, SportsPose/Human3.6M benchmark comparison, and research data export. |
| **Administrator** | System telemetry, platform throughput metrics, and dynamic user role reassignment. |

---

## 📂 Project Directory Structure

```
Sports/
├── backend/
│   ├── app/
│   │   ├── auth.py                  # JWT authentication & password hashing
│   │   ├── config.py                # Pydantic environment configurations
│   │   ├── database.py              # SQLAlchemy engine & session maker
│   │   ├── main.py                  # FastAPI application entrypoint
│   │   ├── models.py                # Database models (User, Athlete, Video, Prediction, etc.)
│   │   ├── schemas.py               # Pydantic validation schemas
│   │   ├── routers/
│   │   │   ├── admin.py             # Telemetry & role management endpoints
│   │   │   ├── athlete.py           # Athlete profile & physical metrics endpoints
│   │   │   ├── auth.py              # Login & registration endpoints
│   │   │   ├── injury.py            # Injury predictions & team radar endpoints
│   │   │   ├── notifications.py     # In-app notification center endpoints
│   │   │   ├── recommendations.py   # Corrective exercise library & tracking endpoints
│   │   │   ├── reports.py           # Clinical reports & CSV exports endpoints
│   │   │   └── video.py             # Video upload & processing trigger endpoints
│   │   └── services/
│   │       ├── pose_engine.py       # MediaPipe BlazePose, FFMPEG encoding & kinematics
│   │       ├── pose_landmarker.task # MediaPipe PoseLandmarker model file
│   │       └── predictor_service.py # ML risk prediction, Isolation Forest, & scoring
│   ├── test_extended_modules.py     # Integration test suite for all 13 modules
│   ├── test_injury_prediction.py    # End-to-end injury prediction workflow test
│   ├── test_network_endpoints.py    # Live server HTTP endpoint test suite
│   ├── test_pose_estimation.py      # BlazePose unit & mock tests
│   ├── requirements.txt             # Python dependencies
│   └── Dockerfile                   # Backend Docker container
├── frontend/
│   ├── src/
│   │   ├── api.js                   # Axios HTTP client with interceptors
│   │   ├── App.jsx                  # Main router & role guards
│   │   ├── components/
│   │   │   ├── AthleteLayout.jsx    # Unified athlete navigation shell
│   │   │   └── PoseSkeletonOverlay.jsx # Interactive HTML5 Canvas skeleton visualizer
│   │   └── pages/
│   │       ├── Dashboard.jsx        # Role-based dashboard hub
│   │       ├── InjuryHistory.jsx    # Longitudinal risk & injury records
│   │       ├── Login.jsx            # User authentication page
│   │       ├── Performance.jsx      # Biomechanical performance analytics
│   │       ├── Profile.jsx          # Athlete profile editor
│   │       ├── Recommendations.jsx  # Corrective exercise protocol tracker
│   │       ├── Register.jsx         # User registration page
│   │       ├── Reports.jsx          # Clinical reports & CSV data export
│   │       ├── RiskAssessments.jsx  # Detailed assessment inspection
│   │       ├── Settings.jsx         # User account preferences
│   │       └── VideoAnalysis.jsx    # Dual-view video & biomechanics player
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile                   # Frontend Docker container
├── docs/
│   ├── README.md                    # Documentation index
│   └── SYSTEM_ARCHITECTURE.md       # Comprehensive architectural specification
├── docker-compose.yml               # Multi-container orchestration (DB, Backend, Frontend)
└── README.md
```

---

## 🛠 Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios.
* **Backend:** FastAPI, Python 3.11+, SQLAlchemy 2.0, Uvicorn, Pydantic v2.
* **Computer Vision & ML:** MediaPipe BlazePose, OpenCV, Scikit-Learn, NumPy, FFMPEG (`libx264`).
* **Database:** PostgreSQL (Docker) & SQLite (Local fallback).
* **Containerization:** Docker, Docker Compose.

---

## 🚀 Getting Started

### Method 1: Running with Docker Compose (Recommended)

This runs the entire stack (PostgreSQL, FastAPI Backend, and React Frontend) inside isolated Docker containers:

1. Ensure **Docker** and **Docker Compose** are installed and running.
2. Start the entire system from the project root:
   ```bash
   docker compose up --build
   ```
3. Access the services:
   - **Frontend Application:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Interactive API Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Method 2: Running Locally (Without Docker)

#### 1. Backend Setup (FastAPI)

When running locally without PostgreSQL configured, the backend automatically uses **SQLite** (`sports_injury.db`).

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # macOS / Linux
# or: .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The backend will be running at [http://localhost:8000](http://localhost:8000).

#### 2. Frontend Setup (React & Vite)

In a new terminal:

```bash
cd frontend

# Install npm dependencies
npm install

# Launch development server
npm run dev
```
The frontend will be running at [http://localhost:5173](http://localhost:5173).

---

## 📖 API Documentation

FastAPI automatically generates interactive OpenAPI documentation:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Key API Routes
* `POST /api/auth/register` & `POST /api/auth/login` — Authentication and JWT token generation.
* `POST /api/athlete/profile` & `GET /api/athlete/profile` — Athlete physical attributes and history.
* `POST /api/video/upload` — Video upload and automated pose estimation pipeline.
* `GET /api/injury/prediction/{video_id}` — 5-factor risk score and specific injury probabilities.
* `GET /api/injury/predictions/team` — Squad-wide risk matrix for coaches.
* `GET /api/recommendations/athlete/{athlete_id}` — Personalized corrective exercise protocols.
* `GET /api/notifications` & `PUT /api/notifications/{id}/read` — Real-time notification feed.
* `GET /api/reports/athlete/{id}/pdf` & `GET /api/reports/athlete/{id}/csv` — Clinical report & data exports.
* `GET /api/admin/metrics` — Platform throughput telemetry and active user breakdown.

---

## 🧪 Automated Verification & Test Suites

The platform includes comprehensive test suites covering unit tests, pose estimation mocks, machine learning predictions, and multi-module integration workflows.

### 1. Run Complete Extended Modules Integration Test
Tests registration, athlete profiles, recommendations library, notification lifecycle, clinical reports, CSV exports, and administrator telemetry:
```bash
cd backend
python test_extended_modules.py
```

### 2. Run End-to-End Injury Prediction & Scoring Test
Generates a valid synthetic video, processes pose estimation, and asserts risk probabilities:
```bash
cd backend
python test_injury_prediction.py
```

### 3. Run Pose Estimation Unit Tests
Tests 3D joint angle calculation, MediaPipe landmark ingestion, and biomechanics metrics:
```bash
cd backend
python -m unittest test_pose_estimation
```

### 4. Run Tests Inside Docker Container
If running via Docker Compose, execute tests directly inside the container:
```bash
docker exec sports_injury_backend python test_extended_modules.py
docker exec sports_injury_backend python test_injury_prediction.py
docker exec sports_injury_backend python -m unittest test_pose_estimation
```