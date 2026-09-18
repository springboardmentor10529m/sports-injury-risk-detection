# AthleteGuard: AI Sports Biomechanics & Injury Prevention Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-Calibrated%20ML-EB5424?style=flat)](https://xgboost.readthedocs.io)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **IMPORTANT MEDICAL & REGULATORY DISCLAIMER**  
> *AthleteGuard provides AI-assisted video biomechanical screening and injury-risk estimation. It is strictly an informational and athletic performance screening tool, NOT a medical device or clinical diagnostic system. No clinical diagnosis or medical prescription is provided.*

---

## 🌟 Platform Highlights

AthleteGuard is an enterprise-grade biomechanical movement analysis and injury risk prevention system engineered for athletic organizations, sports scientists, physical therapists, coaches, and athletes.

```
+----------------------------------------------------------------------------------------------------+
|                                    ATHLETEGUARD SYSTEM SUITE                                       |
+------------------------------------+----------------------------------+----------------------------+
| 🎥 Computer Vision & 3D Kinematics | 🧠 Dual Intelligence AI Engine   | 📊 Clinical Intelligence   |
| • RTMPose-M 17-Keypoint Tracker    | • Platt-Calibrated Supervised ML | • ACWR Workload Monitoring |
| • 60 FPS WebGL 3D Reconstruction   | • 5-Factor Clinical Screening    | • Clinical Injury Registry |
| • Normalization & Depth Physics    | • Isolation Forest Anomaly Det.  | • Multi-Page PDF & Excel   |
| • Orbit / Coronal / Sagittal Views | • SHAP & Risk Attribution        | • Role-Based Dashboards    |
+------------------------------------+----------------------------------+----------------------------+
```

### 1. 🏃 Interactive 3D Kinematic Pose Reconstruction Studio
- **High-Performance WebGL Engine**: Powered by Three.js and React Three Fiber, rendering physiological skeletons with anatomical bone constraints and depth.
- **60 FPS Animation Loop**: Silky smooth movement playback via hardware-accelerated `requestAnimationFrame` with temporal interpolation.
- **Interactive Scrubber Timeline**: Scrub freely across frames, pinpoint movement anomalies marked with color-coded severity badges, and toggle auto-looping.
- **Frame-by-Frame Precision Stepper**: Step through movement sequences with single-frame stepping (`◀ -1 Frame` / `+1 Frame ▶`) and speed controls ($0.25\times, 0.5\times, 1.0\times, 1.5\times$).
- **Multi-Angle Camera Presets**: Instantly toggle between **3D Orbit**, **Frontal (Coronal)**, and **Lateral (Sagittal)** perspectives to assess knee valgus, pelvic tilt, and trunk flexion.
- **Dynamic Resolution Normalization**: Auto-centers any video aspect ratio to coordinate $(0, 0, 0)$ with standard 1.62m anatomical height.
- **Live Joint Angle Telemetry**: Visualizes real-time degrees for bilateral knee flexion, valgus deviation, hip stability, and trunk lean.

### 2. 🧠 Dual Intelligence Risk Engine
AthleteGuard bridges cutting-edge data science with proven sports medicine practices:
- **Calibrated Supervised Machine Learning**: Gradient-boosted classifiers (XGBoost / LightGBM) trained on temporal biomechanical aggregates and calibrated with Platt scaling (`CalibratedClassifierCV`) to output well-calibrated injury risk probabilities ($0.0 - 1.0$).
- **5-Factor Clinical Screening Formula**:
  - **Biomechanical Deviations (35%)**: Dynamic knee valgus collapse, trunk flexion/tilt, pelvic drop.
  - **Historical Injury Factors (20%)**: Previous injuries, anatomical sites, severity grading, recovery status.
  - **Bilateral Movement Asymmetry (20%)**: Left vs. right discrepancy in knee flexion, hip angle, and ankle dorsiflexion.
  - **Acute:Chronic Workload Ratio (15%)**: ACWR monitoring to detect overtraining spikes and fatigue vulnerability.
  - **Fatigue Drift Indicators (10%)**: Temporal trend degradation over repetition sequences.
- **Unsupervised Anomaly Detection**: Isolation Forest identifies abnormal movement outliers frame-by-frame with biomechanical root-cause attribution.

