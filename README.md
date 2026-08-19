# SportsShield — Sports Injury Risk Detection & Athlete Management Platform

SportsShield is a full-stack web platform designed to analyze movement biomechanics, evaluate athletic performance metrics, predict injury risks, and provide tailored safety and training recommendations for athletes and coaches.

---

## 📌 Problem Statement

Athletes frequently face preventable sports injuries due to poor movement mechanics, overtraining, fatigue, joint misalignments, and asymmetrical load distribution. Traditional injury assessments often require expensive specialized biomechanics laboratory equipment. SportsShield bridges this gap by providing an accessible software-driven solution to track athletic performance, process movement videos, evaluate risk indicators, and provide proactive training and safety guidance.

---

## 🎯 Objectives

1. **User Authentication & Athlete Profiling**: Secure registration, login, role management, and detailed athlete profile management.
2. **Real-World Data Validation**: Enforce realistic data entry rules (valid names, strict Indian 10-digit mobile numbers, strong password complexity, email verification).
3. **Performance Tracking**: Log, store, and analyze performance scores over time.
4. **Video Upload & Biomechanical Analysis**: Upload movement videos and receive automated biomechanical metric scoring (knee valgus, hip stability, trunk lean, stride length, symmetry).
5. **Injury Risk Prediction**: Assess specific injury risk categories (ACL, hamstring, ankle, shoulder, lower back, overuse).
6. **Actionable Safety Guidance**: Present personalized training, mobility, and recovery recommendations (non-medical, safety-focused).
7. **Production & GitHub Readiness**: Deployment-ready configurations, clean code structure, environment variable handling, and complete test coverage.

---

## ⚡ Main Features

- 🔐 **Secure Auth & Account System**: User registration with PBKDF2-SHA256 password hashing and session persistence.
- 👤 **Athlete Profile Management**: Comprehensive physical & athletic metrics tracking (height, weight, flexibility, strength, balance, endurance, training load) with real-time profile editing (upsert).
- 📈 **Performance Dashboard**: Real-time performance trend visualizations, activity history, and risk summary.
- 📹 **Video Biomechanical Analysis**: Video upload pipeline and biomechanical parameter evaluation (simulated/demo pipeline baseline with structured extension points for computer vision ML model integration).
- 🛡️ **Injury Risk Assessment**: Quantitative risk scoring across key joint and muscular areas.
- 💡 **Personalized Recommendations**: Context-aware exercise, mobility, and training modification recommendations.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Modern Vanilla CSS with dark mode aesthetics, glassmorphism, responsive grid/flexbox layouts.
- **HTTP Client**: Standard HTML5 Fetch API with central configuration.

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM / Database Access**: SQLAlchemy 2.0
- **Security & Passwords**: PBKDF2-SHA256 with unique 16-byte salt per user.
- **Server**: Uvicorn ASGI Server

### Database
- **Database Engine**: PostgreSQL 15+
- **Driver**: Psycopg 3 (`postgresql+psycopg`)

---

## 📐 System Architecture

```
+-------------------------------------------------------------+
|                      React Frontend                         |
|  (Home, Auth, Profile Setup, Dashboard, Performance, Video) |
+------------------------------+------------------------------+
                               | REST API (JSON / Multipart)
                               v
+-------------------------------------------------------------+
|                     FastAPI Backend                         |
|  (Auth, Athlete Upsert, Performance, Video, Analysis, Risk) |
+------------------------------+------------------------------+
                               | SQLAlchemy ORM
                               v
+-------------------------------------------------------------+
|                   PostgreSQL Database                       |
|   (users, athletes, performance_records, videos, etc.)      |
+-------------------------------------------------------------+
```

---

## 🗄️ Database ER Diagram

```mermaid
erDiagram
    USERS {
        UUID user_id PK
        string name
        string email UK
        text password
        string role
        string phone
        text profile_image
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
        text coach_notes
    }

    PERFORMANCE_RECORDS {
        UUID record_id PK
        UUID athlete_id FK
        string activity
        float score
        text remarks
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

    USERS ||--o{ ATHLETES : "has"
    ATHLETES ||--o{ PERFORMANCE_RECORDS : "logs"
    ATHLETES ||--o{ VIDEOS : "uploads"
    ATHLETES ||--o{ ANALYSIS_RESULTS : "receives"
    VIDEOS ||--o{ ANALYSIS_RESULTS : "analyzed_in"
    ANALYSIS_RESULTS ||--o| INJURY_PREDICTIONS : "predicts"
    INJURY_PREDICTIONS ||--o| RECOMMENDATIONS : "generates"
```

---

