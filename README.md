# Sports Injury Risk Detection

Backend service and frontend dashboard for user authentication, athlete profile management, video uploading, pose analysis, and injury risk detection.

---

## 📖 Complete Documentation

Detailed documentation is available in the [`docs/`](file:///c:/Users/saketh/Msme_Backend/docs) directory:

- 🗄️ [**Database Schema Specification**](file:///c:/Users/saketh/Msme_Backend/docs/DATABASE_SCHEMA.md): Complete specifications for 10 PostgreSQL tables & 2 MongoDB collections.
- 🏗️ [**System Architecture**](file:///c:/Users/saketh/Msme_Backend/docs/ARCHITECTURE.md): Architecture diagrams, AI processing pipeline, and RBAC authentication model.
- 🔌 [**API Documentation**](file:///c:/Users/saketh/Msme_Backend/docs/API_DOCUMENTATION.md): REST API endpoints, schemas, and request/response payloads.
- 🐳 [**Deployment Guide**](file:///c:/Users/saketh/Msme_Backend/docs/DEPLOYMENT_GUIDE.md): Docker Compose setup, environment configuration, and production build instructions.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.11), Uvicorn, SQLAlchemy, PyMongo, OpenCV, MediaPipe, JWT Authentication
- **Frontend**: React 19, Vite, Tailwind CSS, Chart.js, Lucide Icons
- **Databases**: PostgreSQL 16 (Relational Entities), MongoDB 7.0 (Pose Keypoints & AI Logs)
- **Containerization**: Docker, Docker Compose, Nginx Reverse Proxy

---

## 🐳 Quick Start with Docker Compose

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Msme_Backend
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Build and start all containerized services**:
   ```bash
   docker compose up --build -d
   ```

4. **Access application endpoints**:
   - **Frontend UI**: [http://localhost](http://localhost)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL Database**: `localhost:5432`
   - **MongoDB Database**: `localhost:27017`

5. **Stop services**:
   ```bash
   docker compose down
   ```

---

## 💻 Local Setup (Without Docker)

### Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the Vite dev server at `http://localhost:5173`.