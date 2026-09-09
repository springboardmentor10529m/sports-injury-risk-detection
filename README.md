# AI Sports Injury Risk Detection & Biomechanical Analysis Platform

> **Undergraduate Capstone Project — Infosys Springboard**  
> *Full-stack AI video analysis, MediaPipe 3D pose estimation, biomechanical screening, rule-based risk evaluation, and integrated production Machine Learning inference engine.*

---

## 🌟 Executive Summary & Project Overview

The **AI Sports Injury Risk Detection Platform** is a state-of-the-art web application that combines computer vision, biomechanical kinematic analysis, rule-based risk evaluation, and machine learning to evaluate athletic movement quality and predict injury risk.

By processing uploaded movement videos (running, jumping, squatting, cutting, etc.), the system extracts **33 3D skeletal pose landmarks** per frame using MediaPipe, computes joint kinetics, flags movement anomalies, evaluates dual risk scores (Rule-Based + Machine Learning), and provides actionable preventative recommendations.

> ⚠️ **Research Prototype Disclaimer**: This platform is engineered for educational, preventative athletic screening, and biomechanical technique evaluation purposes. It is **NOT** a clinical medical diagnostic tool.

---

## 🎯 Key Capabilities & Architectural Highlights

1. **3D Pose Landmark Tracking & HUD Overlay**:
   - Extracts 33 MediaPipe pose landmarks $(x, y, z, \text{visibility})$ per frame.
   - Generates browser-compatible H.264 (avc1) annotated video clips with cyan skeletal topology and real-time frame/confidence HUD overlays.
2. **Deterministic Joint Kinematics & Movement Quality Scoring**:
   - Calculates 2D/3D joint flexion angles (Knees, Hips, Trunk, Elbows, Shoulders).
   - Measures Knee Valgus Ratio, Trunk Forward Lean, Pelvic Tilt, Limb Symmetry Ratio (%), and Smoothness.
   - Computes a deterministic **Movement Quality Score (0–100%)**.
3. **Dual Risk Evaluation Engine**:
   - **Legacy Rule-Based Engine**: Evaluates kinetic alignment, limb symmetry, fatigue, and athlete profile context across 4 risk levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
   - **Production Machine Learning Classifier**: Random Forest Balanced classifier trained on structured biomechanical data (5,430 samples, 18 features, **93.55% training accuracy**, **0.7702 ROC-AUC**).
4. **Feature Provenance Audit & Missing Telemetry Adapter**:
   - Adapts video-derived kinematics (`knee_valgus`, `gait_symmetry`, `acc_rms`) and athlete profile metrics to the model's 18-feature schema (`ml_prediction_service.py`).
   - Rigorously audited against training distributions; enforces population median fallbacks for missing telemetry (including strict fallback for spatial compass heading vs torso tilt).
5. **Interactive Dashboard & Reporting Exporters**:
   - Single Page React Dashboard (`frontend/index.html`) featuring skeletal video player, Chart.js telemetry timeline, flagged movement anomalies with timestamps/frame numbers, ML risk probability card, and PDF/Excel report export.

---

## 📊 End-to-End System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │       React Single Page App (UI)        │
                    │   (Tailwind CSS, Axios, Chart.js)       │
                    └────────────────────┬────────────────────┘
                                         │ HTTP / REST APIs (JWT Bearer)
                    ┌────────────────────▼────────────────────┐
                    │            FastAPI Backend              │
                    │      (Python 3.10+, Pydantic)           │
                    └──────────┬──────────┬───────────┬───────┘
                               │          │           │
           ┌───────────────────▼┐   ┌─────▼────────┐  │  ┌───────────────────────┐
           │   SQLAlchemy ORM   │   │  MediaPipe   │  ├─►│  Production ML Engine │
           │ (SQLite / Postgres)│   │ Pose Engine  │  │  │ (RandomForest 18-Feat)│
           └────────────────────┘   └──────────────┘  │  └───────────────────────┘
                                                      │  ┌───────────────────────┐
                                                      └─►│ Rule-Based Risk Engine│
                                                         └───────────────────────┘