## 🔄 Athlete Workflow

```mermaid
flowchart TD
    A[Athlete] --> B[Registration]
    B --> C[Login]
    C --> D[Athlete Profile Setup / Update]
    D --> E[Dashboard]
    E --> F[Performance Tracking]
    E --> G[Video Upload]
    G --> H[Biomechanical Movement Analysis]
    H --> I[Injury Risk Prediction]
    I --> J[Personalized Recommendations]
    J --> K[Training & Safety Decisions]
    F --> E
    J --> E

    subgraph Platform["SportShield Platform"]
        B
        C
        D
        E
        F
        G
        H
        I
        J
    end
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
# PostgreSQL Connection URL
DATABASE_URL=postgresql+psycopg://postgres:041211@localhost:5432/sports_injury_db

# Allowed CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Server Port
PORT=8000
```

### Frontend (`backend/frontend/.env`)
```ini
# Base URL for API requests
VITE_API_URL=http://127.0.0.1:8000
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ & npm
- PostgreSQL 15+ running locally or remote connection

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment file
cp .env.example .env
# Edit .env to set your local PostgreSQL database credentials

# Initialize database tables
python init_db.py

# Start FastAPI development server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd backend/frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```

The application will be accessible at `http://localhost:5173` and the API documentation at `http://127.0.0.1:8000/docs`.

---

## 📋 Validation Rules Summary

| Field | Client Validation Rule | Backend Validation Rule |
| :--- | :--- | :--- |
| **Name** | Min 2 chars, contains letters | Min 2 chars, contains letters |
| **Email** | Standard email pattern | Pydantic `EmailStr`, duplicate check |
| **Password** | Min 8 chars, not numeric-only | Min 8 chars, not numeric-only |
| **Phone** | 10-digit Indian mobile (`^[6789]\d{9}$`) | 10-digit Indian mobile (`^[6789]\d{9}$`) |
| **Performance Score** | Number 0 - 100 | Float `ge=0, le=100` |
| **Physical Metrics** | Number ranges (age 5-100, height 0-300cm, weight 0-500kg) | Number ranges in Pydantic schema |

---

## 📡 API Overview

- `GET /` — API health check & DB status
- `POST /register` — Register new user account
- `POST /login` — Authenticate user
- `POST /athlete` — Create or update athlete profile (upsert)
- `GET /athlete/{identifier}` — Retrieve athlete profile by athlete_id or user_id
- `POST /performance` — Add new performance record
- `GET /performance/{athlete_id}` — Get performance history for athlete
- `POST /video/upload` — Upload video file for processing
- `GET /videos/{athlete_id}` — Get uploaded videos for athlete
- `POST /analysis` — Generate movement analysis metrics
- `GET /analysis/{athlete_id}` — Get movement analysis results for athlete
- `POST /prediction` — Generate injury risk predictions
- `GET /prediction/{analysis_id}` — Get prediction scores by analysis_id
- `POST /recommendation` — Create personalized recommendations
- `GET /recommendation/{prediction_id}` — Get recommendations by prediction_id

---

## 🧪 Testing

### Automated Backend Tests
Run the standalone backend API test suite:
```bash
cd backend
.\venv\Scripts\python.exe C:\Users\aruna\.gemini\antigravity-ide\brain\f58f40fe-cf19-4ede-bb5f-e55178e47a7e\scratch\test_backend_api.py
```

### Production Build Verification
```bash
cd backend/frontend
npm run build
```

---

## 🌐 Deployment Instructions

### Render Deployment (Recommended)
1. Fork or push this repository to GitHub.
2. Log in to [Render](https://render.com).
3. Create a **New PostgreSQL Database** named `sportshield-db`. Note the **Internal Database URL**.
4. Create a **New Web Service** connected to your GitHub repository:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `DATABASE_URL`: Your Render PostgreSQL database URL
     - `CORS_ORIGINS`: Your deployed frontend URL (e.g. `https://your-frontend.vercel.app`)
5. Deploy the frontend on Vercel or Netlify by pointing to `backend/frontend`, setting `VITE_API_URL` to your Render API service URL.

---

## 📝 Limitations & Future Enhancements

- **Biomechanical Processing**: Current movement metrics (knee valgus, hip stability, trunk lean) return demonstration baseline scores. Future updates will integrate OpenCV / MediaPipe pose estimation models to calculate joint angles directly from uploaded MP4/WEBM videos.
- **Push Notifications**: Real-time notifications for coach comments and fatigue alerts.
- **Wearable Sensor Integration**: Support for sync with smartwatches and IMU sensors.

---

## 📜 License
MIT License.