# Implementation Audit: Sports Biomechanics & Injury Risk Screening System

**Date**: 2026-09-11  
**Repository**: `Msme_Backend`  
**Target**: Upgrade to Real Machine Learning-Based Biomechanics & Injury-Risk Screening  

---

## 1. Executive Summary

This audit rigorously inspects the current repository state against the technical specification. While the repository provides a solid architectural foundation (FastAPI backend, React frontend, SQLite/MongoDB database layer, and 2D kinematic calculations), several critical components previously relied on uncalibrated heuristic formulas or wrapped deep learning models under mismatched names.

This document serves as the ground-truth baseline before executing the dataset integration, pretrained model onboarding, and supervised ML model training.

---

## 2. Component-by-Component Audit

### 2.1 Pose Estimation Engine
- **Current Code**: [backend/ml/pose/pose_model.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/pose/pose_model.py) defines a class named `RTMPoseModel`.
- **Actual Implementation**: Internally instantiates `torchvision.models.detection.keypointrcnn_resnet50_fpn(weights=KeypointRCNN_ResNet50_FPN_Weights.DEFAULT)`.
- **Finding**: The code is labeled "RTMPose-M" in the class name, docstrings, and frontend UI, but actually executes **Keypoint R-CNN (ResNet50 FPN)**.
- **Action Required (Phase 6 - Option A)**: Integrate genuine **RTMPose-M** using ONNX Runtime via `rtmlib` with pre-converted official weights. Retain Keypoint R-CNN as a selectable fallback. Store model weights under `models/pretrained/pose/` and document in `docs/PRETRAINED_MODELS.md`.