### 3. 🏥 Clinical Injury History Registry & Workload Engine
- **Injury History Logging**: Track past injuries by anatomical region (knee, hamstring, ankle, shoulder, lumbar), severity (Mild, Moderate, Severe), and recovery stage.
- **Dynamic Risk Recalibration**: The risk engine dynamically increases vulnerability weightings for athletes returning from severe or unresolved injuries.
- **ACWR Monitoring**: Tracks Acute (7-day) vs. Chronic (28-day) workload ratios, highlighting safe zones ($0.8 - 1.3$) vs. dangerous injury spike zones ($>1.5$).

### 4. 🔐 Universal Authentication & Enterprise RBAC
- **Multi-Identifier Login**: Authenticate seamlessly using standard Email, Username, or Athlete ID (`saketh`, `saketh1`, `saketh@example.com`).
- **Google OAuth 2.0 Single Sign-On**: One-click authentication with organizational Google accounts.
- **5 Specialized Role Dashboards**: Custom views and permissions for **Athlete**, **Coach**, **Physiotherapist**, **Sports Scientist**, and **System Administrator**.

---

## 📖 Complete Documentation Portal

Detailed technical documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|---|---|
| 🏗️ [**System Architecture**](docs/ARCHITECTURE.md) | High-level system design, 3D kinematics pipeline, dual intelligence engine & RBAC |
| 🔌 [**API Documentation**](docs/API_DOCUMENTATION.md) | Complete OpenAPI/REST endpoint specifications, request/response models & schemas |
| 🗄️ [**Database Schema Specification**](docs/DATABASE_SCHEMA.md) | PostgreSQL relational tables & MongoDB pose collections |
| 🏃 [**Pose & Biomechanics Pipeline**](docs/POSE_PIPELINE.md) | RTMPose-M keypoint detection, 20 biomechanical metrics & temporal aggregation |
| 🏷️ [**Model Card & Evaluation**](docs/MODEL_CARD.md) | Model architecture, performance metrics, training data, and clinical validation |
| ⚠️ [**ML Data Limitations**](docs/ML_DATA_LIMITATIONS.md) | Limitations, bias considerations, edge cases, and safety bounds |
| 🐳 [**Deployment & Operations Guide**](docs/DEPLOYMENT_GUIDE.md) | Production Docker Compose, Nginx reverse proxy, and environment configuration |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 19, Vite, Three.js, React Three Fiber, Tailwind CSS, Chart.js, Lucide Icons |
| **Backend API** | FastAPI (Python 3.11), Uvicorn, SQLAlchemy, Pydantic v2, PyJWT, PassLib |
| **Computer Vision & Pose** | RTMPose-M, OpenCV, ONNX Runtime, MediaPipe, NumPy, SciPy |
| **Machine Learning** | XGBoost, Scikit-Learn, Isolation Forest, Platt Calibrator (`CalibratedClassifierCV`) |
| **Databases** | PostgreSQL 16 (Relational Core), MongoDB 7.0 (Keypoints & Logs), SQLite (Dev) |
| **Reporting & Export** | ReportLab (Clinical PDF Generation), OpenPyXL (Multi-sheet Excel Workbooks) |
| **DevOps & Infrastructure** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended for Production)

1. **Clone repository**:
   ```bash
   git clone https://github.com/springboardmentor10529m/sports-injury-risk-detection.git
   cd sports-injury-risk-detection
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Launch containerized stack**:
   ```bash
   docker compose up --build -d
   ```

4. **Access endpoints**:
   - **Frontend Web Application**: [http://localhost](http://localhost)
   - **FastAPI REST API**: [http://localhost:8000](http://localhost:8000)
   - **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL**: `localhost:5432`
   - **MongoDB**: `localhost:27017`

---

### Option 2: Local Development Setup

#### Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

#### Frontend Setup (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Validation

```bash
# Run backend test suite
cd backend
pytest tests/ -v

# Run ML dataset pipeline validation
pytest tests/test_ml_dataset_pipeline.py -v

# Run frontend production build validation
cd ../frontend
npm run build
```

---

## 📄 License & Ethical Usage

AthleteGuard is distributed under the [MIT License](LICENSE).  
Usage of this software implies acknowledgment of the **Medical & Regulatory Disclaimer**: This platform is designed solely for athletic screening and biomechanical movement analysis, and should not be used as a substitute for certified medical diagnosis or physical therapy prescriptions.