# System Architecture: SportShield Platform

This document provides a comprehensive architectural breakdown of the **SportShield** Sports Injury Risk Detection and Biomechanical Analysis system.

---

## 1. High-Level Architecture Overview

SportShield is built as a decoupled, client-server system designed for individual athletes:
- **Frontend Layer**: Single-page application (SPA) created with **React 18** and **Vite**, featuring HTML5 Canvas for real-time skeletal pose playback and interactive metric dashboards.
- **Backend API Layer**: High-performance asynchronous REST API powered by **FastAPI** (Python 3.10+).
- **Computer Vision & Biomechanics Engine**: Integrated pipeline utilizing **OpenCV** for video ingestion and **Google MediaPipe PoseLandmarker** for 33 3D skeletal landmark extraction, followed by vector trigonometry kinematic calculation.
- **Intelligence & Risk Layer**: Hybrid architecture combining a supervised **Scikit-learn Random Forest Classifier** trained on empirical datasets alongside a deterministic **6-Category Clinical Biomechanics Rule Engine**.
- **Persistence Layer**: Relational database managed via **SQLAlchemy ORM** supporting **PostgreSQL** in production with automatic fallback to **SQLite** for local development.

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React + Vite)"]
        UI_AUTH[Athlete Authentication & Profile]
        UI_VID[Video Ingestion & Playback Canvas]
        UI_SKELETON[33-Keypoint Skeletal Visualizer]
        UI_DASH[Kinematic & Anomaly Dashboard]
        UI_RISK[6-Category Risk & Risk Tiers]
        UI_REC[Exercise & Prehab Prescriptions]
        UI_HIST[Multi-Video History Selector]
    end

    subgraph Server["Backend Server (FastAPI)"]
        API_GATEWAY[FastAPI Router & CORS Middleware]
        CV_ENGINE[OpenCV Video Frame Decoder]
        POSE_TRACKER[MediaPipe PoseLandmarker Engine]
        BIO_ENGINE[Biomechanical Feature Extractor]
        ANOMALY_ENGINE[Empirical Z-Score Benchmark Engine]
        ML_MODEL[Random Forest Classifier (100 Trees)]
        RULES_ENGINE[6-Category Deterministic Risk Engine]
        REC_ENGINE[Targeted Prescription Engine]
    end

    subgraph Storage["Storage & Datasets"]
        RAW_VIDEOS[uploads/ Video Directory]
        POSTGRES_DB[(PostgreSQL / SQLite Database)]
        DS_PRIMARY[("Project-Injury-Dataset.csv\n(50 Athlete Cohort)")]
        DS_WORKLOAD[("sports_multimodal_data.csv\n(100 Records)")]
        DS_COLLEGE[("collegiate_athlete_injury_dataset.csv\n(100 Records)")]
    end

    UI_AUTH -->|REST API| API_GATEWAY
    UI_VID -->|Multipart Form Upload| API_GATEWAY
    API_GATEWAY --> RAW_VIDEOS
    API_GATEWAY --> CV_ENGINE
    CV_ENGINE --> POSE_TRACKER
    POSE_TRACKER --> BIO_ENGINE
    BIO_ENGINE --> ANOMALY_ENGINE
    ANOMALY_ENGINE --> DS_PRIMARY
    BIO_ENGINE --> ML_MODEL
    BIO_ENGINE --> RULES_ENGINE
    POSTGRES_DB -->|Athlete History| RULES_ENGINE
    RULES_ENGINE --> REC_ENGINE
    REC_ENGINE --> API_GATEWAY
    API_GATEWAY --> POSTGRES_DB
    API_GATEWAY --> UI_DASH
    API_GATEWAY --> UI_RISK
    API_GATEWAY --> UI_REC
    UI_HIST -->|Fetch Past Analyses| API_GATEWAY
```

---

## 2. End-to-End Processing Workflow

When an athlete uploads a video, the system executes a 7-stage pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor Athlete as Athlete (Browser)
    participant UI as React SPA
    participant API as FastAPI Backend
    participant MP as MediaPipe PoseLandmarker
    participant Bio as Biomechanics Engine
    participant ML as ML & Rules Engines
    participant DB as Database (SQLAlchemy)

    Athlete->>UI: Uploads video (MP4/MOV) and clicks Analyze
    UI->>API: POST /video/upload (multipart/form-data)
    API->>API: Validates format & saves to uploads/
    API->>DB: Inserts Video record (processing_status: 'uploaded')
    API-->>UI: Returns video_id and metadata

    UI->>API: POST /analysis (video_id, athlete_id)
    API->>MP: Decodes frames with OpenCV (up to 240 frames) & extracts 33 3D keypoints
    MP-->>API: Returns temporal landmark coordinates
    API->>Bio: Calculates joint angles, valgus, trunk lean, ROM, symmetry, stability
    Bio-->>API: Returns aggregated kinematic feature vector
    API->>DB: Queries logged athlete prior injuries & physical parameters
    API->>ML: Runs Random Forest ML classification & 6-category risk formulas
    ML-->>API: Returns risk percentages (ACL, Hamstring, Ankle, Shoulder, Back, Overuse)
    API->>DB: Inserts AnalysisResult & InjuryPrediction & auto Recommendations
    API-->>UI: Returns full analysis, kinematics, anomaly flags, and risk scores

    UI->>UI: Renders 33-point skeleton over video canvas and displays interactive dashboard
```

