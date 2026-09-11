# Database Schema Specification

This document provides the complete database design for the **Sports Injury Risk Detection** platform, encompassing **10 PostgreSQL tables** for structured relational data and **2 MongoDB collections** for high-volume unstructured pose keypoint streams and AI execution logs.

---

## 📐 Entity Relationship Summary

```
USERS
  └── ATHLETES (1:N)
        ├── INJURY_HISTORY (1:N)
        ├── PERFORMANCE_RECORDS (1:N)
        ├── REPORTS (1:N)
        └── VIDEOS (1:N)
              └── ANALYSIS_RESULTS (1:1)
                    └── INJURY_PREDICTIONS (1:1)
                          └── RECOMMENDATIONS (1:1)

USERS ──< NOTIFICATIONS (1:N)

MongoDB Collections:
  ├── pose_data (References videos.video_id & athletes.athlete_id)
  └── ai_logs   (References videos.video_id)
```

---

## SECTION 1 — Core Entities (PostgreSQL)

### 1. `users`
**Purpose**: Stores platform users, authentication credentials, and system roles.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `user_id` | `UUID` | **PK**, Default `uuid_generate_v4()` | Globally unique user identifier |
| `name` | `VARCHAR(120)` | `NOT NULL` | Full display name |
| `email` | `VARCHAR(255)` | **UNIQUE**, `NOT NULL` | Case-insensitive unique login email |
| `password_hash` | `TEXT` | `NOT NULL` | Bcrypt / Argon2 hashed password |
| `role` | `ENUM` | `NOT NULL` | `athlete` \| `coach` \| `admin` \| `viewer` |
| `phone` | `VARCHAR(20)` | Optional | E.164 phone number format |
| `profile_image` | `TEXT` | Optional | CDN URL or relative path |
| `created_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | UTC creation timestamp |

---

### 2. `athletes`
**Purpose**: Stores athlete-specific physical assessments and training profiles.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `athlete_id` | `UUID` | **PK** | Globally unique athlete identifier |
| `user_id` | `UUID` | **FK** (`users.user_id`), `NOT NULL` | Cascade delete link to user account |
| `sport` | `VARCHAR(80)` | `NOT NULL` | Primary sport (e.g. Basketball, Soccer) |
| `position` | `VARCHAR(80)` | Optional | Playing position (e.g. Point Guard) |
| `age` | `INT` | Optional | Current age (stores `date_of_birth` recommended) |
| `height_cm` | `FLOAT` | Optional | Stored in centimetres |
| `weight_kg` | `FLOAT` | Optional | Stored in kilograms |
| `training_load` | `FLOAT` | Optional | Weekly training load workload score |
| `flexibility` | `FLOAT` | Optional | Physical flexibility rating (0–100 scale) |
| `strength` | `FLOAT` | Optional | Physical strength rating (0–100 scale) |
| `balance` | `FLOAT` | Optional | Stability & balance rating (0–100 scale) |
| `endurance` | `FLOAT` | Optional | Cardiovascular endurance rating (0–100 scale) |
| `coach_notes` | `TEXT` | Optional | Free-text clinical and coaching notes |

---

### 3. `injury_history`
**Purpose**: Maintains historical clinical injury records for each athlete.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `injury_id` | `UUID` | **PK** | Primary key |
| `athlete_id` | `UUID` | **FK** (`athletes.athlete_id`), `NOT NULL` | Target athlete reference |
| `injury_type` | `VARCHAR(120)` | `NOT NULL` | e.g., ACL Sprain, Fracture, Hamstring Strain |
| `body_part` | `VARCHAR(80)` | `NOT NULL` | e.g., Right Knee, Lower Back, Left Ankle |
| `severity` | `VARCHAR(20)` | `NOT NULL` | `mild` \| `moderate` \| `severe` |
| `injury_date` | `DATE` | `NOT NULL` | Onset or injury occurrence date |
| `recovery_date` | `DATE` | Optional | Date fully recovered (`NULL` if active/recovering) |
| `remarks` | `TEXT` | Optional | Clinical notes, surgery details, rehabilitation status |

---

## SECTION 2 — Analysis & AI Pipeline (PostgreSQL)

### 4. `videos`
**Purpose**: Stores uploaded movement analysis video metadata.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `video_id` | `UUID` | **PK** | Unique video identifier |
| `athlete_id` | `UUID` | **FK** (`athletes.athlete_id`), `NOT NULL` | Target athlete reference |
| `activity` | `VARCHAR(80)` | `NOT NULL` | e.g., Single Leg Jump, 45° Cutting, Sprint |
| `video_url` | `TEXT` | `NOT NULL` | Storage URL (S3 / GCS / local static path) |
| `duration_sec` | `FLOAT` | Optional | Clip duration in seconds |
| `fps` | `INT` | Optional | Video frames per second (e.g., 60, 120) |
| `resolution` | `VARCHAR(20)` | Optional | Video resolution (e.g., 1920x1080) |
| `quality_score` | `FLOAT` | Optional | Automated video frame quality metric (0–1.0) |
| `processing_status` | `VARCHAR(30)` | `NOT NULL` | `pending` \| `processing` \| `done` \| `failed` |
| `uploaded_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | Upload timestamp (UTC) |

