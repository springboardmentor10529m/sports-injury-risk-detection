# Deployment & Operations Guide

This guide provides setup, configuration, and deployment instructions for the **Sports Injury Risk Detection System**.

---

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine and `docker compose` CLI)

### 1. Clone & Configure Environment
Clone the repository and create an `.env` file:

```bash
git clone <repository-url>
cd Msme_Backend
cp .env.example .env
```

### 2. `.env` Environment Variables Reference

| Variable | Default Value | Purpose |
|---|---|---|
| `POSTGRES_USER` | `postgres` | PostgreSQL superuser username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL user password |
| `POSTGRES_DB` | `sports_injury_db` | PostgreSQL relational database name |
| `MONGO_DB_NAME` | `sports_injury_mongodb` | MongoDB database name |
| `JWT_SECRET` | `sports_injury_super_secret_jwt_key_2026_capstone` | Secret key for signing JWT tokens |
| `PORT` | `8000` | Backend FastAPI service port |

### 3. Launching Containerized Stack

Run the following command to build and launch all 4 containerized services in detached mode:

```bash
docker compose up --build -d
```

### Container Status Verification
Verify that all 4 containers are healthy and running:

```bash
docker compose ps
```

**Expected Services:**
1. `sports_injury_postgres` (PostgreSQL 16 on port `5432`)
2. `sports_injury_mongodb` (MongoDB 7.0 on port `27017`)
3. `sports_injury_backend` (FastAPI Python API on port `8000`)
4. `sports_injury_frontend` (Nginx + React SPA on port `80`)

### Service Access URLs
- **Frontend Dashboard**: `http://localhost`
- **Backend API**: `http://localhost:8000`
- **Swagger Interactive API Docs**: `http://localhost:8000/docs`
- **PostgreSQL Connection**: `localhost:5432` (`user: postgres`, `pass: postgres`)
- **MongoDB Connection**: `localhost:27017`

### Shutting Down Services
To stop and remove containers and networks:

```bash
docker compose down
```

To also delete database volume storage:

```bash
docker compose down -v
```

---

## 💻 Local Development Setup (Without Docker)

### Backend Setup (Python 3.11 + FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On Windows PowerShell:
   python -m venv venv
   .\venv\Scripts\activate

   # On Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Uvicorn development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup (Vite + React)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite local dev server:
   ```bash
   npm run dev
   ```
4. Access the Vite preview server at `http://localhost:5173`.

---

## 🔧 Production Build Verification

To verify that the frontend builds without TypeScript or bundling errors:

```bash
cd frontend
npm run build
```

This compiles optimized static assets into `frontend/dist/`.
