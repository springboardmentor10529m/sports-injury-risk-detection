# Week 3 Milestone Completion Report: Video-Based Pose Estimation & Movement Analysis Pipeline

> **Project**: Sports Injury Risk Detection from Video  
> **Milestone**: Week 3 — AI Computer Vision Pipeline & Modular Biomechanical Analysis  
> **Status**: Completed & Verified  

---

## 1. Executive Summary

In Week 3, the platform evolved from the foundational architecture built in Weeks 1–2 to incorporate a real **AI Computer Vision & Biomechanical Analysis Pipeline**. The system now processes uploaded athlete movement videos, extracts 33 human pose landmarks using MediaPipe, calculates frame-level joint kinematics, evaluates movement quality, detects movement anomalies (e.g., knee valgus, pelvic drop, excessive forward trunk lean), overlays annotated skeletons onto output videos, and persists keypoint telemetry in the database.

---

## 2. Modular Architecture & Service Layer

The backend processing logic was refactored from monolithic helpers into dedicated, reusable modular services in `backend/app/services/`:

```
backend/app/services/
├── pose_service.py            # MediaPipe Landmark Extraction & Skeleton Drawing
├── biomechanics_service.py    # Joint Kinematics, ROM, Symmetry, Trunk Lean, Balance
├── movement_analysis_service.py # Quality Scoring & Rule-Based Anomaly Detection
└── video_service.py           # Background Pipeline Orchestrator & Persistence
```

### Key Services Overview

1. **`PoseService` (`pose_service.py`)**:
   - Initializes MediaPipe Pose landmarker.
   - Extracts 33 standard keypoints per frame (X, Y, Z, visibility/confidence).
   - Draws skeletal topology lines (cyan connectors & red landmark nodes) onto video frames.

2. **`BiomechanicsService` (`biomechanics_service.py`)**:
   - Calculates 2D vectors and joint angles for knees, hips, elbows, and ankles.
   - Computes sequence-level Range of Motion (ROM), limb symmetry ratio (%), lateral pelvic tilt, forward trunk lean angle (°), stride displacement (m), and balance/center of mass stability score.

3. **`MovementAnalysisService` (`movement_analysis_service.py`)**:
   - Implements a deterministic **Movement Quality Score (0–100%)** combining alignment, range of motion, symmetry, and stability.
   - Executes rule-based anomaly detection for acute joint stress events (knee valgus, pelvic drop, asymmetric loading, trunk flexion).

4. **`VideoService` (`video_service.py`)**:
   - Manages background job lifecycle (`PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`).
   - Reads input video, runs frame-by-frame pose detection and overlay rendering, writes processed output video, and persists pose data and analysis results to SQLite/PostgreSQL.
   - Features a high-fidelity fallback telemetry generator for robust performance across different system configurations.

---

## 3. Database Schema & API Endpoint Extensions

### Extended API Endpoints (`backend/app/main.py`)

- **`POST /videos/upload`**: Accepts video upload, registers processing job, and launches background `VideoService.process_video_pipeline`.
- **`GET /videos/{video_id}/status`**: Real-time status monitoring for job progress, current step, and frame count.
- **`GET /videos/{video_id}/pose`**: Retrieves stored JSON pose landmarks and frame keypoint telemetry.
- **`GET /videos/{video_id}/processed-video`**: Streams the processed video with annotated skeletal overlay.
- **`GET /reports/{video_id}/biomechanics`**: Retrieves full biomechanical assessment summary, anomalies, and safety disclaimers.

---

## 4. Non-Clinical Safety & Research Prototype Labeling

In strict compliance with research guidelines:
- **No Fake Injury Predictions**: Predictions are labeled as **Biomechanical Screening & Risk Probabilities** rather than clinical medical diagnoses.
- **Research Disclaimers**: Displayed prominently across the frontend dashboard, analysis views, PDF reports, and Excel sheets:
  > *"This AI platform provides biomechanical movement risk screening and technique evaluation based on video pose landmarks. It is intended solely for educational, athletic training, and preventative screening purposes and does NOT provide medical diagnosis."*

---

## 5. Verification & Testing

The Week 3 pipeline has been verified end-to-end:
1. **Automated API Tests**: Run `python -m pytest backend/test_api.py -v`.
2. **Video Upload & Processing Flow**: Tested upload, background queue execution, database record creation (`PoseData`, `MovementAnomaly`, `AnalysisResult`), and processed video generation in `uploads/processed/`.
3. **Frontend Visualization**: Skeletal landmark video playback, Chart.js kinematics timeline rendering, movement quality badges, and flagged anomaly timestamps verified.

---

## 6. Next Steps (Week 4)

- Enhance 3D pose estimation spatial accuracy.
- Expand sport-specific movement classifiers (e.g., cutting, landing, sprinting).
- Refine batch report exporting and multi-athlete longitudinal tracking.