---

### 5. `analysis_results`
**Purpose**: Stores biomechanical keypoint measurements and overall movement quality scores.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `analysis_id` | `UUID` | **PK** | Primary key |
| `video_id` | `UUID` | **FK** (`videos.video_id`), **UNIQUE**, `NOT NULL` | 1-to-1 relationship with video |
| `athlete_id` | `UUID` | **FK** (`athletes.athlete_id`), `NOT NULL` | Denormalised for fast athlete queries |
| `knee_valgus` | `FLOAT` | Optional | Inward knee collapse angle in degrees |
| `hip_stability` | `FLOAT` | Optional | Pelvic control index (0–100 scale) |
| `trunk_lean` | `FLOAT` | Optional | Lateral torso lean angle in degrees |
| `stride_length` | `FLOAT` | Optional | Average stride length in metres |
| `joint_alignment` | `FLOAT` | Optional | Composite joint alignment score (0–100) |
| `symmetry_score` | `FLOAT` | Optional | Left / right movement symmetry ratio (0–1.0) |
| `fatigue_score` | `FLOAT` | Optional | Estimated movement fatigue index (0–1.0) |
| `movement_quality` | `FLOAT` | Optional | Overall movement quality rating (0–100) |
| `overall_risk_score` | `FLOAT` | `NOT NULL` | Composite injury risk score (0–100 scale) |
| `risk_level` | `VARCHAR(10)` | `NOT NULL` | `low` \| `medium` \| `high` \| `critical` |
| `created_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | UTC timestamp |

---

### 6. `injury_predictions`
**Purpose**: Stores ML-predicted probabilities for specific anatomical injuries.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `prediction_id` | `UUID` | **PK** | Primary key |
| `analysis_id` | `UUID` | **FK** (`analysis_results.analysis_id`), **UNIQUE**, `NOT NULL` | 1-to-1 link to analysis result |
| `acl_risk` | `FLOAT` | `NOT NULL` | ACL tear probability (0.0 – 1.0) |
| `hamstring_risk` | `FLOAT` | `NOT NULL` | Hamstring strain probability (0.0 – 1.0) |
| `ankle_risk` | `FLOAT` | `NOT NULL` | Ankle inversion sprain probability (0.0 – 1.0) |
| `shoulder_risk` | `FLOAT` | `NOT NULL` | Shoulder instability probability (0.0 – 1.0) |
| `lower_back_risk` | `FLOAT` | `NOT NULL` | Lower back stress probability (0.0 – 1.0) |
| `overuse_risk` | `FLOAT` | `NOT NULL` | Overuse fatigue strain probability (0.0 – 1.0) |

---

### 7. `recommendations`
**Purpose**: Stores AI-generated corrective exercises and rehabilitation protocols.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `recommendation_id` | `UUID` | **PK** | Primary key |
| `prediction_id` | `UUID` | **FK** (`injury_predictions.prediction_id`), **UNIQUE**, `NOT NULL` | 1-to-1 link to injury prediction |
| `exercise` | `TEXT` | Optional | Prescribed corrective exercises |
| `mobility` | `TEXT` | Optional | Target mobility & stretching protocols |
| `strengthening` | `TEXT` | Optional | Targeted strengthening routine |
| `recovery` | `TEXT` | Optional | Rest, cryotherapy & recovery protocol |
| `training_modification` | `TEXT` | Optional | Training load & volume modifications |

---

## SECTION 3 — Output & Reporting (PostgreSQL)

### 8. `notifications`
**Purpose**: Stores system alerts, risk warnings, and report notifications.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `notification_id` | `UUID` | **PK** | Primary key |
| `user_id` | `UUID` | **FK** (`users.user_id`), `NOT NULL` | Target user recipient |
| `title` | `VARCHAR(200)` | `NOT NULL` | Alert headline |
| `message` | `TEXT` | `NOT NULL` | Full alert notification content |
| `notification_type` | `VARCHAR(50)` | `NOT NULL` | `risk_alert` \| `report_ready` \| `system` |
| `is_read` | `BOOLEAN` | `NOT NULL`, Default `FALSE` | Read status flag |
| `created_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | UTC timestamp |

---

### 9. `reports`
**Purpose**: Tracks exported PDF/CSV summary reports.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `report_id` | `UUID` | **PK** | Primary key |
| `athlete_id` | `UUID` | **FK** (`athletes.athlete_id`), `NOT NULL` | Athlete reference |
| `report_type` | `VARCHAR(60)` | `NOT NULL` | `weekly` \| `monthly` \| `injury` \| `comparison` |
| `generated_by` | `UUID` | **FK** (`users.user_id`), `NOT NULL` | Coach or admin who triggered report |
| `file_path` | `TEXT` | `NOT NULL` | S3 / GCS or local path to report PDF/CSV |
| `generated_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | UTC timestamp |

---

### 10. `performance_records`
**Purpose**: Tracks time-series performance metrics for trend analysis.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `record_id` | `UUID` | **PK** | Primary key |
| `athlete_id` | `UUID` | **FK** (`athletes.athlete_id`), `NOT NULL` | Athlete reference |
| `activity` | `VARCHAR(80)` | `NOT NULL` | e.g. Sprint 40m, Vertical Jump, Agility T-Test |
| `score` | `FLOAT` | `NOT NULL` | Quantitative performance score |
| `remarks` | `TEXT` | Optional | Test conditions or remarks |
| `recorded_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | UTC timestamp |

