# KINETIQ — Sports Injury Risk Detection

**KINETIQ** is a sports intelligence platform designed to support video-based sports injury risk detection and athlete performance monitoring.

The current implementation provides a web-based dashboard, role-based application flow, video upload functionality, and a FastAPI backend prepared for future AI-powered movement and injury-risk analysis.

---

## 📌 Project Overview

Sports injuries can occur due to factors such as improper movement, fatigue, excessive training load, poor biomechanics, and repetitive stress.

KINETIQ aims to use sports video analysis to identify potentially risky movement patterns and provide useful insights to athletes, coaches, and sports professionals.

### Current Implementation

The current version includes:

* KINETIQ landing page
* Role selection
* Login interface
* Dashboard
* Dashboard statistics
* Sports video upload
* Video format validation
* Unique uploaded-video filenames
* FastAPI backend
* REST API endpoints
* CORS configuration
* Health-check endpoint
* Interactive Swagger API documentation

### Future Development

The platform can be extended with:

* AI-based pose estimation
* Movement analysis
* Injury-risk prediction
* Athlete-specific risk scores
* Fatigue detection
* Training-load analysis
* Historical assessment tracking
* AI-generated recommendations
* Athlete and coach management
* Database-backed user authentication

---

# 🛠️ Technology Stack

## Frontend

* React
* Vite
* React Router
* Lucide React
* JavaScript
* CSS

## Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* Python Multipart
* Python-Jose
* Passlib
* Python Dotenv

---

# 📂 Project Structure

```text
sports-injury-risk-detection/
│
├── backend/
│   │
│   ├── app/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── uploads/
│
├── frontend/
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   ├── src/
│   │   │
│   │   ├── api/
│   │   │   ├── analysis.js
│   │   │   ├── auth.js
│   │   │   ├── client.js
│   │   │   ├── dashboard.js
│   │   │   ├── upload.js
│   │   │   └── video.js
│   │   │
│   │   ├── components/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── Topbar.jsx
│   │   │   └── VideoUpload.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── RoleSelection.jsx
│   │   │   ├── UploadVideo.jsx
│   │   │   └── dashboards/
│   │   │       └── Dashboard.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── docs/
│
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🚀 Getting Started

Follow the instructions below to run KINETIQ locally.

## Prerequisites

Make sure the following are installed:

* Git
* Python 3.9 or higher
* Node.js 18 or higher
* npm

Verify the installations:

```bash
git --version
python --version
node --version
npm --version
```

---

# 📥 Clone the Repository

The current KINETIQ implementation is available on the development branch:

```text
samitha-muthyala
```

Clone the repository directly using:

```bash
git clone -b samitha-muthyala https://github.com/springboardmentor10529m/sports-injury-risk-detection.git
```

Enter the project directory:

```bash
cd sports-injury-risk-detection
```

---

# ⚙️ Backend Setup

The backend is built using **FastAPI**.

## 1. Navigate to Backend

```bash
cd backend
```

## 2. Create a Python Virtual Environment

### Windows

```powershell
python -m venv venv
```

Activate the virtual environment:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell does not allow the activation command, try:

```powershell
.\venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

The backend dependencies include:

```text
fastapi
uvicorn
python-multipart
python-jose
passlib
sqlalchemy
python-dotenv
pydantic
```

---

# ▶️ Start the Backend

Make sure you are inside the `backend` directory.

Run:

```bash
python -m uvicorn app.main:app --reload
```

The backend will start at:

```text
http://127.0.0.1:8000
```

You should see a message similar to:

```text
Application startup complete.
```

---

# 📚 FastAPI Swagger Documentation

KINETIQ uses FastAPI's built-in interactive API documentation.

Once the backend is running, open:

```text
http://127.0.0.1:8000/docs
```

Swagger allows you to:

* View available API endpoints
* Test API requests
* Test the health-check endpoint
* Retrieve dashboard data
* Upload sports videos
* Inspect API responses

Alternative documentation is available at:

```text
http://127.0.0.1:8000/redoc
```

---

# 🔌 Backend API Endpoints

The current backend provides the following endpoints.

## 1. Root Endpoint

```http
GET /
```

Returns the current API status.

Example response:

```json
{
  "message": "KINETIQ API is running",
  "status": "ok"
}
```

---

## 2. Health Check

```http
GET /api/health
```

Used to verify that the KINETIQ backend is healthy and running.

Example response:

```json
{
  "status": "healthy",
  "service": "KINETIQ Backend"
}
```

---

## 3. Dashboard Data

```http
GET /api/dashboard
```

