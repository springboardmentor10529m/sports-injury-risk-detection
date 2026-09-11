# REST API Reference Documentation

The **Sports Injury Risk Detection API** is built with FastAPI and strictly follows RESTful principles. Interactive Swagger UI documentation is available locally at `http://localhost:8000/docs` or `http://localhost/api/docs`.

---

## 🔑 Authentication Endpoints (`/auth`)

### 1. Register User
- **Endpoint**: `POST /auth/register`
- **Request Body**:
```json
{
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "password": "Password123!",
  "role": "athlete",
  "phone": "+1-555-0192"
}
```
- **Success Response** (`201 Created`):
```json
{
  "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "role": "athlete",
  "created_at": "2026-01-15T08:30:00Z"
}
```

### 2. User Login
- **Endpoint**: `POST /auth/login`
- **Request Body**:
```json
{
  "email": "marcus.vance@athletes.org",
  "password": "Password123!"
}
```
- **Success Response** (`200 OK`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
    "name": "Marcus Vance",
    "email": "marcus.vance@athletes.org",
    "role": "athlete"
  }
}
```

### 3. Get Current User Profile
- **Endpoint**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "role": "athlete",
  "phone": "+1-555-0192"
}
```

---

## 👟 Athlete Endpoints (`/athletes`)

### 1. List All Athletes
- **Endpoint**: `GET /athletes/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "athlete_id": "ath_101",
    "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
    "name": "Marcus Vance",
    "sport": "Basketball",
    "position": "Point Guard",
    "age": 23,
    "height_cm": 188,
    "weight_kg": 84,
    "flexibility": 68.0,
    "strength": 88.5,
    "balance": 72.0,
    "endurance": 91.0
  }
]
```

### 2. Create Athlete Profile
- **Endpoint**: `POST /athletes/`
- **Request Body**:
```json
{
  "sport": "Soccer",
  "position": "Midfielder",
  "age": 21,
  "height_cm": 170.0,
  "weight_kg": 62.0,
  "flexibility": 85.0,
  "strength": 76.0,
  "balance": 89.0,
  "endurance": 94.5,
  "coach_notes": "Recovering from left hamstring tightness."
}
```

---

## 🎥 Video & AI Pipeline Endpoints (`/videos`)

### 1. Upload Video Clip
- **Endpoint**: `POST /videos/upload`
- **Headers**: `Authorization: Bearer <access_token>`
- **Form Parameters**:
  - `file`: MP4 / MOV video binary file
  - `athlete_id`: UUID
  - `activity`: e.g. "Single Leg Jump", "Cutting Drill"
- **Success Response** (`202 Accepted`):
```json
{
  "video_id": "vid_401",
  "processing_status": "processing",
  "message": "Video uploaded successfully. Biomechanical pose extraction queued."
}
```

### 2. Get Video Details & Processing Status
- **Endpoint**: `GET /videos/{video_id}`
- **Response** (`200 OK`):
```json
{
  "video_id": "vid_401",
  "athlete_id": "ath_101",
  "activity": "Single Leg Jump & Land",
  "fps": 60,
  "resolution": "1920x1080",
  "quality_score": 0.94,
  "processing_status": "done"
}
```

### 3. Get Biomechanical Analysis Results
- **Endpoint**: `GET /videos/{video_id}/analysis`
- **Response** (`200 OK`):
```json
{
  "analysis_id": "anl_501",
  "video_id": "vid_401",
  "knee_valgus": 14.8,
  "hip_stability": 62.5,
  "trunk_lean": 12.4,
  "symmetry_score": 0.76,
  "overall_risk_score": 78.5,
  "risk_level": "high"
}
```

### 4. Get ML Injury Predictions
- **Endpoint**: `GET /videos/{video_id}/predictions`
- **Response** (`200 OK`):
```json
{
  "prediction_id": "prd_601",
  "analysis_id": "anl_501",
  "acl_risk": 0.82,
  "hamstring_risk": 0.45,
  "ankle_risk": 0.61,
  "shoulder_risk": 0.12,
  "lower_back_risk": 0.38,
  "overuse_risk": 0.70
}
```

### 5. Get AI Recommendations
- **Endpoint**: `GET /videos/{video_id}/recommendations`
- **Response** (`200 OK`):
```json
{
  "recommendation_id": "rec_701",
  "prediction_id": "prd_601",
  "exercise": "Single-leg Romanian Deadlifts, Banded Clamshells, Drop Jump Landings with soft knees.",
  "mobility": "Dynamic hip flexor opening & ankle dorsiflexion mobility 3x daily.",
  "strengthening": "Gluteus medius activation (3 sets x 15 reps), Hamstring eccentric Nordics.",
  "recovery": "Cryotherapy after court sessions. Soft tissue release of vastus lateralis.",
  "training_modification": "Reduce vertical jump volume by 30% for 14 days."
}
```

---

## 🛠️ Common Error HTTP Codes

