# Running Injury Clinic (RIC) Kinematic Dataset — Feature Mapping & ML Feasibility Analysis

## Executive Summary & Verdict

* **RIC Suitability**: **CONDITIONALLY READY**
* **Recommended Role**: Primary dataset for training the **Biomechanical Deviation (35%)** and **Movement Asymmetry (20%)** components of the Risk Scoring Engine.
* **Key Condition**: The dataset contains **concurrent/active injury status at clinic visit**, NOT prospective future injury outcomes. Therefore, ML models trained on RIC must be formulated and documented as **Movement Pattern & Biomechanical Risk Factor Classifiers**, NOT as prospective predictors of future injury events.

---

## 1. Dataset Overview

* **Source**: University of Calgary Running Injury Clinic (*Brett, Ferber, Fukuchi, Osis, & Hettinga, 2023*; DOI: `10.25452/figshare.plus.24255795.v1`).
* **Subjects**: $N = 1,798$ unique human subjects (1,402 in running protocol, 1,686 in walking protocol).
* **Collection Methodology**: 3D optical motion capture (3-camera or 8-camera Vicon system, 100-200 Hz) using 7-segment lower-body marker clusters during 25–60 second treadmill walking and running trials at self-selected speeds.
* **Files & Sizes**:
  * `README.txt` (0.01 MB): Protocol description, methods, and processing instructions.
  * `run_data_meta.csv` (0.35 MB): 1,832 collection sessions across 1,402 subjects.
  * `walk_data_meta.csv` (0.38 MB): 2,088 collection sessions across 1,686 subjects.
  * `Supplemental_materials.zip` (1.33 GB): MATLAB processing scripts (`gait_kinematics.m`, `gait_steps.m`) and 5 analysis tutorials.
  * `ric_data.zip` (21.7 GB): 2,506 raw JSON data files containing 3D marker coordinates and pre-computed descriptive variables (`dv_r`, `dv_w`).
* **Storage Requirements**:
  * Archive download: ~23.0 GB.
  * Uncompressed JSON + metadata: ~50–60 GB.
  * Extracted feature matrix (CSV/Parquet): ~50–100 MB.
  * **Git Status**: Excluded via `.gitignore` (`scratch/ric/` directory).

---

## 2. Injury-Label Analysis

### 2.1 Representation of Injury Status
Injury data in `run_data_meta.csv` and `walk_data_meta.csv` are structured across seven clinical metadata columns:

1. `InjDefn` (Severity / Functional Impact):
   * `No injury`: 659 sessions (36.0%)
   * `Training volume/intensity affected`: 499 sessions (27.2%)
   * `Continuing to train in pain`: 320 sessions (17.5%)
   * `2 workouts missed in a row`: 274 sessions (15.0%)
   * Missing / Unspecified: 80 sessions (4.4%)
2. `InjJoint` (Anatomical Location): `Knee` (348 running / 659 walking), `Lower Leg` (185), `Thigh` (181), `Foot` (141), `Hip/Pelvis` (136), `Ankle` (107), `Lumbar Spine` (41).
3. `SpecInjury` (Clinical Diagnosis): Patellofemoral Pain Syndrome (PFPS), ITB Syndrome (ITBS), Achilles Tendinopathy, Plantar Fasciitis, Calf Strain, Shin Splints, Knee/Hip Osteoarthritis (OA).
4. `InjDuration`: Duration of current injury symptoms in days.
5. `InjSide`, `InjJoint2`, `InjSide2`, `SpecInjury2`: Injury laterality and secondary injury diagnosis.

### 2.2 Critical Distinction: Concurrent vs. Prospective Labels
* **Labels are CONCURRENT / ACTIVE CLINICAL INJURIES**: Subjects were evaluated at the Running Injury Clinic while actively seeking treatment or serving as healthy controls.
* **NOT Prospective Event Labels**: RIC does NOT track healthy runners over 6–12 months to observe future injury incidence.

### 2.3 Confounding & Data Leakage Risks
* **Reverse Causality / Antalgic Adaptation**: Kinematic deviations observed during active pain (e.g., reduced peak knee flexion, reduced stride length, altered foot strike) may be **reflections of current pain avoidance (antalgic gait)** rather than pre-existing causal risk factors for future injury.
* **Leakage Mitigation Strategy**: ML models trained on RIC must be explicitly framed as **Movement Pattern & Biomechanical Deviation Classifiers** (discriminating abnormal/antalgic gait from healthy baselines), which map directly to the **Biomechanical Deviations (35%)** and **Movement Asymmetry (20%)** components of our mentor's Risk Scoring Engine.