Returns dashboard statistics used by the frontend.

The response currently contains information such as:

* Injury risk
* Movement score
* Fatigue level
* Training load
* Number of athletes
* High-risk athletes
* Recovery
* Assessments
* Athletes analyzed
* Risk detections
* Total users
* Active users
* Number of analyses
* System status

---

## 4. Video Upload

```http
POST /api/upload
```

Accepts a video file using multipart form data.

### Supported formats

```text
.mp4
.mov
.avi
.mkv
.webm
```

The backend:

1. Checks whether a file was selected.
2. Validates the video extension.
3. Extracts the original filename safely.
4. Generates a unique filename using a timestamp.
5. Saves the video to the upload directory.
6. Calculates the file size.
7. Returns upload information to the frontend.

Example response:

```json
{
  "status": "success",
  "message": "Video uploaded successfully",
  "filename": "20260818_123456_123456_sample.mp4",
  "original_filename": "sample.mp4",
  "file_path": "uploads/20260818_123456_123456_sample.mp4",
  "file_size": 1234567,
  "analysis_status": "pending",
  "ai_analysis": false
}
```

---

# 💻 Frontend Setup

Open a **new terminal** while keeping the backend running.

From the project root:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

---

# ▶️ Start the Frontend

Run:

```bash
npm run dev
```

Vite will start the development server.

The application will normally be available at:

```text
http://localhost:5173
```

Open the URL shown in the terminal.

---

# 🖥️ Frontend Application Flow

The current frontend follows this general flow:

```text
┌─────────────────────────┐
│     KINETIQ Home        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Role Selection      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│         Login           │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│       Dashboard         │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
┌─────────────┐ ┌─────────────┐
│   Upload    │ │  Dashboard  │
│    Video    │ │    Stats    │
└──────┬──────┘ └─────────────┘
       │
       ▼
┌─────────────────────────┐
│   Video Upload API      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Future AI Analysis      │
│ & Injury Risk Detection │
└─────────────────────────┘
```

---

# 🧩 Frontend Pages

The frontend currently contains the following major pages.

### Home

```text
frontend/src/pages/Home.jsx
```

Landing page for KINETIQ.

### Role Selection

```text
frontend/src/pages/RoleSelection.jsx
```

Allows the user to select the relevant application role.

### Login

```text
frontend/src/pages/Login.jsx
```

Provides the login interface.

### Dashboard

```text
frontend/src/pages/dashboards/Dashboard.jsx
```

Displays KINETIQ dashboard information and statistics.

### Upload Video

```text
frontend/src/pages/UploadVideo.jsx
```

Provides the interface for uploading sports videos.

---

# 🧱 Reusable Components

The frontend uses reusable React components.

```text
frontend/src/components/
```

Important components include:

### DashboardLayout

Provides the overall dashboard layout.

### Sidebar

Provides dashboard navigation.

### Topbar

Provides the dashboard header/navigation area.

### StatCard

Displays dashboard statistics.

### VideoUpload

Handles the video-upload interface.

---

# 🔗 Frontend API Modules

API communication is separated into dedicated JavaScript modules.

```text
frontend/src/api/
```

### `client.js`

Central API client configuration.

### `auth.js`

Authentication-related API functions.

### `dashboard.js`

Dashboard API functions.

### `upload.js`

Video upload API functionality.

### `video.js`

Video-related API functionality.

### `analysis.js`

Analysis-related API functionality prepared for future integration.

---

# 🔄 Running Frontend and Backend Together

KINETIQ requires **two terminals** during development.

## Terminal 1 — Backend

```bash
cd sports-injury-risk-detection/backend
```

Activate the virtual environment and run:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Terminal 2 — Frontend

