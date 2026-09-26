# Sports Injury Risk Detection Platform
## Deployment & Infrastructure Guide

---

### Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Method 1: Docker Compose Deployment (Recommended)](#2-method-1-docker-compose-deployment-recommended)
   - [Architecture Topology](#21-architecture-topology)
   - [Docker Compose Configuration](#22-docker-compose-configuration)
   - [Starting the Services](#23-starting-the-services)
   - [Container Health Checks](#24-container-health-checks)
3. [Method 2: Bare-Metal / Local Development Setup](#3-method-2-bare-metal--local-development-setup)
   - [Backend Setup (FastAPI & SQLite)](#31-backend-setup-fastapi--sqlite)
   - [Frontend Setup (React & Vite)](#32-frontend-setup-react--vite)
   - [FFMPEG Installation & Validation](#33-ffmpeg-installation--validation)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Database Configuration & Migrations](#5-database-configuration--migrations)
6. [Production Hardening & Reverse Proxy (Nginx)](#6-production-hardening--reverse-proxy-nginx)
7. [Troubleshooting & FAQ](#7-troubleshooting--faq)

---

## 1. Prerequisites & System Requirements

### Hardware Requirements
- **CPU:** Dual-core 2.0 GHz or higher (Quad-core recommended for MediaPipe pose estimation).
- **RAM:** Minimum 4 GB (8 GB recommended when running computer vision on high-resolution video).
- **Disk:** Minimum 5 GB free disk space for uploaded videos and model weights.

### Software Dependencies
- **Docker & Docker Compose:** Version 24.0+ / Compose v2.20+ (if deploying via containers).
- **Python:** Version 3.11, 3.12, or 3.13.
- **Node.js:** Version 18.x or 20.x LTS with `npm` 9+.
- **FFMPEG:** Version 4.4+ with `libx264` codec support.

---

## 2. Method 1: Docker Compose Deployment (Recommended)

Docker Compose provides a fully containerized, production-aligned deployment consisting of three isolated services:
1. **PostgreSQL Database (`db`):** Persistent relational storage on port `5432`.
2. **FastAPI Backend (`backend`):** REST API and computer vision pipeline on port `8000`.
3. **React Vite Frontend (`frontend`):** Web client on port `3000`.

### 2.1 Architecture Topology
```
 [ Client Browser ]
         │
         ├───▶ Port 3000: Frontend Service (React / Vite / Tailwind)
         │
         └───▶ Port 8000: Backend Service (FastAPI / Uvicorn)
                                 │
                                 ├───▶ Port 5432: PostgreSQL Database
                                 │
                                 └───▶ Volume: /backend/uploads (Videos & Models)
```

### 2.2 Docker Compose Configuration (`docker-compose.yml`)

The repository root includes the pre-configured orchestration file:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: sports_injury_db
    environment:
      POSTGRES_USER: sports_user
      POSTGRES_PASSWORD: sports_password
      POSTGRES_DB: sports_injury_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sports_user -d sports_injury_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sports_injury_backend
    environment:
      DATABASE_URL: postgresql://sports_user:sports_password@db:5432/sports_injury_db
      JWT_SECRET: supersecretproductionjwtkeychangeinprod123!
    ports:
      - "8000:8000"
    volumes:
      - ./backend/uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sports_injury_frontend
    environment:
      VITE_API_URL: http://localhost:8000/api
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 2.3 Starting the Services

From the project root:

```bash
# Build and run containers in the background
docker compose up --build -d

# View real-time container logs
docker compose logs -f

# Verify running services
docker compose ps
```

### 2.4 Container Health Checks

Verify that each container is operational:
```bash
# Check PostgreSQL readiness
docker compose exec db pg_isready -U sports_user -d sports_injury_db

# Check Backend API health
curl -s http://localhost:8000/ | grep healthy

# Check Frontend HTTP status
curl -I http://localhost:3000/
```

To stop all services:
```bash
docker compose down
```

---

## 3. Method 2: Bare-Metal / Local Development Setup

When working locally without Docker, the backend automatically uses **SQLite** (`sports_injury.db`).

### 3.1 Backend Setup (FastAPI & SQLite)

```bash
# 1. Navigate to backend directory
cd /Users/thalladaakhilkumar/Sports/backend

# 2. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On macOS/Linux
# or: .venv\Scripts\activate    # On Windows

# 3. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Start the FastAPI development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Root Health:** `http://localhost:8000/`
- **Swagger Documentation:** `http://localhost:8000/docs`

### 3.2 Frontend Setup (React & Vite)

In a separate terminal:

```bash
# 1. Navigate to frontend directory
cd /Users/thalladaakhilkumar/Sports/frontend

# 2. Install Node dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

The React web client will be available at `http://localhost:5173`.

### 3.3 FFMPEG Installation & Validation

FFMPEG is required for transcoding uploaded videos to standard H.264 / `yuv420p` format.

- **macOS:**
  ```bash
  brew install ffmpeg
  ```
- **Ubuntu / Debian:**
  ```bash
  sudo apt update && sudo apt install -y ffmpeg
  ```
- **Windows:**
  Install via `winget install Gyan.FFmpeg` or download from [ffmpeg.org](https://ffmpeg.org).

Verify installation:
```bash
ffmpeg -version
```

---

## 4. Environment Variables Reference

| Variable | Description | Default (Local) | Production Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///sports_injury.db` | `postgresql://usr:pwd@host:5432/db` |
| `JWT_SECRET` | Secret key for signing tokens | Built-in fallback string | `64_char_random_hex_string` |
| `JWT_ALGORITHM` | JWT hashing algorithm | `HS256` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity duration | `1440` (24 hours) | `1440` |
| `UPLOAD_DIR` | Video storage folder path | `backend/uploads` | `/var/app/uploads` |
| `VITE_API_URL` | Frontend API target | `http://localhost:8000/api` | `https://api.yourdomain.com/api` |

---

## 5. Database Configuration & Migrations

The database layer uses SQLAlchemy 2.0. Database tables are automatically provisioned upon backend startup:

```python
# backend/app/main.py
Base.metadata.create_all(bind=engine)
```

### Resetting or Seeding the Database
To reset the local SQLite database:
```bash
# Remove database file to re-initialize on next boot
rm -f backend/sports_injury.db
# Restart backend
```

---

## 6. Production Hardening & Reverse Proxy (Nginx)

For production deployments exposed to public traffic:

1. **SSL/TLS Termination:** Terminate HTTPS at Nginx or AWS CloudFront using Let's Encrypt certificates.
2. **Reverse Proxy Configuration:**
   ```nginx
   server {
       listen 80;
       server_name sportsrisk.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name sportsrisk.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/sportsrisk/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/sportsrisk/privkey.pem;

       # Frontend static client
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       # Backend API Gateway
       location /api/ {
           proxy_pass http://localhost:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           client_max_body_size 100M;
       }

       # Static Video Uploads
       location /uploads/ {
           proxy_pass http://localhost:8000/uploads/;
           client_max_body_size 100M;
       }
   }
   ```
3. **CORS Restrictions:** In `backend/app/main.py`, restrict `allow_origins` to your production domain.

---

## 7. Troubleshooting & FAQ

### Q: "Unable to connect to backend server on http://localhost:8000"
- **Cause:** The FastAPI backend is not running or crashed.
- **Fix:** In the backend directory, run `.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` and check terminal logs for errors.

### Q: "FFMPEG not found in PATH"
- **Cause:** FFMPEG is not installed on the host machine.
- **Fix:** Install FFMPEG via Homebrew (`brew install ffmpeg`) or package manager. The backend contains an automatic fallback to OpenCV `cv2.VideoWriter` if FFMPEG is absent.

### Q: "MediaPipe import error on Apple Silicon / macOS"
- **Cause:** Some macOS Python versions require specific MediaPipe releases.
- **Fix:** Use Python 3.11 or install the modern tasks API (`pip install mediapipe`). The codebase includes fallbacks to kinematic modeling if MediaPipe native bindings are unavailable.

### Q: Video does not play in browser
- **Cause:** Video was encoded in high-profile 4:4:4 or non-standard container not supported by HTML5 `<video>`.
- **Fix:** Ensure the uploaded clip was re-encoded through the built-in FFMPEG pipeline with `-pix_fmt yuv420p` and `-vcodec libx264`.
