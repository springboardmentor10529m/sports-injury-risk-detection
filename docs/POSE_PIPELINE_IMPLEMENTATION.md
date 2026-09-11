# Sports Pose Estimation & Biomechanics Pipeline — Implementation Specification

**Project**: `sportsinjuryanalyser`  
**Branch**: `saketh-pochampally`  
**Phase**: Movement Analysis & Biomechanics Pipeline

---

## 🎯 Architecture Overview & Pipeline Goal

The goal of this implementation is to extend the existing web application with an end-to-end Computer Vision & Biomechanics Pipeline:

```
USER → LOGIN → UPLOAD VIDEO → SELECT ACTIVITY → MY VIDEOS → ANALYSE MOVEMENT
  ↓
ANALYSIS JOB QUEUED (FastAPI BackgroundTask)
  ↓
PULL PRETRAINED RTMPose-M (17 COCO Keypoints: CUDA / MPS / CPU)
  ↓
PRIMARY ATHLETE TRACKING (IoU / Centroid Tracker, person_id = 1)
  ↓
TEMPORAL SMOOTHING (One Euro Filter with EMA Fallback)
  ↓
SKELETON GENERATION & ANNOTATED VIDEO RENDERING (backend/uploads/processed/)
  ↓
BIOMECHANICS ENGINE (Joint Angles, Kinematics, Left/Right Symmetry)
  ↓
DATABASE PERSISTENCE (AnalysisJob, PoseFrame, BiomechanicsFrame)
  ↓
FRONTEND ANALYSIS DASHBOARD (Synchronized Video + Time-Series Joint Charts)
```

---

## 📂 New Files & Directory Structure

```
backend/
├── config/
│   └── pose_config.yaml                  # YAML settings for RTMPose-M, FPS, tracking, thresholds
├── ml/
│   ├── device.py                         # get_device() [CUDA -> MPS -> CPU]
│   ├── pose/
│   │   ├── __init__.py
│   │   ├── pose_model.py                 # Pretrained RTMPose-M loader & inference
│   │   ├── pose_pipeline.py              # Frame-by-frame detector & pipeline manager
│   │   ├── tracker.py                    # Primary athlete IoU/centroid tracker
│   │   ├── smoothing.py                  # One Euro Filter & EMA jitter reduction
│   │   ├── skeleton.py                   # 17 COCO keypoint connections topology
│   │   └── visualizer.py                 # Skeleton & metadata overlay video drawer
│   └── biomechanics/
│       ├── __init__.py
│       ├── geometry.py                   # 3-point 2D angle math & normalized coords
│       ├── joint_angles.py               # Knees, Hips, Ankles, Elbows, Shoulders, Trunk Lean
│       ├── kinematics.py                 # Angular velocity, acceleration & relative velocity
│       ├── symmetry.py                   # Left vs Right joint angle delta metrics
│       └── feature_extractor.py          # Frame-level biomechanics payload generator
├── services/
│   └── pose_analysis_service.py          # Sequential OpenCV video processor at 15 FPS
├── routers/
│   └── analysis_router.py                # REST endpoints for analysis job creation & status
└── tests/
    ├── test_pose.py                      # Model loading, 17 COCO keypoints & tracking tests
    ├── test_biomechanics.py              # Joint angles, kinematics & symmetry math tests
    └── test_analysis_api.py              # User-scoped authorization & REST endpoint tests

datasets/
└── coco/                                # COCO 2017 annotations download folder (no 18GB images)

scripts/
├── download_coco.py                      # Downloads annotations_trainval2017.zip (annotations only)
└── inspect_custom_pose_dataset.py        # Inspects custom dataset and generates report

reports/
└── custom_pose_dataset_report.json       # Dataset report artifact

frontend/src/components/analysis/
├── AnalysisDashboard.jsx                 # Master analysis view container
├── AnalysisProgress.jsx                  # 7-step stepper status UI
├── PoseVideoPlayer.jsx                   # Synchronized annotated video player
├── SkeletonViewer.jsx                    # Canvas 17-keypoint interactive overlay
├── JointAngleChart.jsx                   # Time-series Recharts/Chart.js joint angle charts
├── BiomechanicsCharts.jsx                # Trunk lean, alignment & symmetry charts
└── ConfidenceIndicator.jsx               # Pose tracking confidence indicator
```

---

## 🗄️ Database Schema Additions (`backend/models.py`)

Three new SQLAlchemy models will be added without modifying existing tables (`User`, `Athlete`, `Video`):

1. **`AnalysisJob`**:
   - `id` (String PK)
   - `video_id` (FK -> `videos.video_id`)
   - `user_id` (FK -> `users.user_id`)
   - `status` (`queued`, `processing`, `pose_estimation`, `tracking`, `biomechanics`, `rendering`, `completed`, `failed`)
   - `progress` (Float 0..100)
   - `stage` (String)
   - `created_at`, `started_at`, `completed_at` (DateTime)
   - `error_message` (Text)

2. **`PoseFrame`**:
   - `id` (String PK)
   - `analysis_id` (FK -> `analysis_jobs.id`)
   - `frame_number` (Integer)
   - `timestamp` (Float seconds)
   - `person_id` (Integer default 1)
   - `average_confidence` (Float)
   - `keypoints_json` (Text / JSON)
   - `smoothed_keypoints_json` (Text / JSON)

3. **`BiomechanicsFrame`**:
   - `id` (String PK)
   - `analysis_id` (FK -> `analysis_jobs.id`)
   - `frame_number` (Integer)
   - `timestamp` (Float seconds)
   - `joint_angles_json` (Text / JSON)
   - `kinematics_json` (Text / JSON)
   - `symmetry_json` (Text / JSON)

---

## 🌐 API Endpoints (`analysis_router.py`)

- `POST /api/analysis/videos/{video_id}/analyse` — Queues background analysis job.
- `GET /api/analysis/{analysis_id}/status` — Returns job status & progress.
- `GET /api/analysis/{analysis_id}` — Returns full job metadata.
- `GET /api/analysis/{analysis_id}/keypoints` — Returns 17-keypoint frame sequences.
- `GET /api/analysis/{analysis_id}/biomechanics` — Returns joint angles & symmetry sequences.
- `GET /api/analysis/{analysis_id}/skeleton-video` — Serves annotated skeleton MP4 video.
- `GET /api/analysis/{analysis_id}/download/keypoints` — Downloads keypoints CSV / JSON.
- `GET /api/analysis/{analysis_id}/download/biomechanics` — Downloads biomechanics CSV.

*All endpoints strictly enforce `current_user.user_id == analysis.user_id`.*

---

## 🛑 Non-Medical Disclaimer Notice
> *"This system provides computer-vision-based movement and biomechanical screening. It is not a medical diagnosis system."*
