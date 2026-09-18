# Setup and Installation Guide

This guide provides step-by-step instructions to configure, install, run, and verify the **SportShield** sports injury risk detection platform on your local machine.

---

## 1. System Requirements

| Requirement | Specification |
| :--- | :--- |
| **Operating System** | Windows 10/11, macOS 12+, or Ubuntu 20.04+ |
| **Python** | Python 3.10 or Python 3.11 (64-bit) |
| **Node.js** | Node.js 18.x or 20.x LTS with `npm` |
| **Database** | PostgreSQL 14+ (optional; SQLite is built-in as an automated fallback) |
| **Hardware** | 8 GB RAM minimum, dual-core processor or better |

---

## 2. Repository Cloning

```bash
git clone https://github.com/your-username/sports-injury-risk-detection.git
cd sports-injury-risk-detection
```

---

## 3. Backend Setup

### Step 3.1: Navigate to the Backend Directory
```bash
cd backend
```

### Step 3.2: Create and Activate a Python Virtual Environment

**On Windows (PowerShell / Command Prompt):**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**On macOS / Linux (Bash / Zsh):**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3.3: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

*Key dependencies installed:*
- `fastapi`, `uvicorn`, `python-multipart`
- `mediapipe`
- `opencv-python-headless`
- `scikit-learn`, `numpy`, `pandas`
- `sqlalchemy`, `psycopg2-binary`
- `pydantic`

### Step 3.4: Environment Configuration (`.env`)
Create a `.env` file in the `backend/` directory if not already present:

```env
DATABASE_URL=sqlite:///./sports_injury.db
# To use PostgreSQL instead:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sports_injury_db

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORT=8000
```

### Step 3.5: Initialize the Database & ML Model
```bash
python init_db.py
```
This script creates all necessary tables (`users`, `athletes`, `videos`, `analysis_results`, `injury_predictions`, `recommendations`, `injury_histories`, `performance_records`) and fits the initial baseline Random Forest model.

### Step 3.6: Start the FastAPI Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`
- Alternative Redoc Docs: `http://localhost:8000/redoc`

---

## 4. Frontend Setup

### Step 4.1: Open a New Terminal and Navigate to Frontend Directory
```bash
cd backend/frontend
```

### Step 4.2: Install NPM Packages
```bash
npm install
```

### Step 4.3: Configure Frontend Environment (`.env`)
Create a `.env` file in `backend/frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

### Step 4.4: Start the Vite Development Server
```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:5173`**

---

## 5. Automated System Verification

To verify that the database, ML model, MediaPipe Pose engine, and API endpoints are functioning properly:

```bash
cd backend
python verify_platform.py
```

Expected output:
```
==================================================
  SPORTSHIELD PLATFORM VERIFICATION
==================================================
[PASS] Database Connection & Table Schema Verified
[PASS] Project-Injury-Dataset Loaded (50 records)
[PASS] Random Forest ML Classifier Active & Scaled
[PASS] MediaPipe PoseLandmarker Ready
[PASS] End-to-End Synthetic Video Analysis Completed
==================================================
ALL CHECKS PASSED SUCCESSFULLY!
==================================================
```

---

## 6. Troubleshooting Common Issues

### 1. `mediapipe` or `opencv` installation issues on Windows
- Ensure you have the [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) installed.
- Make sure you are using Python 3.10 or 3.11 64-bit.

### 2. CORS Error when calling API from React
- Verify that `backend/.env` has `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- Ensure FastAPI is running on port 8000.

### 3. Database connection failure
- By default, SportShield falls back to local SQLite (`sqlite:///./sports_injury.db`). If using PostgreSQL, ensure your Postgres service is running and credentials match `DATABASE_URL`.