---

## 3. Evaluation Against the 5-Factor Risk Scoring Engine

Our project architecture uses a multi-factor **Risk Scoring Engine** composed of five weighted components:

$$\text{Overall Risk Score} = 0.35 \cdot S_{\text{bio}} + 0.20 \cdot S_{\text{hist}} + 0.20 \cdot S_{\text{asym}} + 0.15 \cdot S_{\text{load}} + 0.10 \cdot S_{\text{fatigue}}$$

| Engine Component | Weight | RIC Dataset Support | Implementation Source |
| :--- | :---: | :--- | :--- |
| **Biomechanical Deviations ($S_{\text{bio}}$)** | **35%** | **HIGH**: Contains 3D joint angles (knee, hip, ankle, trunk), ROM, peak angles, and kinematic velocities. | **RIC Dataset + MediaPipe `FeatureExtractor`** |
| **Historical Injury Factors ($S_{\text{hist}}$)** | **20%** | **PARTIAL**: Records current injury duration and secondary location, but lacks past 24-month medical history. | **Athlete Profile Log / Survey Input** |
| **Movement Asymmetry ($S_{\text{asym}}$)** | **20%** | **HIGH**: L/R bilateral kinematic metrics allow exact calculation of Limb Symmetry Indices. | **RIC Dataset + MediaPipe `FeatureExtractor`** |
| **Training Load ($S_{\text{load}}$)** | **15%** | **LOW**: Contains `YrsRunning`, `NumRaces`, `RaceDistance`, but lacks acute/chronic workload ratio (ACWR). | **Athlete Activity Tracker / Profile Input** |
| **Fatigue ($10\%$)** | **10%** | **NONE**: Treadmill trials are 25–60s steady-state, non-fatiguing protocols. | **Session Borg RPE / Fatigue Self-Report** |

---

## 4. Feature Mapping Table

The following table maps RIC dataset variables directly to our existing [`FeatureExtractor`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/services/feature_extractor.py) features:

| RIC Variable | Meaning | Our Feature (`FeatureExtractor`) | Mapping Type | Required Transformation |
| :--- | :--- | :--- | :--- | :--- |
| `peak_knee_flexion` | Peak knee flexion angle in stance | `knee_angle_left_max`, `knee_angle_right_max` | **Direct** | Convert 3D interior angle to sagittal flexion angle. |
| `knee_rom` | Knee Range of Motion | `knee_angle_left_rom`, `knee_angle_right_rom` | **Direct** | Identical calculation (`max - min`). |
| `hip_flexion` | Hip flexion angle | `hip_angle_left_mean`, `hip_angle_left_rom` | **Derived** | Calculate shoulder-hip-knee 3D angle relative to trunk vector. |
| `ankle_flexion` | Ankle dorsi/plantar flexion | `ankle_angle_left_mean`, `ankle_angle_left_rom` | **Derived** | Calculate knee-ankle-foot index 3D angle. |
| `trunk_lean` | Trunk forward inclination | `trunk_angle_mean`, `trunk_angle_max` | **Direct** | Trunk vector relative to vertical image vector. |
| `step_width` | Transverse distance between feet | `stance_width_ratio` (LESS Item 7/8) | **Derived** | Scale pixel distance by shoulder width / torso length. |
| `stride_rate` / cadence | Steps per minute | `mean_joint_velocity`, peak cadence | **Derived** | Peak detection on vertical ankle/foot trajectory over time. |
| `joint_velocity` | Speed of joint movement | `max_joint_velocity`, `mean_joint_velocity` | **Direct** | Time derivative of mid-hip coordinates. |
| `joint_displacement` | Path length of mid-hip | `total_joint_displacement` | **Direct** | Euclidean path length of mid-hip center. |
| `knee_symmetry` | L/R Knee ROM symmetry | `knee_symmetry_score` | **Direct** | Identical formula: $100 \times \left(1 - \frac{\|L - R\|}{\max(L, R)}\right)$. |
| `hip_symmetry` | L/R Hip ROM symmetry | `hip_symmetry_score` | **Direct** | Identical symmetry formula. |
| `ankle_symmetry` | L/R Ankle ROM symmetry | `ankle_symmetry_score` | **Direct** | Identical symmetry formula. |
| `age` | Subject age | Athlete Profile `age` | **Direct** | Database record mapping. |
| `Height` | Subject height (cm) | Athlete Profile `height` | **Direct** | Database record mapping. |
| `Weight` | Subject weight (kg) | Athlete Profile `weight` | **Direct** | Database record mapping. |
| `Gender` | Subject sex | Athlete/User Profile | **Direct** | Database record mapping. |
| `DominantLeg` | Preferred leg | Athlete Profile | **Direct** | Database record mapping. |
| `3D Vicon Coordinates` | 3D lab optical motion capture | MediaPipe 33 Landmark Coordinates | **Proxy** | RGB single-camera pose vs 3D optical MoCap. Scale normalization required. |
| `Ground Reaction Force` | Force plate kinetics | None | **Unavailable** | Cannot be measured directly from single-camera RGB video. |
| `Subtalar Eversion` | Rearfoot rotation | None | **Unavailable** | Single-camera RGB pose lacks resolution for subtalar rotation. |

