# SafeMove — AI-Powered Sports Injury Risk Detection Platform

SafeMove is an enterprise-grade AI decision-support platform analyzing athletic movement video and 3D biomechanics for non-invasive sports injury risk estimation.

> **IMPORTANT SCIENTIFIC DISCLAIMER**:
> *SafeMove provides decision-support analytics and movement symmetry tracking for coaches, physiotherapists, and sports scientists. It does NOT provide medical diagnoses or clinical treatment advice.*

---

## 🏗️ Tech Stack

| Component | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy (Async), Pydantic v2 |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Database** | PostgreSQL 16, SQLite fallback for local developer mode |
| **Computer Vision / ML** | MediaPipe Pose Landmarker, OpenCV, NumPy, SciPy, scikit-learn, XGBoost |
| **Orchestration** | Docker, Docker Compose v2 (Multi-stage builds) |

---

## 🐳 Docker Setup

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+ recommended)
- Docker Compose v2 (`docker compose`)
- Git

### 1. Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/springboardmentor10529m/sports-injury-risk-detection.git
cd sports-injury-risk-detection

# 2. Copy environment template
cp .env.example .env

# 3. (Optional) Adjust credentials in .env if needed
```

### 2. Production Deployment
Build and start all services (PostgreSQL, FastAPI Backend, Next.js Frontend):
```bash
# Build Docker images
docker compose build

# Start services in detached mode
docker compose up -d

# Verify container health status
docker compose ps
```

### 3. Development Mode (Hot Reloading)
For active development with live code reloading:
```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 🌐 Application Endpoints

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Next.js Athlete & Coach Dashboards |
| **Research Dashboard** | [http://localhost:3000/dashboard/research](http://localhost:3000/dashboard/research) | Phase 5B Baseline ML Research Dashboard |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI Core Service |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger OpenAPI Documentation |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | Backend Liveness & Readiness Probe |

---

## 📦 Persistent Storage & Volumes

SafeMove uses Docker named volumes to ensure zero data loss across container lifecycle restarts:

- `safemove_postgres_data`: Persists all PostgreSQL tables (Users, Athletes, VideoSessions, Kinematics, Anomalies, ML Metadata).
- `safemove_uploads`: Persists uploaded athlete video files (`/app/storage/videos`).
- `safemove_data`: Persists dataset partitions and compiled ML feature matrices (`/app/data`).

### Container Management Commands
```bash
# View backend logs in real-time
docker compose logs -f backend

# View frontend logs
docker compose logs -f frontend

# Gracefully stop containers (preserves all data)
docker compose down

# Full reset: Stop containers and delete persistent volumes
docker compose down -v
```
> [!CAUTION]
> Running `docker compose down -v` permanently removes database records and uploaded videos stored inside Docker volumes.

---

## 🧪 Testing & Verification Inside Container

You can run the full test suite and verification scripts directly:

```bash
# Run 85 backend unit and integration tests
docker compose exec backend pytest tests/ -v

# Run 8-point subsystem smoke check
docker compose exec backend python scripts/verify_docker.py
```

---

## ⚙️ Architecture & Subsystems

1. **Phase 1 — Auth & RBAC**: JWT Bearer tokens, password hashing, and role-based access control (`ATHLETE`, `COACH`, `PHYSIOTHERAPIST`, `SPORTS_SCIENTIST`, `ADMIN`).
2. **Phase 2 — Video Processing**: Secure upload validation, OpenCV video probing, streaming playback.
3. **Phase 3 — Pose & Kinematics**: MediaPipe 15-keypoint extraction, Savitzky-Golay smoothing, 3-point joint angles, angular velocities, accelerations, and bilateral symmetry.
4. **Phase 4 — Anomaly Detection**: Developmental baseline deviations, independent Z-score and percentage deviation calculations with configurable severity rules.
5. **Phase 5A — Dataset Pipeline**: Standardized schema, SHA-256 deduplication, subject-level split isolation (0 cross-split athlete leakage).
6. **Phase 5A.5 — Calgary Biomechanical Dataset**: Adapter for Nature Scientific Data 3D motion-capture tabular cohort.
7. **Phase 5B — Baseline ML Research**: Logistic Regression, Random Forest, and XGBoost classifiers with subject-isolated 4-fold cross-validation and feature explainability.

---

## 📄 License
MIT License.