```bash
cd sports-injury-risk-detection/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 Frontend Development Commands

## Start development server

```bash
npm run dev
```

## Build for production

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Run ESLint

```bash
npm run lint
```

---

# 📤 Video Upload Storage

Uploaded videos are temporarily stored in:

```text
backend/uploads/
```

The upload directory is automatically created by the FastAPI application when the backend starts.

Uploaded files should **not** be committed to GitHub.

Make sure the following is included in the root `.gitignore`:

```text
backend/uploads/
```

---

# 🔐 Security Considerations

The project includes dependencies and architecture intended to support secure application development, including:

* JWT authentication support
* Password hashing
* CORS configuration
* Input validation
* File extension validation
* Safe filename extraction
* Environment variable support

The current implementation is a development version and should undergo additional security hardening before production deployment.

---

# 🤖 AI Analysis — Development Status

The long-term objective of KINETIQ is to analyze uploaded sports videos and identify movement patterns associated with potential injury risks.

The current backend upload response contains:

```json
{
  "analysis_status": "pending",
  "ai_analysis": false
}
```

This indicates that **AI-based video analysis is not yet connected to the current upload endpoint**.

Future analysis functionality may include:

* Human pose estimation
* Joint-angle analysis
* Movement-pattern detection
* Biomechanical analysis
* Fatigue indicators
* Injury-risk scoring
* Athlete performance trends
* Risk alerts
* Personalized recommendations

This separation allows the current application architecture to be extended with an AI analysis pipeline later.

---

# 🗄️ Database

SQLAlchemy is included in the backend dependencies to support database integration.

The database layer can be extended to store:

* User accounts
* Athlete profiles
* Coach profiles
* Uploaded videos
* Analysis results
* Injury-risk scores
* Historical assessments
* Training information
* Recovery information

The current dashboard endpoint uses demonstration/static data while the database-backed functionality is being developed.

---

# 🌐 CORS Configuration

The backend currently allows requests from the local Vite development servers:

```text
http://localhost:5173
http://127.0.0.1:5173
```

This allows the React frontend to communicate with the FastAPI backend during local development.

---

# 🐛 Troubleshooting

## `uvicorn` is not recognized

Instead of:

```bash
uvicorn app.main:app --reload
```

use:

```bash
python -m uvicorn app.main:app --reload
```

---

## Python virtual environment cannot be activated

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

If necessary, use:

```powershell
.\venv\Scripts\activate
```

---

## Backend dependencies are missing

Make sure the virtual environment is active and run:

```bash
pip install -r requirements.txt
```

---

## Frontend dependencies are missing

Inside the frontend directory:

```bash
npm install
```

Then:

```bash
npm run dev
```

---

## Frontend cannot connect to backend

Make sure the backend is running:

```bash
python -m uvicorn app.main:app --reload
```

Then verify:

```text
http://127.0.0.1:8000/api/health
```

You should receive:

```json
{
  "status": "healthy",
  "service": "KINETIQ Backend"
}
```

Also make sure the frontend is running at:

```text
http://localhost:5173
```

---

## Swagger page is not opening

Verify that the backend is running and open:

```text
http://127.0.0.1:8000/docs
```

If the backend terminal shows:

```text
Application startup complete.
```

the API should be available.

---

# 🌿 Git Branch

The current implementation is available on:

```text
samitha-muthyala
```

To switch to this branch after cloning:

```bash
git checkout samitha-muthyala
```

Or clone it directly:

```bash
git clone -b samitha-muthyala https://github.com/springboardmentor10529m/sports-injury-risk-detection.git
```

The `main` branch may not contain the latest KINETIQ implementation.

---

# 📋 Quick Start

For a quick setup:

### Clone

```bash
git clone -b samitha-muthyala https://github.com/springboardmentor10529m/sports-injury-risk-detection.git
cd sports-injury-risk-detection
```

### Backend

```bash
cd backend
python -m venv venv
```

Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start server:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Open another terminal:

```bash
cd sports-injury-risk-detection/frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 📌 Current Status

| Component                | Status            |
| ------------------------ | ----------------- |
| KINETIQ Home Page        | ✅ Implemented     |
| Role Selection           | ✅ Implemented     |
| Login Interface          | ✅ Implemented     |
| Dashboard                | ✅ Implemented     |
| Dashboard Statistics API | ✅ Implemented     |
| Video Upload UI          | ✅ Implemented     |
| Video Upload API         | ✅ Implemented     |
| Video Format Validation  | ✅ Implemented     |
| FastAPI Backend          | ✅ Implemented     |
| Swagger Documentation    | ✅ Available       |
| Health Check API         | ✅ Implemented     |
| Database Integration     | 🔄 In Development |
| Authentication Backend   | 🔄 In Development |
| AI Video Analysis        | 🔄 Planned        |
| Injury Risk Prediction   | 🔄 Planned        |
| Pose Estimation          | 🔄 Planned        |

---

# 👩‍💻 Project Information

**Project Name:** KINETIQ — Sports Injury Risk Detection

**Repository:** `sports-injury-risk-detection`

**Development Branch:** `samitha-muthyala`

**Frontend:** React + Vite

**Backend:** FastAPI + Python

**API Documentation:** FastAPI Swagger UI

---

# 📄 License

This project is distributed under the license included in the repository.

See the [`LICENSE`](LICENSE) file for details.

---

## KINETIQ

**Sports Intelligence • Video Analysis • Injury Risk Detection**