### 2.2 Biomechanics Feature Extraction
- **Current Code**: [backend/ml/biomechanics/](file:///c:/Users/saketh/Msme_Backend/backend/ml/biomechanics/) (`geometry.py`, `joint_angles.py`, `kinematics.py`, `symmetry.py`, `feature_engineering.py`, `temporal_aggregation.py`).
- **Status**: **Functional and Well-Structured (2D Kinematics)**.
  - Implements 3-point planar angle calculations (`calculate_angle_3pt`), bilateral joint asymmetry percentages, sagittal/frontal trunk lean, knee valgus kinematic proxy, and range of motion (ROM).
- **Finding & Limitations**:
  - The computations are strictly **2D pixel/camera coordinate kinematics**.
  - Ground Reaction Force (GRF) cannot be measured directly from monocular 2D video; existing loading calculations are kinematic proxies.
- **Action Required**: Retain and strengthen these calculations; explicitly document the 2D kinematic proxy limitation across documentation and UI.

### 2.3 Injury Risk Prediction Model
- **Current Code**: [backend/ml/injury_prediction/baseline_model.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/injury_prediction/baseline_model.py) and [training_pipeline.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/injury_prediction/training_pipeline.py).
- **Status**: **Uncalibrated Research Baseline / Heuristic Formula**.
  - The model calculates risk via hand-tuned linear combinations passed through a logistic sigmoid `_sigmoid(z) = 1 / (1 + exp(-z))`.
  - [training_pipeline.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/injury_prediction/training_pipeline.py) explicitly contains: `"Evaluation unavailable: labeled dataset not configured."`
- **Finding**: There was **NO** trained supervised machine learning model (no XGBoost, no Random Forest, no Logistic Regression fit to clinical ground truth) for injury outcome prediction.
- **Action Required (Phases 9-13)**:
  - Download authentic, published athletic injury datasets (Lövdal et al. competitive runner cohort, Swathikiran athlete workload/injury data).
  - Preprocess into `data/processed/injury_prediction_dataset.parquet`.
  - Train real supervised models (Logistic Regression, Random Forest, XGBoost) with subject-level splitting (`GroupKFold` on `Athlete ID`) to prevent data leakage.
  - Calibrate output probabilities (Platt scaling / isotonic).

### 2.4 Anomaly Detection
- **Current Code**: [backend/ml/anomaly_detection/anomaly_detector.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/anomaly_detection/anomaly_detector.py).
- **Status**: **Partially Functional**.
  - Implements statistical z-score thresholding and an `IsolationForest` pipeline for identifying biomechanical deviations.
- **Action Required**: Preserve and enhance anomaly scoring, linking detected deviations directly to movement phases and explainability outputs.

### 2.5 Risk Engine (Heuristic Screening Score)
- **Current Code**: [backend/ml/risk_engine.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/risk_engine.py).
- **Status**: **Functional Rule-Based Screening System**.
  - Weights: Biomechanical deviations (35%), Historical injury factors (20%), Movement asymmetry (20%), Training load (15%), Fatigue (10%).
- **Action Required (Phase 14)**: Retain this 5-factor weighting as the **Biomechanical Screening Risk Score** and clearly distinguish it from the **Supervised ML Injury Probability**.

### 2.6 Database Schemas & Persistence
- **Current Code**: [backend/models.py](file:///c:/Users/saketh/Msme_Backend/backend/models.py), [backend/database.py](file:///c:/Users/saketh/Msme_Backend/backend/database.py).
- **Status**: **Functional (SQLite + optional MongoDB)**.
- **Action Required (Phase 17)**: Add model metadata tracking fields (`pose_model_name`, `pose_model_version`, `ml_model_version`, `ml_injury_probability`, `calibrated_probability`, `screening_risk_score`) to ensure end-to-end reproducibility and auditability.

### 2.7 API Endpoints
- **Current Code**: [backend/routers/analysis_router.py](file:///c:/Users/saketh/Msme_Backend/backend/routers/analysis_router.py), [video_router.py](file:///c:/Users/saketh/Msme_Backend/backend/routers/video_router.py), [pose_router.py](file:///c:/Users/saketh/Msme_Backend/backend/routers/pose_router.py).
- **Status**: **Broadly functional**, but missing dedicated model catalog and dataset provenance endpoints (`GET /api/models`, `GET /api/datasets`, `GET /api/analysis/{id}/explainability`).
- **Action Required (Phase 18)**: Implement missing REST endpoints and verify frontend-backend contract consistency.

### 2.8 Frontend UI & Three.js Skeleton
- **Current Code**: [frontend/src/](file:///c:/Users/saketh/Msme_Backend/frontend/src/).
- **Status**: High-quality React 19 + Vite + Tailwind + Three.js application.
- **Finding**: Contains text claims asserting "RTMPose-M", "XGBoost", and "3D biomechanics" before those models were actually trained and integrated.
- **Action Required (Phase 19)**:
  - Harmonize UI claims with real system capabilities.
  - Present both Calibrated ML Injury Probability and Biomechanical Screening Risk Score side-by-side.
  - Retain Three.js skeleton visualization while clarifying that the 3D visualization is a spatial representation derived from calibrated 2D kinematic telemetry.

---

## 3. Pretrained Models Status

| Model Name | Claimed in Code/UI | Actual Implementation in Repo | Planned Upgrade (Option A) |
|---|---|---|---|
| **Pose Estimator** | RTMPose-M | Keypoint R-CNN ResNet50 FPN | Integrate native **RTMPose-M (ONNX)** with Keypoint R-CNN fallback |
| **Biomechanics Regressor** | Pose ML Model | RF Regressor on 30 images ([backend/ml/train_pose_model.py](file:///c:/Users/saketh/Msme_Backend/backend/ml/train_pose_model.py)) | Replace with verified kinematic algorithms |
| **Supervised Injury Model**| XGBoost / PyTorch | None (uncalibrated heuristic equation) | Train **Logistic Regression, Random Forest, XGBoost** on real longitudinal athlete cohorts |

---

## 4. Required Datasets

1. **Lövdal et al. (2021) Competitive Runners Longitudinal Dataset**: Real sports injury outcome labels for training supervised models.
2. **Swathikiran (2021) Athlete Workload & Injury Dataset**: Multi-metric workload, hip mobility, groin squeeze, and injury occurrence.
3. **IntelliRehabDS (IRDS) (Zenodo 4610859)**: 3D rehabilitation movements (squats, reaches, trunk bending) with clinical correctness annotations.
4. **Fukuchi et al. Running Biomechanics Dataset (RBDS)**: 3D kinematics and kinetics benchmark for running.
5. **Santos et al. Balance Evaluations Dataset (BDS/PDS)**: Balance and postural stability kinematics.

---

## 5. Audit Conclusion

The application infrastructure is fully viable for real ML operations. By downloading verified datasets, deploying real RTMPose-M ONNX weights, training real supervised ML models with subject-level splitting, and calibrating outputs, the system will achieve complete technical authenticity.
