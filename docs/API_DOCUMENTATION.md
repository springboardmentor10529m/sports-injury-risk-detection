# REST API Reference Documentation

The **AthleteGuard Sports Injury Risk Detection API** is built with FastAPI and strictly follows RESTful principles. Interactive Swagger UI documentation is available locally at `http://localhost:8000/docs` or `http://localhost/api/docs`.

---

## 🔑 Authentication Endpoints (`/api/auth`)

### 1. Register User
- **Endpoint**: `POST /api/auth/register`
- **Request Body**:
```json
{
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "password": "Password123!",
  "role": "ATHLETE",
  "phone": "+1-555-0192"
}
```
- **Success Response** (`200 OK`):
```json
{
  "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "role": "ATHLETE",
  "phone": "+1-555-0192",
  "created_at": "2026-01-15T08:30:00Z"
}
```

### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Notes**: Accepts either email address (`saketh@example.com`) or username / athlete identifier (`saketh`). Matching is case-insensitive.
- **Request Body**:
```json
{
  "email": "saketh@example.com",
  "password": "Password123!"
}
```
- **Success Response** (`200 OK`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "user_id": "usr_9b1deb4d-3b7d-4142-913b-722141527001",
  "name": "Marcus Vance",
  "email": "marcus.vance@athletes.org",
  "role": "ATHLETE",
  "phone": "+1-555-0192"
}
```

### 4. Google OAuth 2.0 Authentication
- **Endpoint**: `POST /api/auth/google`
- **Request Body**:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
  "role": "ATHLETE"
}
```
- **Success Response** (`200 OK`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "is_new_user": false,
  "user": {
    "user_id": "usr_google_01995d8e",
    "email": "athlete@gmail.com",
    "name": "Athlete Name",
    "role": "ATHLETE"
  }
}
```

### 5. Get Google OAuth Client Configuration
- **Endpoint**: `GET /api/auth/google/config`
- **Response** (`200 OK`):
```json
{
  "client_id": "1087405230302-google-client-id.apps.googleusercontent.com",
  "enabled": true
}
```

---

## 👟 Athlete & Clinical History Endpoints (`/api/athletes`)

### 1. Get Current Athlete Profile
- **Endpoint**: `GET /api/athletes/profile`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "athlete_id": "ath_101",
  "user_id": "usr_9b1deb4d",
  "sport": "Basketball",
  "position": "Point Guard",
  "age": 23,
  "height": 188.0,
  "weight": 84.0,
  "training_load": 65.0,
  "flexibility": 68.0,
  "strength": 88.5,
  "balance": 72.0,
  "endurance": 91.0,
  "coach_notes": "Focus on deceleration stability post-lateral cut."
}
```

### 2. Update Athlete Profile & Training Load
- **Endpoint**: `PUT /api/athletes/profile`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "sport": "Basketball",
  "position": "Point Guard",
  "age": 23,
  "height": 188.0,
  "weight": 84.0,
  "training_load": 75.0,
  "flexibility": 70.0,
  "strength": 90.0,
  "balance": 75.0,
  "endurance": 92.0,
  "coach_notes": "Increasing workload for competitive tournament prep."
}
```

### 3. List Athlete Injury History
- **Endpoint**: `GET /api/athletes/injuries`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "injury_id": "inj_8812c",
    "athlete_id": "ath_101",
    "body_part": "Knee",
    "injury_type": "ACL Tear / Sprain",
    "severity": "MODERATE",
    "injury_date": "2025-06-15",
    "recovery_date": "2025-12-01",
    "remarks": "Completed 6-month progressive neuromuscular rehabilitation.",
    "created_at": "2026-09-17T12:00:00Z"
  }
]
```

### 4. Log Previous Injury Record
- **Endpoint**: `POST /api/athletes/injuries`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**:
```json
{
  "body_part": "Hamstring",
  "injury_type": "Grade II Biceps Femoris Strain",
  "severity": "MODERATE",
  "injury_date": "2025-10-01",
  "recovery_date": "2025-11-20",
  "remarks": "Eccentric Nordic hamstring strengthening protocol followed."
}
```