---

## 5. Required Feature Engineering & Transformations

1. **Torso-Length Scale Normalization**: MediaPipe landmarks are normalized `(x, y)` image coordinates and relative depth `z`. Spatial metrics (displacement, stance width) must be normalized by torso length (mid-shoulder to mid-hip) or athlete height to achieve scale invariance matching physical Vicon meters.
2. **Phase-Aligned Event Extraction**: Extract peak knee flexion, initial contact angle, and stance ROM by detecting local extrema in ankle vertical displacement (`y`) and knee interior angle over frame sequences.
3. **Diagnostic Label Standardization**: Map raw RIC `SpecInjury` text strings into 4 consolidated diagnostic classes:
   * `0`: Healthy Control (`No injury`)
   * `1`: Knee Disorders (`PFPS`, `Knee OA`, `Patellar tendinopathy`)
   * `2`: Overuse Tendinopathies / Lateral (`ITBS`, `Achilles tendonitis`, `Plantar fasciitis`)
   * `3`: Lower Leg / Shin (`Shin splints`, `Calf strain`)

---

## 6. Project Inspection & Required Changes

* **Files Inspected**:
  * [`backend/app/models/analysis_feature.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/models/analysis_feature.py)
  * [`backend/app/services/feature_extractor.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/services/feature_extractor.py)
  * [`backend/app/services/analysis_pipeline.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/services/analysis_pipeline.py)
  * [`backend/app/services/less_scorer.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/services/less_scorer.py)
  * [`backend/app/services/video_processor.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/services/video_processor.py)
  * [`backend/app/models/analysis_less.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/models/analysis_less.py)
  * [`backend/app/api/videos.py`](file:///c:/Users/Welcome/sports-injury-risk-detection/backend/app/api/videos.py)
  * [`frontend/src/pages/VideoAnalysis.jsx`](file:///c:/Users/Welcome/sports-injury-risk-detection/frontend/src/pages/VideoAnalysis.jsx)
* **Dataset Files Inspected**:
  * `scratch/ric/README.txt`
  * `scratch/ric/run_data_meta.csv`
  * `scratch/ric/walk_data_meta.csv`
* **Scripts / Commands Used**:
  * Figshare API Query: `https://api.figshare.com/v2/articles/24255795`
  * Python standard library `csv` & `urllib.request` analysis scripts in `scratch/`
* **Required Code Base Changes**: **NONE**. The current `FeatureExtractor` (`v1` schema) and `AnalysisFeature` database table already extract and store 21 of the 23 key kinematic metrics needed from RIC without modifying production code or database schemas.

---

## 7. Recommended Next Implementation Step

1. **Create an ML Dataset Preprocessing Script** in `scripts/prepare_ric_dataset.py` (kept out of production pipeline) to parse `run_data_meta.csv`, extract `dv_r` descriptive features, perform scale normalization, and output a clean `ric_ml_features.parquet` dataset.
2. **Train a Baseline Biomechanical Classifier** (e.g., Random Forest or XGBoost) to predict `Biomechanically Abnormal Gait / Injury Category` using features compatible with our `FeatureExtractor`.
3. **Integrate Model Outputs into the 5-Factor Risk Scoring Engine** to calculate $S_{\text{bio}}$ (35%) and $S_{\text{asym}}$ (20%), combining them with historical injury and load scores.
