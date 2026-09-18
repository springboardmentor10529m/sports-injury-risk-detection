# Platform Documentation Index

Welcome to the documentation repository for the **AI-Powered Sports Injury Risk Detection Platform**.

---

### Core Architecture & Technical Specifications
- **[System Architecture Specification](SYSTEM_ARCHITECTURE.md):** Complete multi-tier architecture diagram, data layer, AI/ML pipeline, mathematical scoring models, and full 13-module catalog.
- **[Backend API Documentation](../README.md#how-to-run-the-application):** Endpoints, authentication, video processing pipelines, and data models.
- **Interactive Swagger Docs:** Accessible at `http://localhost:8000/docs` when the backend service is running.

---

### Key System Highlights
- **13 Implemented Functional Modules:**
  1. User Authentication & Role-Based Access (Athlete, Coach, Physiotherapist, Sports Scientist, Admin)
  2. Athlete Profile Management
  3. Video Upload & Preprocessing Engine
  4. Pose Estimation Engine (MediaPipe BlazePose)
  5. Biomechanical Analysis Engine (Knee Valgus, Trunk Lean, ROM, Symmetry)
  6. Injury Risk Prediction Engine (ACL, Hamstring, Ankle, Shoulder, Lower Back)
  7. Movement Anomaly Detection Engine (SportsPose & Human3.6M Baselines)
  8. Risk Scoring Engine (Weighted Formula: 35% Deviations + 20% History + 20% Asymmetry + 15% Load + 10% Fatigue)
  9. Corrective Recommendation Engine (Mobility, Strengthening, Recovery, Technique)
  10. Role-Tailored Dashboards & Analytics
  11. Notification & Alert System
  12. Reports & Export System (Longitudinal Athlete CSV, Team Matrix CSV, Research Cohorts)
  13. Docker & Cloud Deployment