### 5. Delete Injury Record
- **Endpoint**: `DELETE /api/athletes/injuries/{injury_id}`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "status": "success",
  "message": "Injury history record deleted successfully."
}
```

---

## 🎥 Video Management Endpoints (`/api/videos`)

### 1. Upload Movement Video Clip
- **Endpoint**: `POST /api/videos/upload`
- **Headers**: `Authorization: Bearer <access_token>`
- **Form Data**:
  - `file`: MP4 / MOV video binary stream
  - `activity`: Movement assessment name (e.g., "Drop Vertical Jump", "Cutting Drill")
- **Response** (`200 OK`):
```json
{
  "video_id": "vid_65ffbe3f",
  "activity": "Drop Vertical Jump",
  "video_url": "/uploads/raw/vid_65ffbe3f.mp4",
  "processing_status": "UPLOADED"
}
```

### 2. List Personal Movement Videos
- **Endpoint**: `GET /api/videos/my-videos`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`): Array of Video metadata objects belonging to the authenticated athlete.

### 3. Delete Video
- **Endpoint**: `DELETE /api/videos/{video_id}`
- **Headers**: `Authorization: Bearer <access_token>`

---

## 🏃 3D Pose Analysis & Biomechanics Pipeline (`/api/analysis`)

### 1. Queue Movement Analysis Job
- **Endpoint**: `POST /api/analysis/videos/{video_id}/analyse`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`202 Accepted`):
```json
{
  "analysis_id": "anl_0ee5d4c3",
  "status": "queued",
  "message": "Pose analysis job queued successfully."
}
```

### 2. Force Re-analysis on Existing Video
- **Endpoint**: `POST /api/analysis/videos/{video_id}/reanalyse`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`202 Accepted`): Returns new job ID and clears previous cached results.

### 3. Poll Analysis Job Status
- **Endpoint**: `GET /api/analysis/{analysis_id}/status`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "analysis_id": "anl_0ee5d4c3",
  "status": "completed",
  "stage": "Analysis Complete",
  "progress": 100.0,
  "skeleton_video_url": "/api/analysis/anl_0ee5d4c3/skeleton-video",
  "completed_at": "2026-09-17T14:02:28Z"
}
```

### 4. Fetch 17-Keypoint Frame Sequence (COCO Format)
- **Endpoint**: `GET /api/analysis/{analysis_id}/keypoints`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "frame_number": 0,
    "timestamp": 0.0,
    "average_confidence": 0.98,
    "keypoints": {
      "nose": { "x": 329.4, "y": 17.6, "confidence": 1.0 },
      "left_knee": { "x": 312.1, "y": 284.5, "confidence": 0.98 },
      "right_knee": { "x": 338.4, "y": 286.1, "confidence": 0.97 }
    },
    "smoothed_keypoints": {
      "nose": { "x": 329.4, "y": 17.6, "confidence": 1.0 },
      "left_knee": { "x": 312.1, "y": 284.5, "confidence": 0.98 }
    }
  }
]
```

### 5. Fetch Biomechanics Kinematics Frame Sequence
- **Endpoint**: `GET /api/analysis/{analysis_id}/biomechanics`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "frame_number": 0,
    "timestamp": 0.0,
    "joint_angles": {
      "left_knee_angle": 179.2,
      "right_knee_angle": 179.5,
      "left_hip_angle": 175.4,
      "right_hip_angle": 176.1,
      "trunk_lean_angle": 3.2,
      "shoulder_alignment_angle": 1.1
    },
    "kinematics": {
      "knee_valgus_left": 4.1,
      "knee_valgus_right": 3.8
    },
    "symmetry": {
      "knee_symmetry": 98.2,
      "overall_symmetry": 96.5
    }
  }
]
```

### 6. Fetch Annotated Skeleton Video Stream
- **Endpoint**: `GET /api/analysis/{analysis_id}/skeleton-video`
- **Headers**: `Authorization: Bearer <access_token>` (or `?token=...` query param)
- **Response**: `video/mp4` stream encoded in H.264 +faststart for instant browser seeking.

### 7. Fetch Detected Movement Anomalies
- **Endpoint**: `GET /api/analysis/{analysis_id}/anomalies`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
[
  {
    "frame": 45,
    "timestamp": 1.80,
    "fault_type": "knee_valgus",
    "score": 0.88,
    "severity": "HIGH",
    "body_region": "left_knee",
    "explanation": "Knee alignment deviates significantly into medial collapse during landing."
  }
]
```

