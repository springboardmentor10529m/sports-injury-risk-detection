# Sports Injury Risk Detection Platform
## RESTful API Documentation & Endpoint Reference

---

### Table of Contents
1. [Overview & Base URL](#1-overview--base-url)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Standard Error Responses](#3-standard-error-responses)
4. [Module 1: Authentication Endpoints (`/api`)](#4-module-1-authentication-endpoints-api)
5. [Module 2: Athlete Profile Management (`/api`)](#5-module-2-athlete-profile-management-api)
6. [Module 3 & 4: Video Ingestion & Biomechanics Analysis (`/api`)](#6-module-3--4-video-ingestion--biomechanics-analysis-api)
7. [Module 6, 7 & 8: Injury Risk Prediction & Radar (`/api`)](#7-module-6-7--8-injury-risk-prediction--radar-api)
8. [Module 9: Corrective Exercise Recommendations (`/api`)](#8-module-9-corrective-exercise-recommendations-api)
9. [Module 11: Real-Time Notification Center (`/api`)](#9-module-11-real-time-notification-center-api)
10. [Module 12: Clinical Reporting & Data Exports (`/api`)](#10-module-12-clinical-reporting--data-exports-api)
11. [Module 13: System Administration & Telemetry (`/api`)](#11-module-13-system-administration--telemetry-api)

---

## 1. Overview & Base URL

The Sports Injury Risk Detection Platform API exposes RESTful JSON endpoints implemented via FastAPI. The backend handles video uploads, initiates MediaPipe BlazePose computer vision routines, processes kinematic equations, and delivers machine learning predictions.

- **Local Development Base URL:** `http://localhost:8000/api`
- **Docker Compose Network URL:** `http://backend:8000/api`
- **Interactive OpenAPI / Swagger UI:** `http://localhost:8000/docs`
- **Redoc UI:** `http://localhost:8000/redoc`

All endpoints that require authentication validate incoming requests via JSON Web Tokens (JWT).

---

## 2. Authentication & Authorization

Protected endpoints require the HTTP `Authorization` header containing a valid Bearer token:

```http
Authorization: Bearer <your_jwt_access_token>
```

### Supported User Roles (RBAC)
- `Athlete`: Access to personal profile, own video uploads, personal risk assessments, and assigned corrective exercises.
- `Coach`: Access to team roster, athlete profiles, team injury radar, and video analysis.
- `Physiotherapist`: Access to clinical joint metrics, ROM logs, rehabilitation tracking, and corrective drill assignments.
- `Sports Scientist`: Access to kinematic research telemetry, anomaly scores, and longitudinal cohort biometrics.
- `Admin`: Global telemetry, role updates, and user account management.

---

## 3. Standard Error Responses

The API returns standard HTTP status codes along with descriptive JSON error structures:

```json
{
  "detail": "Descriptive error message or field validation array"
}
```

| HTTP Status | Description |
| :--- | :--- |
| `200 OK` | The request was successful. |
| `201 Created` | Resource successfully created (e.g. user registered, video uploaded). |
| `400 Bad Request` | Missing required parameters, unparseable payload, or unsupported media type. |
| `401 Unauthorized` | Missing, expired, or invalid JWT Bearer token. |
| `403 Forbidden` | Authenticated user lacks required role permissions for the resource. |
| `404 Not Found` | Target record (video, athlete, user, recommendation) does not exist. |
| `422 Unprocessable Entity` | Pydantic request schema validation failed. |
| `500 Internal Server Error` | Unhandled backend exception during computer vision or ML execution. |

---

## 4. Module 1: Authentication Endpoints (`/api`)

### 4.1 Register New User
Creates an account and automatically initializes an athlete profile if registered with the `Athlete` role.

- **Endpoint:** `POST /api/register`
- **Authentication:** Public
- **Request Body (`application/json`):**
```json
{
  "name": "Marcus Rashford",
  "email": "marcus.rashford@example.com",
  "password": "SecurePassword123!",
  "role": "Athlete"
}
```
- **Response (`201 Created`):**
```json
{
  "user_id": "usr_9b1deb4d3b7d4e8",
  "name": "Marcus Rashford",
  "email": "marcus.rashford@example.com",
  "role": "Athlete",
  "created_at": "2026-09-26T20:00:00"
}
```

### 4.2 User Login
Authenticates credentials and returns a Bearer access token.

- **Endpoint:** `POST /api/login`
- **Authentication:** Public
- **Request Body (`application/json`):**
```json
{
  "email": "marcus.rashford@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "Athlete",
  "name": "Marcus Rashford",
  "user_id": "usr_9b1deb4d3b7d4e8"
}
```

### 4.3 Get Current User Session
Returns user information for the authenticated session token.

- **Endpoint:** `GET /api/me`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
{
  "user_id": "usr_9b1deb4d3b7d4e8",
  "name": "Marcus Rashford",
  "email": "marcus.rashford@example.com",
  "role": "Athlete",
  "created_at": "2026-09-26T20:00:00"
}
```

---

## 5. Module 2: Athlete Profile Management (`/api`)

### 5.1 Get Athlete Profile
Fetches current athlete's profile metrics.

- **Endpoint:** `GET /api/profile`
- **Authentication:** Bearer Token (`Athlete`)
- **Response (`200 OK`):**
```json
{
  "athlete_id": "ath_a89f72c1e40b",
  "user_id": "usr_9b1deb4d3b7d4e8",
  "age": 25,
  "gender": "Male",
  "sport": "Football",
  "position": "Forward",
  "height": 180.5,
  "weight": 76.0,
  "training_load": 7.5,
  "flexibility_score": 8.2,
  "strength_score": 8.7,
  "balance_score": 8.5,
  "coach_notes": "Minor prior ankle sprain history in 2025"
}
```

### 5.2 Update Athlete Profile
Creates or updates profile baseline metrics and athletic indicators.

- **Endpoint:** `POST /api/profile`
- **Authentication:** Bearer Token (`Athlete`)
- **Request Body (`application/json`):**
```json
{
  "age": 25,
  "gender": "Male",
  "sport": "Football",
  "position": "Forward",
  "height": 180.5,
  "weight": 76.0,
  "training_load": 8.0,
  "flexibility_score": 8.5,
  "strength_score": 8.8,
  "balance_score": 8.4,
  "coach_notes": "Full recovery from ankle sprain; focused on ACL prevention drills."
}
```
- **Response (`200 OK`):** Returns updated athlete profile schema.

### 5.3 List All Athletes (Staff Directory)
Retrieves detailed profiles and latest injury risk summary for all athletes.

- **Endpoint:** `GET /api/list`
- **Authentication:** Bearer Token (`Coach`, `Physiotherapist`, `Sports Scientist`, `Admin`)
- **Response (`200 OK`):**
```json
[
  {
    "athlete_id": "ath_a89f72c1e40b",
    "name": "Marcus Rashford",
    "sport": "Football",
    "position": "Forward",
    "training_load": 8.0,
    "balance_score": 8.4,
    "coach_notes": "Full recovery from ankle sprain",
    "overall_risk_score": 45.2,
    "risk_category": "Moderate",
    "last_analyzed": "2026-09-26T20:30:00"
  }
]
```

### 5.4 Update Clinical Coach Notes
Appends or overrides clinical observation notes for a specific athlete.

- **Endpoint:** `PUT /api/{athlete_id}/notes`
- **Authentication:** Bearer Token (`Coach`, `Physiotherapist`, `Admin`)
- **Request Body (`application/json`):**
```json
{
  "notes": "Showing reduced valgus collapse during single-leg landing test."
}
```

---

## 6. Module 3 & 4: Video Ingestion & Biomechanics Analysis (`/api`)

### 6.1 Upload & Trigger Processing Pipeline
Uploads an athletic movement clip (`.mp4`, `.mov`, `.avi`), re-encodes to browser-compatible H.264/yuv420p via FFMPEG, executes MediaPipe BlazePose landmark extraction, extracts joint kinematics, and generates ML risk forecasts.

- **Endpoint:** `POST /api/upload`
- **Authentication:** Bearer Token
- **Request Format:** `multipart/form-data`
  - `file`: Binary video file
  - `activity`: String (e.g. `Squatting`, `Landing`, `Cutting`, `Running`, `Jumping`)
  - `athlete_id`: String (optional; defaults to authenticated athlete)
- **Response (`200 OK`):**
```json
{
  "video_id": "vid_6e5b2938a102",
  "athlete_id": "ath_a89f72c1e40b",
  "filename": "vid_6e5b2938a102_cut.mp4",
  "activity": "Landing",
  "upload_date": "2026-09-26T20:35:10",
  "status": "Completed",
  "original_url": "/uploads/vid_6e5b2938a102_cut.mp4",
  "annotated_url": "/uploads/vid_6e5b2938a102_cut_annotated.mp4"
}
```

### 6.2 List Uploaded Videos
Lists all uploaded movement clips for the authenticated user or organization.

- **Endpoint:** `GET /api/list`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** List of video metadata objects.

### 6.3 Get Biomechanical Kinematics Analysis
Retrieves the extracted 33-landmark skeletal measurements, joint angles, and stability ratings for a processed video.

- **Endpoint:** `GET /api/{video_id}/analysis`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
{
  "analysis_id": "ana_4f1092a4",
  "video_id": "vid_6e5b2938a102",
  "knee_valgus_detected": "Yes",
  "valgus_angle": 16.8,
  "trunk_lean": 22.4,
  "lateral_hip_sway": 4.2,
  "balance_score": 6.8,
  "symmetry_score": 84.5,
  "range_of_motion": "{\"left_knee_rom\": 88.4, \"right_knee_rom\": 74.2, \"left_hip_rom\": 82.1, \"right_hip_rom\": 78.5}",
  "skeleton_json_path": "/uploads/vid_6e5b2938a102_cut_skeleton.json",
  "created_at": "2026-09-26T20:35:15"
}
```

---

## 7. Module 6, 7 & 8: Injury Risk Prediction & Radar (`/api`)

### 7.1 Get Video Injury Prediction
Returns the ML model prediction and 5-factor risk decomposition breakdown for a specific video.

- **Endpoint:** `GET /api/prediction/video/{video_id}`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
{
  "prediction_id": "pred_77d291ba",
  "athlete_id": "ath_a89f72c1e40b",
  "video_id": "vid_6e5b2938a102",
  "acl_risk_prob": 72.8,
  "hamstring_risk_prob": 41.5,
  "ankle_risk_prob": 54.0,
  "shoulder_risk_prob": 12.0,
  "back_risk_prob": 62.4,
  "overall_risk_score": 68.4,
  "risk_category": "High",
  "anomaly_score": 0.42,
  "rf_risk_prob": 70.2,
  "xgb_risk_prob": 67.8,
  "factor_kinematics": 26.6,
  "factor_load": 17.4,
  "factor_asymmetry": 19.4,
  "factor_velocity": 8.0,
  "factor_prior_injury": 7.0,
  "created_at": "2026-09-26T20:35:16"
}
```

### 7.2 Get Athlete Prediction History
Returns longitudinal prediction assessments for an individual athlete over time.

- **Endpoint:** `GET /api/predictions/athlete/{athlete_id}`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** Array of `InjuryPredictionResponse` items.

### 7.3 Get Team Risk Radar
Returns latest assessment risk profiles across all athletes for coach overview.

- **Endpoint:** `GET /api/predictions/team`
- **Authentication:** Bearer Token (`Coach`, `Physiotherapist`, `Sports Scientist`, `Admin`)
- **Response (`200 OK`):** Array of latest team assessments.

---

## 8. Module 9: Corrective Exercise Recommendations (`/api`)

### 8.1 Exercise Template Library
Fetches the clinical library of pre-configured corrective exercises categorized by domain.

- **Endpoint:** `GET /api/library`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
[
  {
    "name": "Banded Clamshells",
    "category": "Strengthening",
    "target_area": "Gluteus Medius / Hip Abductors",
    "description": "Strengthens hip external rotators to stabilize knee tracking and arrest medial valgus collapse.",
    "dosage": "3 sets x 15 reps per side",
    "video_guide_url": "https://example.com/drills/clamshells"
  }
]
```

### 8.2 Get Prescribed Recommendations
Retrieves assigned corrective protocols for an athlete.

- **Endpoint:** `GET /api/athlete/{athlete_id}`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
[
  {
    "recommendation_id": "rec_33a8b2",
    "athlete_id": "ath_a89f72c1e40b",
    "exercise_name": "Banded Terminal Knee Extensions (TKE)",
    "category": "Strengthening",
    "sets": 3,
    "reps": 15,
    "frequency_per_week": 4,
    "completed": false,
    "notes": "Targeting VMO to reduce left knee landing valgus."
  }
]
```

### 8.3 Auto-Generate Recommendations
Triggers the clinical recommendation engine to synthesize new exercises tailored to detected biomechanical deviations and risk scores.

- **Endpoint:** `POST /api/athlete/{athlete_id}/generate`
- **Authentication:** Bearer Token (`Coach`, `Physiotherapist`, `Admin`)
- **Response (`200 OK`):** Array of newly generated corrective recommendations.

### 8.4 Toggle Exercise Completion
Marks an assigned corrective drill as completed or pending.

- **Endpoint:** `PUT /api/{recommendation_id}/toggle`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** Updated recommendation object with toggled `completed` boolean.

---

## 9. Module 11: Real-Time Notification Center (`/api`)

### 9.1 Get User Notifications
Fetches the alert feed for the authenticated user, prioritized by urgency.

- **Endpoint:** `GET /api`
- **Authentication:** Bearer Token
- **Response (`200 OK`):**
```json
[
  {
    "notification_id": "notif_91823a",
    "user_id": "usr_9b1deb4d3b7d4e8",
    "title": "High ACL Risk Detected",
    "message": "Movement analysis on video #vid_6e5b2938a102 flagged Knee Valgus of 16.8° with High risk score (68.4%).",
    "severity": "Warning",
    "is_read": false,
    "created_at": "2026-09-26T20:35:17"
  }
]
```

### 9.2 Mark Notification as Read
- **Endpoint:** `PUT /api/{notification_id}/read`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** Updated notification record.

### 9.3 Mark All as Read
- **Endpoint:** `PUT /api/read-all`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** `{"status": "success", "marked_read": 5}`

---

## 10. Module 12: Clinical Reporting & Data Exports (`/api`)

### 10.1 Athlete Clinical Summary
Aggregates profile metrics, latest video kinematics, risk scores, and active corrective prescriptions into a clinical overview.

- **Endpoint:** `GET /api/athlete/{athlete_id}/summary`
- **Authentication:** Bearer Token

### 10.2 Export Longitudinal Athlete Data (CSV)
Streams a downloadable CSV formatted for clinical audit and longitudinal assessment.

- **Endpoint:** `GET /api/athlete/{athlete_id}/export/csv`
- **Authentication:** Bearer Token
- **Response (`200 OK`):** `text/csv` attachment.

### 10.3 Export Team Risk Matrix (CSV)
Streams team-wide injury probability and compliance data for organizational review.

- **Endpoint:** `GET /api/team/export/csv`
- **Authentication:** Bearer Token (`Coach`, `Physiotherapist`, `Sports Scientist`, `Admin`)
- **Response (`200 OK`):** `text/csv` attachment.

### 10.4 Longitudinal Research Biometrics (JSON)
Provides raw kinematic metrics and anomaly scores across historical cohorts for sports science analysis.

- **Endpoint:** `GET /api/biometrics/research`
- **Authentication:** Bearer Token (`Sports Scientist`, `Admin`)
- **Response (`200 OK`):** Deep JSON research dataset.

---

## 11. Module 13: System Administration & Telemetry (`/api`)

### 11.1 List All Users
- **Endpoint:** `GET /api/users`
- **Authentication:** Bearer Token (`Admin`)
- **Response (`200 OK`):** Array of all registered user records.

### 11.2 Modify User Role
- **Endpoint:** `PUT /api/users/{user_id}/role`
- **Authentication:** Bearer Token (`Admin`)
- **Request Body (`application/json`):**
```json
{
  "role": "Physiotherapist"
}
```

### 11.3 System Telemetry & Operational Metrics
- **Endpoint:** `GET /api/metrics`
- **Authentication:** Bearer Token (`Admin`)
- **Response (`200 OK`):**
```json
{
  "total_users": 18,
  "total_athletes": 12,
  "total_videos_analyzed": 46,
  "total_high_risk_flags": 9,
  "db_status": "Healthy",
  "active_pose_backend": "MediaPipe BlazePose",
  "ffmpeg_available": true
}
```
