# Sports Injury Risk Detection - Backend

AI-powered platform backend for athlete movement analysis, injury risk detection, biomechanical assessment, and training load tracking.

Built with **Python 3.14+**, **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **Alembic**.

---

## 📁 Backend Directory Structure

```
backend/
├── alembic/                      # Database migrations
│   ├── versions/                 # Version migration scripts
│   └── env.py                    # Migration execution environment
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI application entrypoint & health checks
│   ├── config.py                 # Pydantic Settings & environment variables
│   ├── database.py               # Engine, SessionLocal, Base, get_db dependency
│   └── models/                   # SQLAlchemy ORM database models
│       ├── __init__.py
│       ├── user.py               # User and RoleEnum models
│       ├── athlete.py            # AthleteProfile model
│       ├── injury.py             # InjuryRecord model
│       ├── training.py           # TrainingLoad model
│       └── assessment.py         # PhysicalAssessment model
├── alembic.ini                   # Alembic configuration
├── requirements.txt              # Production and development dependencies
└── .env.example                  # Environment configuration template
```

---

## 🛠️ Prerequisites

- **Python**: 3.11+ (Tested on Python 3.14)
- **PostgreSQL**: 14+ (or SQLite for isolated local test runs)

---

## 🚀 Setup & Installation Instructions

### 1. Create and Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**On Linux / macOS:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux / macOS:**
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL database parameters:
```ini
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=sports_injury_db
```

---

## 🗄️ Database Migrations (Alembic)

Ensure your PostgreSQL service is running and the database `sports_injury_db` is created.

### Apply Migrations to Latest Schema:
```bash
alembic upgrade head
```

### Roll Back One Migration:
```bash
alembic downgrade -1
```

### Generate a New Migration (after modifying models):
```bash
alembic revision --autogenerate -m "describe_your_changes"
```

---

## ▶️ Running the Backend Server

Start the FastAPI application with live reloading using Uvicorn:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 🔍 Interactive API Documentation

Once the server is running, visit:
- **Interactive Swagger UI**: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)
- **Health Check & DB Status**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🩺 Verifying Database Connection

To quickly test and verify database connectivity from the command line:

```bash
python -c "from app.database import engine; from sqlalchemy import text; conn = engine.connect(); print('Database connection SUCCESS:', conn.execute(text('SELECT 1')).scalar()); conn.close()"
```

Or query the `/health` endpoint while the server is running:
```bash
curl http://127.0.0.1:8000/health
```
Expected response:
```json
{
  "status": "healthy",
  "database": "healthy",
  "environment": "development"
}
```
