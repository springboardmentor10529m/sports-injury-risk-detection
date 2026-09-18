# Sports Injury Risk Detection from Video
## End-to-End System Architecture Specification

---

### Table of Contents
1. [Executive Summary & Objectives](#1-executive-summary--objectives)
2. [High-Level System Architecture Diagram](#2-high-level-system-architecture-diagram)
3. [Multi-Tier Architectural Layers](#3-multi-tier-architectural-layers)
   - [Tier 1: Users, Roles & Client Applications](#tier-1-users-roles--client-applications)
   - [Tier 2: Edge & Video Ingestion Layer](#tier-2-edge--video-ingestion-layer)
   - [Tier 3: API Gateway & Security](#tier-3-api-gateway--security)
   - [Tier 4: Microservices & Core Domain Engines](#tier-4-microservices--core-domain-engines)
   - [Tier 5: AI / ML & Biomechanics Intelligence Layer](#tier-5-ai--ml--biomechanics-intelligence-layer)
   - [Tier 6: Multi-Model Data Layer](#tier-6-multi-model-data-layer)
   - [Tier 7: External Integrations, Security & Observability](#tier-7-external-integrations-security--observability)
4. [Mathematical Scoring & Anomaly Model Formulation](#4-mathematical-scoring--anomaly-model-formulation)
5. [Complete Catalog of 13 Functional Modules](#5-complete-catalog-of-13-functional-modules)
6. [API Route Specifications](#6-api-route-specifications)
7. [Database Schemas & Data Model](#7-database-schemas--data-model)
8. [Milestones & Implementation Roadmap](#8-milestones--implementation-roadmap)
9. [Deployment & Containerization Topology](#9-deployment--containerization-topology)

---

## 1. Executive Summary & Objectives

The **AI-Powered Sports Injury Risk Detection Platform** is an enterprise-grade biomechanical intelligence and movement analysis solution. It processes athlete video recordings to track skeletal kinematics, calculate joint angles, evaluate lateral balance stability, detect abnormal movement patterns (such as medial knee collapse and forward trunk lean), and forecast personalized injury risks before injuries occur.

### Key Outcomes
- Real-time and asynchronous 33-point skeletal landmark tracking using **MediaPipe Pose (BlazePose)**.
- Biomechanical joint Range of Motion (ROM) extraction and bilateral symmetry evaluation.
- Anomaly detection comparing kinematic trajectories against standard reference baselines (**SportsPose** and **Human3.6M**).
- Supervised prediction of specific injury probabilities (ACL Tear, Hamstring Strain, Ankle Sprain, Shoulder Impingement, Lower Back Strain).
- Composite weighted risk scoring ($1.0 - 10.0$) mapping to **Low**, **Moderate**, **High**, or **Critical** risk bands.
- Automated corrective exercise prescription (Mobility, Strengthening, Recovery, and Technique drills).
- Role-tailored experiences for **Athletes**, **Coaches**, **Physiotherapists**, **Sports Scientists**, and **Administrators**.

---

## 2. High-Level System Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    USERS & CLIENT APPLICATIONS                                     |
|  [ Athlete ]        [ Coach ]        [ Physiotherapist ]      [ Sports Scientist ]     [ Admin ]    |
|   Web App / PWA      Team Radar       Rehab & Recovery        Cohort Analytics         Platform Ops |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    EDGE / LOCAL INGESTION LAYER                                    |
|   - Video Preprocessing & Format Validation (MP4, MOV, AVI)                                        |
|   - Frame Extraction & Normalization                                                               |
|   - FFMPEG H.264 / yuv420p Standardized Re-encoding for Universal Browser Playback                 |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                   API GATEWAY (FASTAPI FRAMEWORK)                                  |
|   - Routing & Reverse Proxy               - Rate Limiting & Throttling                             |
|   - JWT Authentication & OAuth2           - CORS & Request Validation                              |
|   - Role-Based Access Control (RBAC)      - Structured Telemetry & Audit Logging                   |
+----------------------------------------------------------------------------------------------------+
                                                  |
        +-----------------------------------------+-----------------------------------------+
        |                                                                                   |
        v                                                                                   v
+-----------------------------------+                             +-----------------------------------+
|       MICROSERVICES LAYER         |                             |     AI / ML INTELLIGENCE LAYER    |
| 1. User & Athlete Management      |                             | 1. Computer Vision (MediaPipe)    |
| 2. Video Management Service       |                             | 2. Biomechanical Angle Solvers    |
| 3. Video Processing Service       |                             | 3. Anomaly Detector (Iso Forest)  |
| 4. Pose Estimation Service        |<--------------------------->| 4. Injury Classifiers (RF/XGB)    |
| 5. Biomechanical Analysis Service |                             | 5. Weighted Risk Scoring Engine   |
| 6. Movement Quality Service       |                             | 6. Baselines: SportsPose/Human3.6M|
| 7. Injury Risk Prediction Service |                             +-----------------------------------+
| 8. Corrective Recommendation Svc  |                                               |
| 9. Notification & Alert Service   |                                               v
| 10. Reports & Export Service      |                             +-----------------------------------+
| 11. Admin & Telemetry Service     |                             |       EXTERNAL INTEGRATIONS       |
+-----------------------------------+                             | - Cloud Storage (AWS S3 / Azure)  |
        |                                                         | - Wearable Devices (Garmin/WHOOP) |
        v                                                         | - Notifications (SMS / Email)     |
+---------------------------------------------------------------+ | - BI Tools (Tableau / Power BI)   |
|                     MULTI-MODEL DATA LAYER                    | +-----------------------------------+
|  [ PostgreSQL ] Relational DB: Users, Athletes, Predictions   |
|  [ MongoDB / JSON ] Document Store: Video Annotations, Metadata|
|  [ Object Storage ] AWS S3 / Blob: Raw & Annotated Videos     |
|  [ TimescaleDB ] Time-Series: Joint Trajectories & Angles     |
|  [ Redis ] Cache & Background Asynchronous Queue              |
|  [ Vector DB ] Milvus / FAISS: Movement Similarity Embeddings |
+---------------------------------------------------------------+
```

---

## 3. Multi-Tier Architectural Layers

### Tier 1: Users, Roles & Client Applications
The presentation tier provides specialized, responsive dashboards tailored to 5 user roles:
1. **Athlete:** Profile management, video recording submission, form inspection with skeleton overlays, personal injury risk gauge, and corrective drill checklist.
2. **Coach:** Squad-level injury risk radar, athlete roster cards filtered by risk category, video reviews, and coach notes.
3. **Physiotherapist:** Rehabilitation tracking, recovery logs, and movement correction analytics.
4. **Sports Scientist:** Cohort biomechanics intelligence, comparison against SportsPose and Human3.6M reference standards, and research data export.
5. **Administrator:** System metrics, pipeline throughput, user management, and dynamic role reassignment.

### Tier 2: Edge & Video Ingestion Layer
- Validates container formats (`.mp4`, `.mov`, `.avi`, `.mkv`).
- Normalizes framerates (24-60 FPS) and spatial resolutions.
- Re-encodes videos via FFMPEG using H.264 codec and `yuv420p` pixel format to ensure zero-transcode browser streaming.

### Tier 3: API Gateway & Security
- Developed using **FastAPI** with asynchronous request handling.
- Stateless authentication using **JSON Web Tokens (JWT)** with HMAC-SHA256 signature and configurable expiration.
- Password hashing using **bcrypt** with work factor 12.
- Granular Role-Based Access Control (RBAC) dependency injection per endpoint.

### Tier 4: Microservices & Core Domain Engines
Divided into 13 decoupled domain services communicating via unified relational schemas and REST APIs.

### Tier 5: AI / ML & Biomechanics Intelligence Layer
- **MediaPipe Pose (BlazePose):** Frame-by-frame 33-point skeletal landmark detection with confidence scores.
- **Biomechanical Vector Kinematics:** Computes 3D joint angles using dot products of unit limb vectors:
  $$\theta = \arccos\left(\frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}\right)$$
- **Knee Valgus Medial Displacement:** Computes the horizontal deviation of the knee joint relative to the line connecting the hip and ankle during maximum knee flexion.
- **Trunk Lean:** Measures the angular deviation of the mid-hip to mid-shoulder line relative to the vertical gravity vector.
- **Isolation Forest Anomaly Detection:** Compares extracted ROM against SportsPose reference distributions to derive an anomaly score ($0.0 - 1.0$).
- **Multi-Class Supervised Estimators:** Predicts individual injury probabilities for ACL, hamstring, ankle, shoulder, and back injuries.

### Tier 6: Multi-Model Data Layer
- **PostgreSQL:** ACID relational store for users, athlete profiles, analysis records, predictions, notifications, and recommendations.
- **Object Storage (AWS S3 / Local Disk):** High-durability storage for raw video uploads and annotated video streams.
- **Redis:** Background task management, session caching, and rate limiting.

---

## 4. Mathematical Scoring & Anomaly Model Formulation

### Weighted Injury Risk Scoring Formula
The overall injury risk score is calculated on a scale of $1.0$ to $10.0$ using the weighted formulation from the project specification:

$$\text{Injury Risk Score} = 0.35 \times D_{\text{biomech}} + 0.20 \times F_{\text{history}} + 0.20 \times A_{\text{symmetry}} + 0.15 \times L_{\text{training}} + 0.10 \times I_{\text{fatigue}}$$

Where:
- $D_{\text{biomech}}$: Biomechanical Deviations score ($1.0 - 10.0$) derived from the Anomaly Index and Knee Valgus severity.
- $F_{\text{history}}$: Historical Injury Factor ($1.0 - 10.0$) parsed from clinical injury records and prior tears/sprains.
- $A_{\text{symmetry}}$: Movement Asymmetry penalty ($0.0 - 10.0$) calculated as:
  $$A_{\text{symmetry}} = (100 - \text{Symmetry Score}) \times 0.20$$
- $L_{\text{training}}$: Training load indicator scaled from weekly hours logged.
- $I_{\text{fatigue}}$: Fatigue index accounting for training frequency and recovery deficits.

### Risk Category Classification
| Score Range | Category | Action Protocol |
| :--- | :--- | :--- |
| **1.0 – 3.9** | **Low Risk** | Standard athletic progression, maintain load. |
| **4.0 – 5.9** | **Moderate Risk** | Prescribe corrective mobility and strengthening drills. |
| **6.0 – 7.9** | **High Risk** | Modify training volume, conduct clinical review. |
| **8.0 – 10.0** | **Critical Risk** | Immediate cessation of high-load drills, medical evaluation. |

---

## 5. Complete Catalog of 13 Functional Modules

1. **User Authentication & Role-Based Access:** Registration, login, JWT token issuance, and RBAC across 5 roles.
2. **Athlete Profile Management:** Demographic profiling, sport specialization, position, physical metrics, and coach notes.
3. **Video Upload & Processing Engine:** Multipart upload, format validation, frame extraction, and standardized re-encoding.
4. **Pose Estimation Engine:** 33 BlazePose landmark extraction, joint coordinates, and skeleton video rendering.
5. **Biomechanical Analysis Engine:** Joint flexion/extension ROM, knee valgus detection, trunk forward tilt, and bilateral symmetry.
6. **Injury Risk Prediction Engine:** Forecasts probability percentages for ACL, hamstring, ankle, shoulder, and back injuries.
7. **Movement Anomaly Detection Engine:** Isolation Forest anomaly scoring calibrated against SportsPose and Human3.6M reference datasets.
8. **Risk Scoring Engine:** Multi-factor weighted composite scoring model with risk category categorization.
9. **Corrective Recommendation Engine:** Dynamic exercise prescription database (Mobility, Strengthening, Recovery, Technique).
10. **Role-Tailored Dashboards & Analytics:** Dedicated dashboards for Athlete, Coach, Physiotherapist, Sports Scientist, and Admin.
11. **Notification & Alert System:** Automated dispatch of high-risk movement alerts, training volume warnings, and recovery reminders.
12. **Reports & Export System:** Longitudinal athlete assessment CSV export, team injury risk matrix CSV, and sports science cohort analytics.
13. **Docker & Cloud Deployment:** Production containerization with Docker Compose, Nginx reverse proxy, and environment parity.

---

## 6. API Route Specifications

| Method | Endpoint | Authorized Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account with role |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT bearer token |
| `GET` | `/api/athlete/profile` | Athlete | Get current athlete biometrics profile |
| `POST` | `/api/athlete/profile` | Athlete | Create or update athlete biometrics profile |
| `GET` | `/api/athlete/list` | Coach, Physio, Scientist, Admin | List all registered athletes |
| `GET` | `/api/athlete/{athlete_id}/videos` | Coach, Physio, Scientist, Admin | List videos for specific athlete |
| `PUT` | `/api/athlete/{athlete_id}/notes` | Coach, Physio, Scientist, Admin | Update notes/observations for an athlete |
| `POST` | `/api/video/upload` | Athlete | Upload MP4 video & trigger background pose estimation |
| `GET` | `/api/video/list` | Athlete | List uploaded videos for authenticated athlete |
| `GET` | `/api/video/{video_id}/analysis` | Athlete, Coach, Physio, Scientist, Admin | Get joint angles, ROM, valgus, and feedback |
| `GET` | `/api/injury/prediction/video/{video_id}` | Athlete, Coach, Physio, Scientist, Admin | Get predicted injury probabilities for a video |
| `GET` | `/api/injury/predictions/athlete/{athlete_id}`| Athlete, Coach, Physio, Scientist, Admin | Get longitudinal prediction history for athlete |
| `GET` | `/api/injury/predictions/team` | Coach, Physio, Scientist, Admin | Get latest risk prediction across all athletes |
| `GET` | `/api/recommendations/library` | All Authenticated | Get full sports medicine corrective exercise database |
| `GET` | `/api/recommendations/athlete/{athlete_id}` | Athlete, Coach, Physio, Scientist, Admin | Get assigned corrective drills for athlete |
| `POST`| `/api/recommendations/athlete/{athlete_id}/generate`| Athlete, Coach, Physio, Scientist, Admin | Generate drills based on latest form analysis |
| `PUT` | `/api/recommendations/{rec_id}/toggle` | Athlete, Physio, Coach, Admin | Toggle drill completion status |
| `GET` | `/api/notifications` | All Authenticated | Fetch notifications for logged-in user |
| `PUT` | `/api/notifications/{notif_id}/read` | All Authenticated | Mark notification as read |
| `PUT` | `/api/notifications/read-all` | All Authenticated | Mark all notifications as read |
| `POST`| `/api/notifications/send` | Coach, Physio, Scientist, Admin | Dispatch custom alert to user |
| `GET` | `/api/reports/athlete/{athlete_id}/summary`| Athlete, Coach, Physio, Scientist, Admin | Comprehensive clinical biomechanics report |
| `GET` | `/api/reports/athlete/{athlete_id}/export/csv`| Athlete, Coach, Physio, Scientist, Admin | Download athlete longitudinal assessments CSV |
| `GET` | `/api/reports/team/export/csv` | Coach, Physio, Scientist, Admin | Download team injury risk matrix CSV |
| `GET` | `/api/reports/biometrics/research` | Sports Scientist, Coach, Physio, Admin | Aggregated cohort metrics vs SportsPose/Human3.6M |
| `GET` | `/api/admin/users` | Admin | List all registered users |
| `PUT` | `/api/admin/users/{user_id}/role` | Admin | Reassign user role |
| `GET` | `/api/admin/metrics` | Admin, Sports Scientist | System throughput and platform telemetry |

---

## 7. Database Schemas & Data Model

```
       +-----------------------+
       |         users         |
       +-----------------------+
       | user_id (PK, UUID)    |
       | name (VARCHAR)        |
       | email (VARCHAR, UNIQUE|
       | password (TEXT, HASH) |
       | role (VARCHAR)        |----+
       | created_at (DATETIME) |    |
       +-----------------------+    |
                   | 1              | 1
                   |                |
                   v 1              v N
       +-----------------------+ +-------------------------+
       |       athletes        | |      notifications      |
       +-----------------------+ +-------------------------+
       | athlete_id (PK, UUID) | | notification_id (PK)    |
       | user_id (FK, UNIQUE)  | | user_id (FK)            |
       | sport (VARCHAR)       | | title, message          |
       | age, height, weight   | | type, severity, is_read |
       | training_load (FLOAT) | +-------------------------+
       | coach_notes (TEXT)    |
       +-----------------------+
          | 1             | 1
          |               +-----------------------+
          v N                                     v N
+-------------------------+             +-------------------------+
|         videos          |             | corrective_recs         |
+-------------------------+             +-------------------------+
| video_id (PK, UUID)     |             | recommendation_id (PK)  |
| athlete_id (FK)         |             | athlete_id (FK)         |
| activity (VARCHAR)      |             | video_id (FK, NULLABLE) |
| video_url (TEXT)        |             | target_injury_risk      |
| processing_status       |             | title, category, dosage |
+-------------------------+             | completed (BOOLEAN)     |
    | 1             | 1                 +-------------------------+
    v 1             v 1
+---------------------------+   +---------------------------+
|   biomechanics_analyses   |   |    injury_predictions     |
+---------------------------+   +---------------------------+
| analysis_id (PK, UUID)    |   | prediction_id (PK, UUID)  |
| video_id (FK, UNIQUE)     |   | video_id (FK, UNIQUE)     |
| joint_angles (JSON)       |   | acl_risk_prob (FLOAT)     |
| range_of_motion (JSON)    |   | hamstring_risk_prob (FLT) |
| symmetry_score (FLOAT)    |   | ankle_risk_prob (FLOAT)   |
| trunk_lean (FLOAT)        |   | shoulder_risk_prob (FLOAT)|
| knee_valgus_detected      |   | back_risk_prob (FLOAT)    |
| balance_score (FLOAT)     |   | overall_risk_score (FLOAT)|
| movement_quality_score    |   | risk_category (VARCHAR)   |
| annotated_video_url       |   | anomaly_score (FLOAT)     |
+---------------------------+   +---------------------------+
```

---

## 8. Milestones & Implementation Roadmap

- **Milestone 1 (Weeks 1-2):** Project initialization, database schemas, authentication, athlete profiling, reference dataset collection.
- **Milestone 2 (Weeks 3-4):** Pose estimation engine, 33-keypoint tracking, joint angle formulations, ROM analysis, knee valgus detection.
- **Milestone 3 (Weeks 5-6):** Anomaly detection, multi-factor injury probability modeling, weighted scoring, corrective recommendation engine.
- **Milestone 4 (Weeks 7-8):** Role-tailored dashboards (Athlete, Coach, Physio, Scientist, Admin), export & report generators, notification alerts, Dockerization, and cloud deployment.

---

## 9. Deployment & Containerization Topology

The platform is designed to be deployed using Docker and Docker Compose, with cloud compatibility for AWS (ECS, S3, RDS) and Azure (Container Apps, Blob Storage, Azure Database for PostgreSQL).

```
+-------------------------------------------------------------+
|                     DOCKER HOST ENVIRONMENT                 |
|                                                             |
|  +------------------+                    +---------------+  |
|  |  sports_frontend | (Port 3000 -> 80)  |  PostgreSQL   |  |
|  |  Nginx + React   |                    |  Port 5432    |  |
|  +------------------+                    +---------------+  |
|           |                                      ^          |
|           | (Proxy: /api -> :8000)               |          |
|           v                                      |          |
|  +-----------------------------------------------+-------+  |
|  |                sports_backend (Port 8000)             |  |
|  |  FastAPI + OpenCV + MediaPipe + FFMPEG + SQLAlchemy   |  |
|  +-------------------------------------------------------+  |
|           |                                                 |
|           v                                                 |
|  +-------------------------------------------------------+  |
|  |              Persistent Volumes & Uploads             |  |
|  |  - /app/uploads (Raw & Annotated Videos)              |  |
|  |  - postgres_data (Relational Database)                |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```