| Status Code | Description | Solution |
|---|---|---|
| `400 Bad Request` | Missing required parameters or invalid formatting | Check request body fields against schema |
| `401 Unauthorized` | Invalid or expired JWT Bearer token | Re-authenticate via `/auth/login` |
| `403 Forbidden` | Insufficient role permissions | Switch role or contact administrator |
| `404 Not Found` | Requested entity (athlete/video/report) does not exist | Verify UUID primary keys |
| `500 Internal Error` | Unexpected processing failure | Inspect MongoDB `ai_logs` collection |

---

## 🏃 Pose Analysis & Biomechanics Endpoints (`/api/analysis`)

### 1. Queue Pose & Movement Analysis
- **Endpoint**: `POST /api/analysis/videos/{video_id}/analyse`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`202 Accepted`):
```json
{
  "analysis_id": "anl_job_991823",
  "status": "queued",
  "message": "Pose analysis job queued successfully."
}
```

### 2. Poll Job Status
- **Endpoint**: `GET /api/analysis/{analysis_id}/status`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "analysis_id": "anl_job_991823",
  "video_id": "vid_401",
  "status": "biomechanics",
  "stage": "Calculating biomechanics",
  "progress": 72.5
}
```

### 3. Fetch 17-Keypoint Frame Sequence
- **Endpoint**: `GET /api/analysis/{analysis_id}/keypoints`
- **Headers**: `Authorization: Bearer <access_token>`

### 4. Fetch Joint Angles & Biomechanics Frame Sequence
- **Endpoint**: `GET /api/analysis/{analysis_id}/biomechanics`
- **Headers**: `Authorization: Bearer <access_token>`

### 5. Fetch Skeleton Video Stream
- **Endpoint**: `GET /api/analysis/{analysis_id}/skeleton-video`
- **Headers**: `Authorization: Bearer <access_token>`

### 6. Download Keypoints (JSON / CSV)
- **Endpoint**: `GET /api/analysis/{analysis_id}/download/keypoints?format=json` (or `csv`)

### 7. Download Biomechanics CSV
- **Endpoint**: `GET /api/analysis/{analysis_id}/download/biomechanics`

### 8. Fetch Weighted Risk Breakdown
- **Endpoint**: `GET /api/analysis/{analysis_id}/risk`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "analysis_id": "anl_job_991823",
  "overall_score": 62.5,
  "risk_level": "HIGH",
  "confidence": 0.94,
  "movement_quality": 85.0,
  "symmetry_score": 84.0,
  "model_version": "2.0.0-weighted",
  "contributors": [
    {
      "factor": "Knee valgus deviation (14.2° avg, 25% high-risk frames)",
      "body_region": "knee",
      "severity": "HIGH",
      "impact": 16.5
    }
  ]
}
```

### 9. Fetch Detected Movement Anomalies
- **Endpoint**: `GET /api/analysis/{analysis_id}/anomalies`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "frame": 45,
    "timestamp": 1.5,
    "type": "knee_valgus",
    "score": 0.88,
    "severity": "HIGH",
    "body_region": "left_knee",
    "explanation": "Knee alignment deviates significantly from baseline during landing."
  }
]
```

### 10. Fetch Risk Factors
- **Endpoint**: `GET /api/analysis/{analysis_id}/risk-factors`
- **Headers**: `Authorization: Bearer <access_token>`

### 11. Fetch Personalized Recommendations
- **Endpoint**: `GET /api/analysis/{analysis_id}/recommendations`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "analysis_id": "anl_job_991823",
  "disclaimer": "These recommendations are screening/support information and are not a medical diagnosis...",
  "recommendations": [
    {
      "reason": "Elevated knee valgus during dynamic loading",
      "priority": "HIGH",
      "target_region": "knee",
      "category": "strengthening",
      "exercise": "Gluteus medius band walks and single-leg RDLs",
      "suggested_frequency": "3-4 sessions/week",
      "suggested_sets_reps": "3 sets x 12 reps per leg",
      "expected_objective": "Strengthen hip abductors to stabilize frontal plane knee alignment."
    }
  ]
}
```

### 12. Fetch Complete Consolidated Report
- **Endpoint**: `GET /api/analysis/{analysis_id}/complete-report`
- **Headers**: `Authorization: Bearer <access_token>`
- Returns consolidated JSON containing analysis status, video metadata, weighted risk, 6-category injury probabilities, biomechanical summary, anomalies, and recommendations.

### 13. Download Clinical PDF Report
- **Endpoint**: `GET /api/analysis/{analysis_id}/download/pdf`
- **Headers**: `Authorization: Bearer <access_token>` (or `?token=...` query param)
- **Response**: `application/pdf` binary stream.

### 14. Download Analytical Excel Workbook
- **Endpoint**: `GET /api/analysis/{analysis_id}/download/excel`
- **Headers**: `Authorization: Bearer <access_token>` (or `?token=...` query param)
- **Response**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` stream.