```

---

## 📁 Repository Directory Structure

```
sports-injury-detection/
├── backend/
│   ├── app/
│   │   ├── api/                           # Modular API handlers
│   │   ├── config/                        # Biomechanical & risk thresholds
│   │   ├── database/                      # SQLAlchemy engine & session setup
│   │   ├── models/                        # ORM models (Users, Athletes, Videos, Anomalies)
│   │   ├── schemas/                       # Pydantic request & response schemas
│   │   ├── services/
│   │   │   ├── pose_service.py            # MediaPipe extraction & overlay rendering
│   │   │   ├── biomechanics_service.py    # Joint angles, ROM, symmetry, trunk lean
│   │   │   ├── movement_analysis_service.py # Quality scoring & anomaly detection
│   │   │   ├── risk_assessment_service.py # Rule-based risk evaluation service
│   │   │   ├── ml_prediction_service.py   # Production ML adapter service
│   │   │   └── video_service.py           # Background pipeline orchestrator
│   │   ├── auth.py                        # JWT & bcrypt authentication
│   │   ├── main.py                        # FastAPI application routes
│   │   └── models.py                      # Database models
│   ├── seed.py                            # Seed script for demo accounts & data
│   └── requirements.txt                   # Python backend dependencies
├── frontend/
│   └── index.html                         # React Single-Page Application
├── models/
│   ├── best_sports_injury_model.joblib   # Trained Random Forest ML model artifact
│   ├── model_features.json                # 18-feature schema definition
│   ├── model_metadata.json                # Performance evaluation metadata
│   └── video_tabular_feature_compatibility.md # Feature provenance audit matrix
├── datasets/
│   ├── ml_training_dataset.csv            # Structured ML training dataset (5,430 rows)
│   └── README.md                          # Reference dataset documentation
├── uploads/
│   └── processed/                         # Browser-compatible annotated output videos (MP4)
├── ml_inference.py                        # Core ML inference module
├── train_sports_injury_model.py           # ML model training script
├── pose_landmarker_full.task              # MediaPipe Pose Landmarker task binary
├── app.py                                 # Server entry point with auto dependency checks
├── run_server.py                          # Uvicorn launcher
└── README.md                              # Main documentation file
```

---

## ⚙️ Quick Start & Installation

### Prerequisites
- Python 3.9+ (Python 3.10+ recommended)
- `pose_landmarker_full.task` file in project root

### 1. Clone & Install Dependencies
```powershell
cd "d:\Infosys certificates\Infosys Project\sports-injury-detection"
pip install -r backend/requirements.txt
```

### 2. Seed Demo Database
```powershell
python backend/seed.py
```

### 3. Launch Application Server
```powershell
python app.py
# Or launch directly with uvicorn:
# uvicorn backend.app.main:app --reload --port 8000
```
- Open UI: **`http://127.0.0.1:8000`**
- OpenAPI Docs (Swagger): **`http://127.0.0.1:8000/docs`**

---

## 🔑 Demo Account Credentials

All accounts pre-seeded with password: **`Password123!`**

| Role | Email | Capabilities |
|------|-------|--------------|
| **Athlete** | `athlete@demo.com` | Dashboard, Profile, Injury History, Video Upload, ML Analysis |
| **Coach** | `coach@demo.com` | Team Athlete Roster, High-Risk Alerts, Squad Overview |
| **Physiotherapist** | `physio@demo.com` | Injury History Tracking, Rehab Progress, Joint Alignment Metrics |
| **Sports Scientist** | `scientist@demo.com` | Biomechanical Anomaly Telemetry, Kinematic Trends |
| **Administrator** | `admin@demo.com` | User Management, Pipeline Status, System Audit Logs |

---

## 🤖 Production Machine Learning Model Details

| Attribute | Specification |
|-----------|---------------|
| **Model Type** | Random Forest Classifier (Balanced Class Weight) |
| **Training Samples** | 5,430 structured tabular rows (`datasets/ml_training_dataset.csv`) |
| **Features** | Exactly 18 features (fatigue score, acceleration, cadence, GRF, ROM, speed, workload intensity, etc.) |
| **Accuracy** | **93.55%** |
| **ROC-AUC** | **0.7702** |
| **PR-AUC** | **0.2968** |
| **Artifacts** | `models/best_sports_injury_model.joblib`, `models/model_features.json`, `models/model_metadata.json` |
| **Inference Adapter** | `ml_prediction_service.py` with population median baselines for unobserved telemetry |

---

## 🧪 Testing & Verification

### Run Pytest Test Suite
```powershell
set PYTHONPATH=backend;. && pytest backend/app/tests/test_ml_integration.py -v
```

### Run Model Training Pipeline
```powershell
python train_sports_injury_model.py
```

---

## 📜 Research & Educational License

Developed as part of the **Infosys Springboard** undergraduate capstone program. Free for academic, educational, and research evaluation.
