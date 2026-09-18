# AthleteGuard: Documentation Portal

Welcome to the documentation portal for **AthleteGuard: AI Sports Biomechanics & Injury Prevention Platform**.

---

## 📚 Master Documentation Index

| Document | Category | Description |
|---|---|---|
| 🏗️ [**System Architecture**](ARCHITECTURE.md) | Architecture | High-level system design, 3D kinematics pipeline, dual intelligence engine & RBAC |
| 🔌 [**API Documentation**](API_DOCUMENTATION.md) | API & Integration | Comprehensive REST API endpoints, schemas, request/response payloads & errors |
| 🗄️ [**Database Schema Specification**](DATABASE_SCHEMA.md) | Database | Complete reference for PostgreSQL relational tables & MongoDB pose collections |
| 🏃 [**Pose & Biomechanics Pipeline**](POSE_PIPELINE.md) | Computer Vision | RTMPose-M keypoints, 20 standardized biomechanical metrics & temporal features |
| 🏷️ [**Model Card & Evaluation**](MODEL_CARD.md) | Machine Learning | Model architecture, performance metrics, training data, and clinical validation |
| ⚠️ [**ML Data Limitations**](ML_DATA_LIMITATIONS.md) | Data Ethics & Safety | Limitations, bias considerations, edge cases, and safety boundaries |
| 📦 [**Dataset Pipeline**](DATASET_PIPELINE.md) | Data Engineering | Data ingestion, processing, feature engineering, and validation pipelines |
| 🌐 [**Dataset Sources**](DATASET_SOURCES.md) | Data Sources | Public and proprietary biomechanics dataset sources and benchmark references |
| 🤖 [**Pretrained Models**](PRETRAINED_MODELS.md) | Model Weights | Details on RTMPose, YOLOX, and classification model weights and checkpoints |
| 🐳 [**Deployment & Operations Guide**](DEPLOYMENT_GUIDE.md) | DevOps & Infra | Docker Compose setup, environment variables, Nginx, and production builds |
| 📊 [**Implementation Audit**](IMPLEMENTATION_AUDIT.md) | Quality & Audit | System implementation checklist, test coverage, and security audit |
| 📋 [**Final Implementation Report**](FINAL_IMPLEMENTATION_REPORT.md) | Executive Summary | Comprehensive deliverable report detailing project milestones and metrics |

---

## 🎯 Platform Capabilities Overview

1. **Video Movement Upload**: High-FPS video capture supporting jumping, landing, cutting, squats, and running gait.
2. **Interactive 3D Kinematic Studio**: Hardware-accelerated WebGL 3D pose reconstruction with 60 FPS playback, timeline scrubbing, frame stepping, and multi-angle camera views (Orbit, Coronal, Sagittal).
3. **Biomechanical Movement Analysis**: 20 frame-by-frame kinematic features including knee valgus deviation, trunk lean, hip stability, and bilateral asymmetry.
4. **Dual Intelligence Risk Engine**: Hybrid risk assessment combining Platt-calibrated supervised machine learning (XGBoost) with clinical 5-factor screening (Biomechanics 35%, Prior Injuries 20%, Asymmetry 20%, ACWR Workload 15%, Fatigue Drift 10%).
5. **Clinical Injury History Registry**: Complete longitudinal record of athlete injury events, anatomical sites, and recovery stages with dynamic risk recalibration.
6. **AI Prescriptions & Drills**: Targeted mobility, strengthening, and movement retraining protocols with set/rep recommendations.
7. **Clinical Export Engine**: Standardized 9-page clinical PDF reports and detailed multi-sheet Excel workbooks.