---

### 11. `analysis_jobs`
**Purpose**: Tracks computer-vision movement pose estimation and biomechanics processing pipeline jobs.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `id` | `UUID` | **PK** | Primary key |
| `video_id` | `UUID` | **FK** (`videos.video_id`), `NOT NULL` | Target video |
| `user_id` | `UUID` | **FK** (`users.user_id`), `NOT NULL` | User owner |
| `status` | `VARCHAR(30)` | `NOT NULL` | `queued` \| `processing` \| `pose_estimation` \| `tracking` \| `biomechanics` \| `rendering` \| `completed` \| `failed` |
| `progress` | `FLOAT` | `NOT NULL`, Default `0.0` | Job completion percentage (0.0 to 100.0) |
| `stage` | `VARCHAR(60)` | `NOT NULL` | Human-readable progress stage |
| `created_at` | `TIMESTAMP` | `NOT NULL`, Default `NOW()` | Job creation time |
| `started_at` | `TIMESTAMP` | Optional | Job execution start time |
| `completed_at` | `TIMESTAMP` | Optional | Job completion time |
| `error_message` | `TEXT` | Optional | Failure message if job failed |
| `skeleton_video_url` | `TEXT` | Optional | Relative URL path to generated skeleton MP4 video |

---

### 12. `pose_frames`
**Purpose**: Stores frame-by-frame 17 COCO keypoints trajectories for tracked primary athletes.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `id` | `UUID` | **PK** | Primary key |
| `analysis_id` | `UUID` | **FK** (`analysis_jobs.id`), `NOT NULL` | Target analysis job |
| `frame_number` | `INT` | `NOT NULL` | Video frame index |
| `timestamp` | `FLOAT` | `NOT NULL` | Frame timestamp in seconds |
| `person_id` | `INT` | Default `1` | Tracked primary athlete ID |
| `average_confidence` | `FLOAT` | Default `0.0` | Mean keypoint detection confidence score |
| `keypoints_json` | `TEXT` | `NOT NULL` | Raw 17 COCO keypoint coordinates JSON |
| `smoothed_keypoints_json` | `TEXT` | `NOT NULL` | One Euro Filter smoothed 17 COCO keypoint coordinates JSON |

---

### 13. `biomechanics_frames`
**Purpose**: Stores frame-by-frame 3-point joint angles, kinematics, and symmetry metrics.

| Column Name | Data Type | Constraints | Description / Notes |
|---|---|---|---|
| `id` | `UUID` | **PK** | Primary key |
| `analysis_id` | `UUID` | **FK** (`analysis_jobs.id`), `NOT NULL` | Target analysis job |
| `frame_number` | `INT` | `NOT NULL` | Video frame index |
| `timestamp` | `FLOAT` | `NOT NULL` | Frame timestamp in seconds |
| `joint_angles_json` | `TEXT` | `NOT NULL` | Left/Right knee, hip, ankle, elbow, shoulder angles & trunk lean JSON |
| `kinematics_json` | `TEXT` | `NOT NULL` | Angular velocity, angular acceleration, and relative velocity JSON |
| `symmetry_json` | `TEXT` | `NOT NULL` | Bilateral Left vs Right angle deltas & lower limb asymmetry index JSON |


---

## SECTION 4 — Unstructured Data (MongoDB Collections)

### 11. `pose_data` Collection
**Purpose**: Stores frame-wise 2D/3D skeletal keypoint coordinates extracted by computer vision models (MediaPipe/OpenCV).

```json
{
  "_id": "ObjectId",
  "video_id": "UUID (references videos.video_id)",
  "athlete_id": "UUID (references athletes.athlete_id)",
  "frames_count": 60,
  "created_at": "ISODate",
  "landmarks_template": [
    { "id": 0, "name": "nose", "x": 0.50, "y": 0.15 },
    { "id": 25, "name": "left_knee", "x": 0.45, "y": 0.72 },
    { "id": 26, "name": "right_knee", "x": 0.52, "y": 0.73 }
  ],
  "skeleton_connections": [
    [11, 12], [23, 25], [24, 26], [25, 27], [26, 28]
  ]
}
```

---

### 12. `ai_logs` Collection
**Purpose**: Stores AI execution logs, inference latencies, model parameters, and raw model payloads for evaluation and debugging.

```json
{
  "_id": "ObjectId",
  "video_id": "UUID (references videos.video_id)",
  "model_name": "mediapipe-pose-v2",
  "model_version": "2.4.1-cuda",
  "inference_time": 18.4,
  "confidence": 0.962,
  "output": {
    "status": "success",
    "keypoints_extracted": 33,
    "frames_processed": 870
  },
  "error": null,
  "created_at": "ISODate"
}
```