---

## 3. Database Entity Relationship (ER) Model

The database maintains referential integrity using standard foreign key constraints.

```mermaid
erDiagram
    USERS ||--o{ ATHLETES : "has profile"
    ATHLETES ||--o{ INJURY_HISTORIES : "logs"
    ATHLETES ||--o{ PERFORMANCE_RECORDS : "records"
    ATHLETES ||--o{ VIDEOS : "uploads"
    ATHLETES ||--o{ ANALYSIS_RESULTS : "evaluated_in"
    VIDEOS ||--o{ ANALYSIS_RESULTS : "analyzed_by"
    ANALYSIS_RESULTS ||--o| INJURY_PREDICTIONS : "produces"
    INJURY_PREDICTIONS ||--o| RECOMMENDATIONS : "generates"

    USERS {
        UUID user_id PK
        string name
        string email UK
        string password
        string role
        string phone
        string profile_image
        datetime created_at
    }

    ATHLETES {
        UUID athlete_id PK
        UUID user_id FK
        string sport
        string position
        int age
        float height
        float weight
        float training_load
        float flexibility
        float strength
        float balance
        float endurance
        string training_level
        string gender
        text coach_notes
    }

    INJURY_HISTORIES {
        UUID injury_id PK
        UUID athlete_id FK
        string injury_type
        string body_part
        string severity
        int months_ago
        int fully_recovered
        text notes
        datetime recorded_at
    }

    VIDEOS {
        UUID video_id PK
        UUID athlete_id FK
        string activity
        text video_url
        float duration
        int fps
        string resolution
        float quality_score
        string processing_status
        datetime uploaded_at
    }

    ANALYSIS_RESULTS {
        UUID analysis_id PK
        UUID video_id FK
        UUID athlete_id FK
        float knee_valgus
        float hip_stability
        float trunk_lean
        float stride_length
        float joint_alignment
        float symmetry_score
        float fatigue_score
        float movement_quality
        float overall_risk_score
        string risk_level
        json pose_frames
        datetime created_at
    }

    INJURY_PREDICTIONS {
        UUID prediction_id PK
        UUID analysis_id FK
        float acl_risk
        float hamstring_risk
        float ankle_risk
        float shoulder_risk
        float lower_back_risk
        float overuse_risk
    }

    RECOMMENDATIONS {
        UUID recommendation_id PK
        UUID prediction_id FK
        text exercise
        text mobility
        text strengthening
        text recovery
        text training_modification
    }

    PERFORMANCE_RECORDS {
        UUID record_id PK
        UUID athlete_id FK
        string activity
        float score
        text remarks
        datetime recorded_at
    }
```

---

## 4. Component Directory & Module Mapping

```
sports-injury-risk-detection/
├── backend/
│   ├── main.py                  # FastAPI application, route handlers, CORS configuration
│   ├── pose_engine.py           # OpenCV frame reader & MediaPipe PoseLandmarker task runner
│   ├── biomechanics.py          # 3D vector geometry, valgus projection, activity inference
│   ├── ml_pipeline.py           # Scikit-learn Random Forest model training, scaling, inference
│   ├── risk_rules.py            # 6-category deterministic risk engine & position weighting
│   ├── feature_engineering.py   # Anomaly Z-score comparison against population benchmarks
│   ├── recommendation_engine.py # Targeted exercise and prehab prescription generation
│   ├── dataset_loader.py        # CSV ingestion & descriptive statistical benchmark generator
│   ├── database.py              # SQLAlchemy engine, session factory, Postgres/SQLite fallback
│   ├── models.py                # SQLAlchemy ORM table declarations
│   ├── schemas.py               # Pydantic validation schemas
│   ├── init_db.py               # Database table initialization script
│   ├── verify_platform.py       # Comprehensive diagnostic and verification test suite
│   ├── models/                  # Serialized model directory (injury_rf_model.pkl, scaler.pkl)
│   └── uploads/                 # Uploaded video file storage directory
├── backend/frontend/            # Active React 18 + Vite frontend application
│   ├── src/
│   │   ├── App.jsx              # Application shell, authentication state, profile modal
│   │   ├── Dashboard.jsx        # Athlete summary cards, risk distribution, history drawer
│   │   ├── VideoAnalysis.jsx    # Video player, HTML5 Canvas 33-point pose skeleton renderer
│   │   ├── Recommendations.jsx  # 5-part exercise and prehab corrective prescriptions
│   │   ├── Performance.jsx      # Performance record tracking and history
│   │   ├── config/api.js        # API base URL configuration
│   │   └── utils/validation.js  # Client-side input validation and error parsing
│   ├── package.json             # NPM package manifest
│   └── vite.config.js           # Vite development server configuration
├── datasets/                    # Empirical benchmark and calibration datasets
│   ├── Project-Injury-Dataset.csv
│   ├── sports_multimodal_data.csv
│   └── collegiate_athlete_injury_dataset.csv
└── docs/                        # Dedicated technical and architectural documentation
    ├── architecture.md
    ├── technical-details.md
    ├── setup.md
    └── SYSTEM_DOCUMENTATION.md
```
