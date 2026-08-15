# Sports Injury Risk Detection from Video

An AI-powered platform that analyzes athlete movement videos to identify biomechanical issues, abnormal movement patterns, injury risk factors, and potential injuries.

---

## 🏗️ System Architecture & Technology Stack

- **Backend**: Python 3.14+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, Pydantic v2
- **Frontend**: React.js, Vite, Vanilla CSS Design System
- **Computer Vision & AI (Upcoming Phases)**: MediaPipe, OpenCV, PyTorch biomechanical keypoint analysis

---

## 📂 Repository Structure

```
sports-injury-risk-detection/
├── .env.example              # Global environment variable template
├── backend/                  # FastAPI backend service
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # Application code (models, config, database, API)
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend setup & migration guide
├── frontend/                 # React.js frontend application
└── docs/                     # Documentation and architecture diagrams
```

---

## ⚡ Quick Start (Backend)

For complete backend setup and migration instructions, see [backend/README.md](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/README.md).

```bash
# 1. Navigate to backend directory
cd backend

# 2. Set up virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Windows
# source .venv/bin/activate    # On Linux / macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment configuration
cp .env.example .env

# 5. Run database migrations
alembic upgrade head

# 6. Start development server
uvicorn app.main:app --reload
```

Interactive API documentation will be available at [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs).