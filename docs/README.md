# 📚 Sports Injury Risk Detection Platform
## Comprehensive Technical Documentation Portal

---

Welcome to the end-to-end documentation suite for the **AI-Powered Sports Injury Risk Detection Platform**. This directory contains full technical specifications, user manuals, mathematical formulations, deployment configurations, and automated verification procedures.

---

## 📑 Documentation Index

| Document | Target Audience | Summary |
| :--- | :--- | :--- |
| **[1. System Architecture Specification](SYSTEM_ARCHITECTURE.md)** | Architects, Engineers | Multi-tier architectural topology, edge ingestion, AI/ML pipeline, 13 core modules catalog, and data models. |
| **[2. RESTful API Documentation](API_DOCUMENTATION.md)** | Frontend & Mobile Devs | Complete REST endpoint catalog, request/response schemas, JWT auth, status codes, and JSON payloads. |
| **[3. Biomechanics & ML Models](BIOMECHANICS_AND_ML_MODELS.md)** | ML Engineers, Scientists | BlazePose 33-landmark schema, 3D angle geometry, Knee Valgus ratio, Anomaly scoring, and 5-factor risk decomposition. |
| **[4. End-to-End User & Clinical Guide](USER_GUIDE.md)** | Athletes, Clinicians, Coaches | User manual covering all 5 personas (Athlete, Coach, Physiotherapist, Scientist, Admin), video upload guidelines, dual-player analysis, and exercise compliance. |
| **[5. Deployment & Infrastructure Guide](DEPLOYMENT_GUIDE.md)** | DevOps, SysAdmins | Docker Compose orchestration, PostgreSQL config, local development setup, FFMPEG dependencies, Nginx proxy, and troubleshooting. |
| **[6. Database Schema & ER Specification](DATABASE_SCHEMA.md)** | Database Administrators | Mermaid ER diagrams, table dictionaries, foreign key cascading rules, data integrity constraints, and UUID primary keys. |
| **[7. Automated Testing & Verification Guide](TESTING_AND_VERIFICATION.md)** | QA Engineers, Developers | Test suite catalog (`pytest`), computer vision validation, ML risk calculation tests, live HTTP network checks, and CI/CD pipelines. |

---

## 🏗 High-Level System Architecture

```
+-------------------------------------------------------------------------------+
|                                CLIENT CLIENTS                                 |
|      [ Athlete ]        [ Coach ]     [ Physiotherapist ]   [ Scientist ]     |
|   Personal Dashboard    Team Radar      Rehab Protocols     Cohort Analytics  |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                       API GATEWAY (FASTAPI FRAMEWORK)                         |
|   - JWT Token Authentication (HS256)                                          |
|   - Role-Based Access Control (RBAC)                                          |
|   - CORS Middleware & Request Validation                                      |
+-------------------------------------------------------------------------------+
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
+---------------------------------------+   +-----------------------------------+
|     VIDEO & KINEMATICS ENGINE         |   |    AI & PREDICTIVE ML ENGINE      |
|  - FFMPEG H.264/yuv420p Transcoding   |   |  - Isolation Forest (Anomaly)     |
|  - MediaPipe BlazePose (33 Points)    |   |  - Random Forest Classifier       |
|  - 3D Joint Angles & Knee Valgus      |   |  - XGBoost Gradient Boosting      |
|  - Bilateral Symmetry & Trunk Lean    |   |  - 5-Factor Risk Decomposition    |
+---------------------------------------+   +-----------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                        PERSISTENCE & STORAGE LAYER                            |
|       - PostgreSQL 15 (Docker) / SQLite 3 (Local) via SQLAlchemy 2.0          |
|       - Standardized Video Storage & Annotated Overlays (/uploads)            |
+-------------------------------------------------------------------------------+
```

---

## 🚀 Quick Links & Getting Started

- **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **Frontend Web Application:** `http://localhost:5173` (or `http://localhost:3000` via Docker)
- **Backend Health Check:** `http://localhost:8000/`
