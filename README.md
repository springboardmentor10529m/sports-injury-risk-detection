# Sports Injury Risk Detection Platform

A modern web application built to assess, monitor, and manage sports injury risk. It supports separate roles for Athletes (submitting profiles and uploading performance videos) and Experts (coaches, physiotherapists, and administrators viewing dashboards, writing notes, and analyzing uploaded videos).

---

## Key Features

### 1. Pose Estimation Engine
* Real-time skeletal landmark tracking using **MediaPipe Pose (BlazePose)**.
* Frame-by-frame joint extraction (shoulders, hips, knees, ankles) to compute ranges of motion.
* Fully containerized OpenCV pipeline with **FFMPEG re-encoding** (standardizing output to H.264 / `yuv420p` pixel format) to ensure immediate browser playback compatibility.
* Physics-based kinematic simulation fallback for local development environments lacking C++ solver libraries.

### 2. Biomechanical Metrics & Analysis
* **Knee Valgus Detection:** Medial knee collapse tracking relative to ankles and hips during deep movement phases.
* **Trunk Lean:** Forward-tilt measurements from mid-hip to mid-shoulder lines.
* **Lateral Hip Sway:** Stability index calculation using mid-hip lateral standard deviation.
* **Joint Symmetry:** Left-to-right Range of Motion (ROM) assessment for knee and hip flexion/extension.

### 3. Injury Risk Prediction & Weighted Scoring (Milestone 3)
* **Specific Injury Probabilities:** Supervised estimators mapping athlete history, training loads, and biomechanical deviations to forecast probability percentages for:
  * ACL Injury Risk
  * Hamstring Strain
  * Ankle Sprain
  * Shoulder Impingement
  * Lower Back Strain
* **Biomechanical Anomaly Index:** Anomaly deviation index calculated by comparing Joint ROM tables against standard baseline configurations from the **SportsPose** and **Human3.6M** reference datasets.
* **Weighted Scoring Model:**
  $$\text{Injury Risk} = 35\% \times \text{Biomech Deviations} + 20\% \times \text{History} + 20\% \times \text{Asymmetry} + 15\% \times \text{Training Load} + 10\% \times \text{Fatigue}$$
  * Score ranges between $1.0$ and $10.0$, classified into **Low**, **Moderate**, **High**, or **Critical** risk bands.

---

## Machine Learning Architecture (Datasets, Models, & Features)

The injury prediction and anomaly detection services utilize models trained on sports-specific profiles and biomechanics reference datasets.

### 1. Training & Baseline Datasets
* **FIFA Injury Dataset:** Used as the historical reference profile to model correlations between demographic features (age, weight, sport), training volumes, injury history, fatigue levels, and injury classifications.
* **SportsPose Dataset:** Contains standard Joint Range of Motion (ROM) references for athletic tasks (e.g. squatting, landing, jumping) to detect form deviations.
* **Human3.6M Dataset:** Provides baseline skeletal dimensions and keypoint configurations for body proportion tracking.

### 2. Feature Schema & Inputs
The Machine Learning models receive a structured feature vector extracted from the athlete profile and the pose analysis metrics:

| Feature Name | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| `left_knee_rom` | Float | Pose Engine | Left knee Range of Motion in degrees |
| `right_knee_rom` | Float | Pose Engine | Right knee Range of Motion in degrees |
| `left_hip_rom` | Float | Pose Engine | Left hip Range of Motion in degrees |
| `right_hip_rom` | Float | Pose Engine | Right hip Range of Motion in degrees |
| `knee_valgus_detected` | String | Pose Engine | Medial knee caving status (`Yes`, `No`, `Borderline`) |
| `symmetry_score` | Float | Pose Engine | Left-to-Right ROM symmetry percentage (0% - 100%) |
| `balance_score` | Float | Pose Engine | Lateral hip sway stability index (0.0 - 10.0) |
| `trunk_lean` | Float | Pose Engine | Maximum forward trunk lean angle in degrees |
| `age` | Integer | Athlete Profile | Athlete age in years |
| `weight` | Float | Athlete Profile | Athlete weight in kg |
| `sport` | String | Athlete Profile | Category of sport played (e.g. Football, Basketball, Soccer, Volleyball) |
| `position` | String | Athlete Profile | Athlete's role/player position |
| `training_load` | Float | Athlete Profile | Hours of training logged per week |
| `coach_notes` | Text | Athlete Profile | Text parsed for historical injury keywords (e.g. `acl`, `knee`, `sprain`, `tear`, `injury`) |

### 3. ML/Deep Learning Models Used
* **Biomechanical Anomaly Detection:** An **Isolation Forest** model (via `scikit-learn`) trained on standard ranges from the **SportsPose** and **Human3.6M** datasets. It processes ROM features to output an `anomaly_score` ($0.0 - 1.0$) indicating the severity of joint tracking deviations.
* **Injury Risk Classifiers:** Supervised **Random Forest and XGBoost** decision models trained on the combined feature schema. They compute separate probability scores ($0.0\% - 100.0\%$) for:
  * **ACL Injury**
  * **Hamstring Strain**
  * **Ankle Sprain**
  * **Shoulder Impingement**
  * **Lower Back Strain**

---

## Technical Stack
* **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Axios.
* **Backend:** FastAPI, Python 3.11, SQLAlchemy, Uvicorn, PostgreSQL (production/Docker) & SQLite (local development fallback).
* **Deployment:** Docker & Docker Compose.

---

## How to Run the Application

You can run the application in two ways: **Docker Compose (Recommended)** or **Locally (Development mode)**.

### Method 1: Running with Docker Compose (Recommended)
This runs the entire stack (PostgreSQL Database, FastAPI Backend, and React Frontend) inside Docker containers.

1. Make sure you have **Docker** and **Docker Compose** installed on your system.
2. Run the following command in the root folder of the project:
   ```bash
   docker compose up --build
   ```
3. Once running, you can access:
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Method 2: Running Locally (Without Docker)
To run the components individually for debugging or faster development, follow these steps:

#### 1. Backend Setup (FastAPI)
By default, running locally fallbacks to **SQLite** (a file named `sports_injury.db` will be created automatically).

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will be running at [http://localhost:8000](http://localhost:8000).*

#### 2. Frontend Setup (React & Vite)
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running at [http://localhost:5173](http://localhost:5173).*

---

## Verification Testing

You can verify the backend API workflows, database schemas, and ML prediction runs by executing the automated test client suites.

### Run Injury Prediction & Weighted Scoring Tests:
Execute the test client within the running backend container context:
```bash
docker exec sports_injury_backend python test_injury_prediction.py
```

### Run Biomechanical Assessment Tests:
```bash
docker exec sports_injury_backend python verify_endpoints.py
```