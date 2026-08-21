# SafeMove — Backend Service

FastAPI backend application for the SafeMove sports injury risk detection platform.

## Features
- **Authentication & RBAC**: JWT authentication with 5 role levels (Athlete, Coach, Physiotherapist, Sports Scientist, Admin).
- **Video Ingestion & Storage**: Multi-tier video storage with format validation and SHA256 deduplication.
- **Kinematics & Pose Estimation**: 15 anatomical keypoints extraction via MediaPipe, joint angles, angular velocities, accelerations, and bilateral asymmetry metrics.
- **Biomechanical Anomaly Detection**: Independent statistics (Z-scores, percent deviation, range violations) and configurable severity rules against developmental baselines.
- **Dataset Integration Pipeline**: Standardized dataset ingestion, provenance schemas, athlete-level leakage prevention partitioning, and ML feature matrix generation.
- **Calgary Biomechanical Dataset Adapter**: Modality-aware integration for 3D motion-capture and biomechanical table research cohorts.

## Setup & Running

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run backend development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

```bash
pytest tests/ -v
```
