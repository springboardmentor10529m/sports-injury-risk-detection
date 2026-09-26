# Sports Injury Risk Detection Platform
## Automated Testing & Verification Guide

---

### Table of Contents
1. [Test Architecture & Overview](#1-test-architecture--overview)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Test Suite Catalog](#3-test-suite-catalog)
   - [3.1 Integration Test: Extended Modules (`test_extended_modules.py`)](#31-integration-test-extended-modules-test_extended_modulespy)
   - [3.2 ML & Risk Forecasting Test: `test_injury_prediction.py`](#32-ml--risk-forecasting-test-test_injury_predictionpy)
   - [3.3 Computer Vision & Pose Test: `test_pose_estimation.py`](#33-computer-vision--pose-test-test_pose_estimationpy)
   - [3.4 Network & Live Server HTTP Test: `test_network_endpoints.py`](#34-network--live-server-http-test-test_network_endpointspy)
   - [3.5 Multi-Role Endpoint Verifier: `verify_endpoints.py`](#35-multi-role-endpoint-verifier-verify_endpointspy)
4. [Running the Test Suites](#4-running-the-test-suites)
5. [Continuous Integration & Automated Checks](#5-continuous-integration--automated-checks)

---

## 1. Test Architecture & Overview

The platform includes a test suite combining unit tests, mathematical validation tests, end-to-end integration workflows, and live HTTP endpoint verifiers.

```
                      [ Automated Test Suites ]
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    ▼                             ▼                             ▼
[ test_pose_estimation.py ] [ test_injury_prediction.py ] [ test_extended_modules.py ]
BlazePose landmarks,        Kinematics, 5-factor scoring,  Multi-role RBAC,
joint angles & valgus       Isolation Forest anomaly       recommendations, alerts
    │                             │                             │
    └─────────────────────────────┼─────────────────────────────┘
                                  ▼
                   [ test_network_endpoints.py ]
                   [   verify_endpoints.py     ]
                   Live server HTTP responses &
                   FastAPI endpoint regression
```

---

## 2. Prerequisites & Environment Setup

Ensure the backend virtual environment is active and all test dependencies (`pytest`, `requests`, `httpx`) are installed:

```bash
cd /Users/thalladaakhilkumar/Sports/backend
source .venv/bin/activate
pip install pytest httpx requests
```

---

## 3. Test Suite Catalog

### 3.1 Integration Test: Extended Modules (`test_extended_modules.py`)
Validates role-based authorization, exercise recommendations, notification dispatch, and administrative telemetry.
- **Coverage:**
  - Multi-user authentication (`Athlete`, `Sports Scientist`, `Admin`).
  - Exercise library catalog fetching (`GET /api/recommendations/library`).
  - Automated prescription generation (`POST /api/recommendations/athlete/{id}/generate`).
  - Recommendation completion toggle (`PUT /api/recommendations/{id}/toggle`).
  - Notification generation and read state updates.
  - Clinical report generation (`GET /api/reports/athlete/{id}/summary`) and CSV export.
  - Longitudinal biomechanics export (`GET /api/reports/biometrics/research`).
  - Admin telemetry query (`GET /api/admin/metrics`) and user role updates (`PUT /api/admin/users/{id}/role`).

---

### 3.2 ML & Risk Forecasting Test: `test_injury_prediction.py`
Simulates the machine learning prediction pipeline on an analyzed video record.
- **Coverage:**
  - Database fixture setup (Athlete profile + BiomechanicsAnalysis).
  - Validation of joint Range of Motion (ROM) extraction from JSON payloads.
  - Calculation of Anomaly Deviation Index against normative SportsPose baselines.
  - Calculation of ACL, Hamstring, Ankle, Shoulder, and Back risk probabilities.
  - Assertion of 5-factor weighted score decomposition ($F_{\text{kinematics}} + F_{\text{load}} + F_{\text{asymmetry}} + F_{\text{velocity}} + F_{\text{prior}}$).
  - Category thresholds (`Low`, `Moderate`, `High`, `Critical`).

---

### 3.3 Computer Vision & Pose Test: `test_pose_estimation.py`
Validates 3D landmark geometric calculations and frame annotation logic.
- **Coverage:**
  - Mathematical 3D dot-product angle calculation function `calculate_angle(a, b, c)`.
  - Orthogonal ($90^\circ$), linear ($180^\circ$), and acute angle checks.
  - Resolution-adaptive skeleton rendering onto sample video frames (`draw_annotated_skeleton_frame`).
  - Fallback logic when external MediaPipe tasks/solutions binaries are missing.

---

### 3.4 Network & Live Server HTTP Test: `test_network_endpoints.py`
Executes real HTTP requests against a live, running FastAPI server instance (`http://localhost:8000`).
- **Coverage:**
  - Health probe at root `/`.
  - Swagger documentation `/docs` and OpenAPI schema `/openapi.json`.
  - Static video upload file serving `/uploads/`.
  - JWT token issuance via `/api/auth/login`.
  - CORS header validation (`Access-Control-Allow-Origin: *`).

---

### 3.5 Multi-Role Endpoint Verifier: `verify_endpoints.py`
Comprehensive script exercising all API routes sequentially across multiple user sessions.
- **Coverage:**
  - Registers unique testing accounts.
  - Tests role guards ensuring Athletes cannot access Admin/Coach routes.
  - Tests file upload with multipart video data.
  - Verifies streaming CSV responses for team matrices and research datasets.

---

## 4. Running the Test Suites

### Running All Unit and Integration Tests via Pytest
```bash
cd /Users/thalladaakhilkumar/Sports/backend
python -m pytest test_pose_estimation.py test_injury_prediction.py test_extended_modules.py -v
```

### Running Individual Test Scripts Directly
```bash
# Test 1: Pose estimation and 3D angle geometry
python test_pose_estimation.py

# Test 2: ML prediction and risk scoring decomposition
python test_injury_prediction.py

# Test 3: Extended multi-module integration
python test_extended_modules.py
```

### Running Live Network Endpoint Verification
Ensure the backend server is active (`http://localhost:8000`), then run:
```bash
# Verify live HTTP responses and CORS
python test_network_endpoints.py

# Run comprehensive multi-role endpoint suite
python verify_endpoints.py
```

---

## 5. Continuous Integration & Automated Checks

For GitHub Actions or GitLab CI/CD pipelines, integrate the test execution workflow:

```yaml
name: Test Backend & ML Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python 3.11
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install System Dependencies (FFMPEG)
        run: sudo apt-get update && sudo apt-get install -y ffmpeg
        
      - name: Install Python Dependencies
        run: |
          cd backend
          pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest httpx requests
          
      - name: Run Test Suites
        run: |
          cd backend
          python test_pose_estimation.py
          python test_injury_prediction.py
          python test_extended_modules.py
```
