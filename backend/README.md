# Sports Injury Risk Detection — Backend Service

The backend service for the **Sports Injury Risk Detection System**, providing REST APIs for authentication, role-based access control (RBAC), athlete profile management, and binary video upload & storage.

Built with **Python 3.14+**, **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **Alembic**.

---

## 📂 Directory Structure

```
backend/
├── alembic/                      # Database migrations
│   ├── versions/                 # Alembic migration scripts
│   ├── env.py                    # Migration execution environment
│   └── script.py.mako            # Migration template
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app entrypoint, CORS & router registrations
│   ├── config.py                 # Pydantic Settings & environment configuration
│   ├── database.py               # Engine, SessionLocal, Base, get_db dependency
│   ├── api/                      # REST API endpoint routers
│   │   ├── auth.py               # Authentication (/auth/register, /auth/login, /auth/me, RBAC probes)
│   │   ├── athletes.py           # Athlete profiles (/athletes, /athletes/me, /athletes/{id})
│   │   └── videos.py             # Binary video upload & metadata (/videos)
│   ├── core/                     # Core security & dependency injection
│   │   ├── security.py           # Argon2id hashing & JWT signing/decoding
│   │   └── dependencies.py       # get_current_user, require_role, require_roles
│   ├── models/                   # SQLAlchemy ORM database models
│   │   ├── user.py               # User and RoleEnum models
│   │   ├── athlete.py            # Athlete profile model
│   │   ├── video.py              # Video metadata & BYTEA binary storage model
│   │   ├── analysis_result.py    # Biomechanical analysis result model
│   │   ├── injury_prediction.py  # Injury prediction model
│   │   ├── recommendation.py    # Recommendation model
│   │   ├── notification.py      # User notification model
│   │   ├── report.py            # PDF & export report model
│   │   ├── injury_history.py     # Past injury history model
│   │   └── performance_record.py # Baseline performance record model
│   └── schemas/                  # Pydantic v2 validation & response schemas
│       ├── auth.py               # Registration, Login, Token, and User responses
│       ├── athlete.py            # Athlete create, self-create, update, and responses
│       └── video.py              # Video upload metadata response schema
├── tests/                        # Automated Pytest suite
│   ├── conftest.py               # Shared test configuration
│   ├── test_auth_me.py           # Auth token & identity tests
│   └── test_rbac.py              # Role-based access control tests
├── alembic.ini                   # Alembic configuration file
├── requirements.txt              # Backend dependencies
└── .env.example                  # Environment variable configuration template
```

---

## 🔑 Core API Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Registers a new user account with Argon2id password hashing. |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials and returns a signed JWT access token. |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user details from database. |
| `GET` | `/api/v1/athletes/me` | Athlete | Fetches profile for the logged-in athlete. |
| `PUT` | `/api/v1/athletes/me` | Athlete | Upserts (creates or updates) profile details for logged-in athlete. |
| `PATCH`| `/api/v1/athletes/me` | Athlete | Partially updates logged-in athlete's profile. |
| `POST` | `/api/v1/athletes` | Admin / Coach | Manually provisions an athlete profile. |
| `GET` | `/api/v1/athletes` | Staff | Lists all athlete profiles. |
| `POST` | `/api/v1/videos` | Athlete | Uploads video binary (max 500 MB) into PostgreSQL BYTEA storage. |
| `GET` | `/health` | Public | Health check and database ping verification endpoint. |

---

## ⚡ Setup & Run Instructions

### 1. Create Virtual Environment
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\Activate.ps1

# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and set your PostgreSQL parameters:
```ini
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=sports_injury_db
SECRET_KEY=dev-secret-key-change-in-production
```

### 4. Run Database Migrations
```bash
alembic upgrade head
```

### 5. Start Development Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation:
- Swagger UI: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- ReDoc: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)

### 6. Run Test Suite
```bash
python -m pytest tests/ -v
```