### 8. Fetch ML Explainability & Feature Contributions
- **Endpoint**: `GET /api/analysis/{analysis_id}/explainability`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`):
```json
{
  "model_name": "Calibrated-XGBoost v2.0",
  "calibrated_probability": 0.124,
  "top_features": [
    { "feature": "knee_valgus_max", "importance": 0.28, "athlete_value": 14.8, "direction": "elevates_risk" },
    { "feature": "training_load_acwr", "importance": 0.22, "athlete_value": 1.42, "direction": "elevates_risk" },
    { "feature": "bilateral_knee_symmetry", "importance": 0.18, "athlete_value": 94.2, "direction": "protective" }
  ]
}
```

### 9. Fetch Consolidated Complete Report
- **Endpoint**: `GET /api/analysis/{analysis_id}/complete-report`
- **Headers**: `Authorization: Bearer <access_token>`
- Returns complete JSON payload containing video metadata, 5-factor screening score, calibrated ML probability, anomalies, risk factors, recommendations, and clinical summary.

### 10. List Athlete Screening Analyses
- **Endpoint**: `GET /api/analysis/my-analyses`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response** (`200 OK`): Chronological list of screening analyses with risk scores, angles, and ML probabilities.

### 11. Export Reports & Raw Data
- **PDF Report**: `GET /api/analysis/{analysis_id}/download/pdf`
- **Excel Workbook**: `GET /api/analysis/{analysis_id}/download/excel`
- **Keypoints JSON**: `GET /api/analysis/{analysis_id}/download/keypoints?format=json`
- **Keypoints CSV**: `GET /api/analysis/{analysis_id}/download/keypoints?format=csv`
- **Biomechanics CSV**: `GET /api/analysis/{analysis_id}/download/biomechanics`

---

## 🔬 Machine Learning & Dataset Catalog (`/api/models`, `/api/datasets`)

### 1. Model Registry
- **Endpoint**: `GET /api/models`
- **Response** (`200 OK`):
```json
{
  "models": [
    {
      "name": "Calibrated-XGBoost",
      "version": "2.0.0",
      "architecture": "Gradient Boosted Decision Trees (XGBoost) + Platt Scaling",
      "calibration": "Sigmoid (Platt Scaling)",
      "validation_protocol": "Subject-Level GroupShuffleSplit (0% Data Leakage)",
      "metrics": {
        "roc_auc": 0.814,
        "pr_auc": 0.612,
        "brier_score": 0.051,
        "ece": 0.024
      }
    },
    {
      "name": "RTMPose-M ONNX",
      "version": "1.0.0",
      "architecture": "SimCC Coordinate Classification (OpenMMLab)",
      "fps": "25-30 FPS real-time"
    }
  ]
}
```

### 2. Dataset Registry
- **Endpoint**: `GET /api/datasets`
- **Response** (`200 OK`):
```json
{
  "datasets": [
    {
      "name": "Lövdal et al. (2021) Nature Sci Data",
      "subjects": 40,
      "samples": 40848,
      "focus": "Competitive Runners daily training load & injury events"
    },
    {
      "name": "Swathikiran (2021) Athlete Workload",
      "subjects": 64,
      "samples": 4350,
      "focus": "Workload metrics, ACWR, and soft-tissue injury incidence"
    },
    {
      "name": "Harmonized Injury Dataset",
      "total_samples": 45198,
      "total_athletes": 104,
      "injury_events": 712
    }
  ]
}
```
