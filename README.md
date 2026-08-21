# Sports Injury Risk Detection from Movement Video
An end-to-end AI-ready web platform for athlete movement analysis, physical profile management, movement video storage, and injury risk detection.

#📌 Project Overview
Preventable musculoskeletal injuries—such as ACL tears, hamstring strains, and joint misalignments—frequently result from undetected biomechanical movement flaws, muscle imbalances, and excessive training loads. The Sports Injury Risk Detection System provides an automated platform to collect athlete physical metrics, store movement videos securely in a relational database, and lay the foundation for automated computer vision (CV) and machine learning (ML) biomechanical assessments.


#🎯 Problem Statement & Objectives
Problem Statement
Traditional sports injury prevention relies heavily on manual, visual evaluations by coaches and physiotherapists. These evaluations are often subjective, inconsistent, and difficult to scale across team rosters. Furthermore, physical metrics and movement recordings are rarely centralized, leading to delayed interventions and higher injury rates.


#Project Objectives
Centralized Profile Management: Provide a secure platform for athletes to maintain physical baselines (sport, position, age, height, weight).
Secure Movement Video Vault: Store raw movement video binaries (MP4, MOV, AVI, WebM) directly in PostgreSQL for data integrity and AI model pipeline access.
Profile-Gated Assessment Workflow: Enforce profile completeness checks to ensure physical parameters are recorded prior to video submissions.
Role-Based Collaboration: Enable seamless interaction between Athletes, Coaches, Physiotherapists, Sports Scientists, and Administrators.
Extensible AI Architecture: Prepare database schemas, REST APIs, and UI pipelines for seamless MediaPipe pose estimation, ML risk scoring, and automated recommendation generation.
✅ Features Currently Implemented
User Authentication & Role-Based Access Control (RBAC):


#Registration & Login with Argon2id password hashing.
Stateless JWT Bearer Token authentication with client-side Axios interceptor.
Database-authoritative role verification (Athlete, Coach, Physiotherapist, Sports Scientist, Administrator).
Defense-in-depth security: Blocked Administrator self-registration & constant-time password check.
Athlete Profile Management:


#Read-only identity views (user_id, athlete_id, name, email, role).
Editable physical baselines (sport, position, age, height, weight).
Profile completeness evaluation (✓ Complete vs ⚠ Incomplete).
Single-call upsert endpoint (PUT /api/v1/athletes/me) with server-side identity resolution.
Video Binary Upload & PostgreSQL Storage:


#Upload movement videos up to 500 MB via multipart/form-data.
Client-side & server-side MIME type validation (video/mp4, video/quicktime, video/x-msvideo, video/webm).
Binary persistence in PostgreSQL using the BYTEA column format (file_data).
Real-time frontend progress bar (0–100%) and post-upload metadata confirmation card (original_filename, content_type, file_size, uploaded_at).
Profile-Gated Video Analysis UI:


#Automatic profile status check before unlocking the video upload interface.
Warning callout with a quick-action link to complete profile details if missing.
💻 Tech Stack
Frontend
Framework: React 18 (Vite)
Routing & State: React Router v6, React Context API (AuthContext)
HTTP Client: Axios with Request/Response interceptors
Icons & Styling: Lucide React Icons, Custom Vanilla CSS Design System
Backend
Language & Framework: Python 3.14+, FastAPI
Validation & Settings: Pydantic v2, Pydantic Settings
Database & ORM: PostgreSQL 14+, SQLAlchemy 2.0 (ORM & Mapped Types)
Migrations: Alembic
Security: Argon2id (argon2-cffi), PyJWT (python-jose), FastAPI OAuth2 Bearer
#🔄 System Workflow & Architecture Summary
[User Register/Login] ──> [JWT Token Issued] ──> [Profile Completeness Check]
                                                        │
                    ┌───────────────────────────────────┴───────────────────────────────────┐
                    ▼                                                                       ▼
         [If Incomplete: Locked UI]                                            [If Complete: Unlocked Upload]
         Prompt to update profile                                              Upload video (multipart/form-data)
                    │                                                                       │
                    └─────────────────> [PUT /athletes/me] ─────────────────────────────────┘
                                                                                            │
                                                                                            ▼
                                                                               [POST /videos Endpoint]
                                                                                            │
                                                                                            ▼
                                                                               [PostgreSQL BYTEA Storage]
#Detailed architectural specifications, data flows, and database ERDs are available in the docs/ folder:

📄 docs/workflow.md: Complete end-to-end user workflow and planned AI pipeline.
📄 docs/architecture.md: Technical architecture, JWT security sequence, and video storage pipeline.
📄 docs/database.md: Database schema descriptions, PostgreSQL ERD, and migration history.
📄 docs/wireframes/README.md: Low-fidelity UI/UX wireframes for all pages.
📂 Project Structure
#sports-injury-risk-detection/
├── backend/                      # FastAPI Backend Application
│   ├── alembic/                  # Alembic database migrations
│   ├── app/                      # Main application source code
│   │   ├── api/                  # REST API routers (auth, athletes, videos)
│   │   ├── core/                 # Security (Argon2id, JWT) & RBAC dependencies
│   │   ├── models/               # SQLAlchemy 2.0 database models
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   ├── config.py             # Application settings & environment vars
│   │   ├── database.py           # Database engine & session generator
│   │   └── main.py               # FastAPI entrypoint & router registrations
│   ├── tests/                    # Pytest suite (auth & RBAC boundary tests)
│   └── README.md                 # Backend documentation
├── frontend/                     # React.js SPA Application
│   ├── src/
│   │   ├── api/                  # Axios REST API services (auth, athletes, videos)
│   │   ├── components/           # UI components (Navbar, Sidebar, RiskBadge, etc.)
│   │   ├── context/              # AuthContext session provider
│   │   ├── pages/                # Pages (Landing, Login, Profile, VideoAnalysis, etc.)
│   │   └── index.css             # Vanilla CSS design system
│   └── README.md                 # Frontend documentation
└── docs/                         # Architecture & workflow documentation
    ├── workflow.md               # User journey & workflow breakdown
    ├── architecture.md           # System architecture & sequence diagrams
    ├── database.md               # Database schema & ERD
    └── wireframes/               # Low-fidelity UI wireframes
        └── README.md

#⚡ Setup & Run Instructions
🐳 Option A: Running with Docker Compose (Recommended)
Run the entire application stack (Frontend, Backend, and PostgreSQL) with a single command using Docker Compose:


# Build and start all services in detached mode
docker compose up -d --build



# View container logs
docker compose logs -f



# Stop all services
docker compose down
Docker Stack Services:
Frontend SPA: http://localhost:5173
FastAPI Backend API: http://localhost:8000
API Swagger Documentation: http://localhost:8000/api/v1/docs
PostgreSQL Database: Port 5432 with persistent Docker volume sports_injury_postgres_data

💻 Option B: Manual Local Setup
Prerequisites
Python: 3.11+ (Tested on Python 3.14)

Node.js: 18+ and npm
PostgreSQL: 14+ service running locally or remotely

1. Database Setup
Create a PostgreSQL database named sports_injury_db:

CREATE DATABASE sports_injury_db;
2. Backend Setup
cd backend

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate    # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment file
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
Interactive documentation: http://127.0.0.1:8000/api/v1/docs

3. Frontend Setup
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
Access application UI: http://localhost:5173




