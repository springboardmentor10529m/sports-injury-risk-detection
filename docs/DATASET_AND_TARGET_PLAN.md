# Dataset and Target Variable Plan

## 1. Purpose

The Sports Injury Risk Detection Platform analyzes athlete movement videos using computer vision, pose estimation, biomechanical analysis, and predictive analytics.

According to the project requirements, the AI/ML pipeline is intended to perform:

Video Upload
→ Pose Estimation
→ Keypoint and Joint Tracking
→ Biomechanical Feature Extraction
→ Movement Analysis
→ Injury Risk Prediction
→ Risk Score Calculation
→ Risk Classification
→ Corrective Recommendations

The purpose of this document is to define:

- The type of datasets required
- The features extracted from athlete movement
- The target variable used for prediction
- The proposed injury risk classification approach
- The relationship between video analysis and machine learning

---

# 2. Dataset Requirements

A single dataset may not contain all the information required for the complete system.

The project requires data for different stages:

1. Human pose estimation
2. Sports movement analysis
3. Biomechanical feature extraction
4. Injury risk prediction or classification

Therefore, the proposed implementation may use multiple datasets for different stages of the AI/ML pipeline.

---

# 3. Proposed Dataset Categories

## 3.1 Human Pose Estimation Dataset

Human pose estimation datasets can be used to support the detection of human body keypoints.

The required keypoints include:

- Shoulder
- Elbow
- Wrist
- Hip
- Knee
- Ankle
- Foot

Possible datasets for pose estimation research include:

- COCO Keypoints Dataset
- MPII Human Pose Dataset
- Human3.6M Dataset

These datasets are mainly useful for human pose and body keypoint estimation.

They are not automatically injury-risk datasets.

---

## 3.2 Sports Movement and Biomechanics Data

The project requires athlete movement information for biomechanical analysis.

Relevant movement data may support analysis of:

- Running
- Sprinting
- Jumping
- Landing
- Squatting
- Cutting movements
- Sport-specific drills

Possible data sources for this stage include sports movement, motion capture, or biomechanics datasets.

The purpose of this data is to study:

- Body movement
- Joint positions
- Movement patterns
- Range of motion
- Symmetry
- Joint alignment

---

## 3.3 Injury and Risk Data

For the injury risk prediction stage, the dataset must contain a meaningful target variable.

Possible target information may include:

- Injury status
- Injury history
- Injury type
- Risk category
- Normal or abnormal movement

The final dataset selection must be based on whether valid labels are actually available.

No injury labels should be artificially claimed if the selected dataset does not contain them.

---

# 4. Video Input to Feature Extraction Pipeline

The proposed system workflow is:

Athlete Video
↓
Video Validation
↓
Frame Extraction / Frame Sampling
↓
Pose Estimation
↓
Body Landmark Detection
↓
Keypoint Tracking
↓
Joint Angle Calculation
↓
Biomechanical Feature Extraction
↓
Feature Vector
↓
Risk Prediction Model

The uploaded video is therefore not directly treated as a simple injury label.

The video is first converted into meaningful movement and biomechanical features.

---

# 5. Features Extracted from Athlete Videos

The proposed system will extract relevant biomechanical and movement features.

## 5.1 Joint Coordinates

Pose estimation provides body landmark coordinates.

Examples include:

- Left shoulder coordinates
- Right shoulder coordinates
- Left hip coordinates
- Right hip coordinates
- Left knee coordinates
- Right knee coordinates
- Left ankle coordinates
- Right ankle coordinates

These coordinates are used as the base for further biomechanical analysis.

---

## 5.2 Joint Angles

Joint angles are calculated using three relevant body landmarks.

For example:

Hip → Knee → Ankle

can be used to calculate the knee angle.

Other important angles may include:

- Knee angle
- Hip angle
- Shoulder angle
- Elbow angle
- Ankle angle

The project will prioritize the angles relevant to the selected athlete movement and injury-risk analysis.

---

## 5.3 Range of Motion

Range of Motion (ROM) represents how much a joint moves during an activity.

For example:

Maximum Knee Angle - Minimum Knee Angle

can be used to estimate the range of knee movement during the analyzed activity.

ROM can help identify:

- Restricted movement
- Excessive movement
- Differences between body sides

---

## 5.4 Movement Symmetry

Movement symmetry compares the left and right sides of the body.

Examples include:

- Left knee angle vs Right knee angle
- Left hip movement vs Right hip movement
- Left and right range of motion

Significant asymmetry may indicate an abnormal movement pattern or possible biomechanical imbalance.

---

## 5.5 Biomechanical Features

Based on the project requirements, the system may analyze:

- Knee valgus
- Hip stability
- Trunk lean
- Landing mechanics
- Stride length
- Joint alignment
- Balance metrics
- Movement symmetry
- Range of motion

These features are used to evaluate movement quality and identify possible injury-risk factors.

---

# 6. Feature Vector

After extracting biomechanical information from the video, the information can be converted into a numerical feature vector.

Example:

| Feature | Example Value |
|---|---:|
| Average Knee Angle | Numerical value |
| Maximum Knee Angle | Numerical value |
| Minimum Knee Angle | Numerical value |
| Knee Range of Motion | Numerical value |
| Hip Stability Score | Numerical value |
| Trunk Lean | Numerical value |
| Movement Symmetry Score | Numerical value |
| Knee Alignment Measurement | Numerical value |
| Landing Mechanics Score | Numerical value |
| Balance Metric | Numerical value |

The exact features used for training will depend on the selected dataset and available labels.

---

# 7. Target Variable

## What is a Target Variable?

In machine learning, the target variable is the output that the model is trained to predict.

For this project:

### Input

The input consists of biomechanical and movement-related features extracted from athlete videos.

Examples:

- Joint angles
- Range of motion
- Movement symmetry
- Knee alignment
- Hip stability
- Trunk lean
- Landing mechanics
- Balance metrics
- Training load indicators
- Injury history
- Fatigue indicators

### Target

The target depends on the labels available in the selected training dataset.

Possible target variables include:

- Injury Risk Category
- Injury / No Injury
- Normal / Abnormal Movement
- Specific Injury Category, if valid labels are available

---

# 8. Proposed Risk Classification

The project description defines the following risk categories:

- Low Risk
- Moderate Risk
- High Risk
- Critical Risk

Therefore, the proposed final output classification is:

| Risk Class | Meaning |
|---|---|
| Low Risk | Movement shows relatively low identified risk factors |
| Moderate Risk | Some biomechanical or movement-related risk factors are detected |
| High Risk | Significant risk factors or abnormal movement patterns are detected |
| Critical Risk | Multiple or severe risk factors require immediate attention and professional evaluation |

The exact method used to assign these labels must depend on the available dataset labels or a clearly documented risk-scoring approach.

---

# 9. Injury Risk Score

The project description proposes a weighted injury risk scoring model based on:

- Biomechanical Deviations – 35%
- Historical Injury Factors – 20%
- Movement Asymmetry – 20%
- Training Load Indicators – 15%
- Fatigue Indicators – 10%

The proposed overall calculation is:

Injury Risk Score =
(Biomechanical Score × 0.35)
+ (Historical Injury Score × 0.20)
+ (Movement Asymmetry Score × 0.20)
+ (Training Load Score × 0.15)
+ (Fatigue Score × 0.10)

The final score can then be mapped to the project-defined risk categories.

The exact numerical thresholds should be finalized and documented during model validation.

---

# 10. Relationship Between Risk Score and Classification

The system will produce two related outputs:

## 10.1 Risk Score

A numerical representation of the athlete's estimated injury risk based on the selected scoring or prediction method.

## 10.2 Risk Classification

The numerical or model-based result is converted into one of the following categories:

- Low Risk
- Moderate Risk
- High Risk
- Critical Risk

The risk score provides a quantitative estimate, while the classification provides an easier interpretation for the athlete and other users.

---

# 11. Proposed Machine Learning Approach

The initial AI/ML implementation will use extracted biomechanical features rather than directly training a complex model on raw video.

The proposed pipeline is:

Video
↓
Pose Estimation
↓
Joint and Landmark Tracking
↓
Biomechanical Feature Extraction
↓
Feature Dataset
↓
Machine Learning Model
↓
Risk Prediction

For tabular biomechanical features, suitable models to evaluate include:

- Logistic Regression as a baseline
- Random Forest
- Support Vector Machine
- Gradient Boosting / XGBoost, if appropriate

The final model should be selected after evaluating the available dataset.

Evaluation may include:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix

The model should not be selected only because it is advanced. The selected model must be appropriate for the available data.

---

# 12. Dataset Labeling Strategy

Three possible scenarios must be distinguished.

## Scenario 1: Dataset Contains Injury Labels

If the selected dataset contains valid injury or risk labels:

Features
→ Machine Learning Model
→ Existing Dataset Label

The existing labels can be used as the target variable after appropriate preprocessing.

---

## Scenario 2: Dataset Contains Normal and Abnormal Movement Labels

If the dataset contains normal and abnormal movement labels:

Features
→ Classification Model
→ Normal / Abnormal Movement

This can initially support movement-risk detection.

A later risk scoring layer can combine abnormal movement results with other project factors.

---

## Scenario 3: Dataset Has No Injury Labels

If the dataset only provides pose or movement data, injury labels must not be invented.

Instead, the dataset can be used for:

- Pose estimation
- Keypoint extraction
- Joint angle calculation
- Biomechanical analysis

A separate labeled dataset or a clearly documented rule-based prototype will be required for injury-risk classification.

---

# 13. Proposed End-to-End Training Plan

## Step 1: Dataset Selection

Select datasets according to the required stage:

- Pose estimation data
- Sports movement data
- Biomechanics data
- Injury or risk labels

## Step 2: Data Preprocessing

Perform:

- Data cleaning
- Missing value handling
- Feature normalization if required
- Label validation
- Dataset splitting

## Step 3: Feature Engineering

Generate relevant features such as:

- Joint angles
- Range of motion
- Symmetry measurements
- Movement stability indicators
- Alignment-related features

## Step 4: Target Preparation

Use the actual available dataset labels.

Do not fabricate injury labels.

If a rule-based prototype is required, clearly document that the risk label is derived from defined biomechanical and project scoring rules.

## Step 5: Model Training

Train baseline and candidate models.

## Step 6: Model Evaluation

Compare model performance using suitable evaluation metrics.

## Step 7: Model Selection

Select the model with the most appropriate performance and reliability for the available dataset.

## Step 8: Backend Integration

The final model pipeline will receive extracted features and return:

- Risk prediction
- Risk classification
- Relevant contributing factors
- Recommendation category

---

# 14. Recommendation Generation

After risk analysis, the system will generate recommendations based on:

Detected Movement Issue
↓
Biomechanical Analysis
↓
Risk Score
↓
Risk Classification
↓
Recommendation

Possible recommendation categories include:

- Improve movement technique
- Mobility improvement
- Strengthening exercises
- Training modification
- Recovery planning
- Reduced training load
- Professional evaluation for high or critical risk cases

The recommendations are intended as supportive guidance and should not be presented as a medical diagnosis.

---

# 15. Final Proposed AI/ML Workflow

The proposed workflow is:

Athlete Uploads Video
↓
Video Processing
↓
Frame Extraction
↓
Pose Estimation
↓
Body Keypoint Detection
↓
Joint Angle Calculation
↓
Biomechanical Feature Extraction
↓
Movement Symmetry and Quality Analysis
↓
Feature Vector Creation
↓
Machine Learning / Risk Analysis
↓
Injury Risk Score
↓
Low / Moderate / High / Critical Classification
↓
Corrective Recommendations
↓
Dashboard and Report

---

# 16. Current Implementation Status (COMPLETED)

All core AI/ML pipeline components are now implemented and integrated:

- ✅ **Pose Estimation** — MediaPipe Pose Landmarker extracts 33 3D/2D keypoints from real video
- ✅ **Video Frame Processing** — OpenCV reads uploaded MP4/MOV/WEBM videos frame-by-frame
- ✅ **Dynamic Activity Detection** — Infers Running/Walking/Squatting from landmark trajectories
- ✅ **Joint Angle Calculation** — 3D angle computation for Knee, Hip, Ankle joints
- ✅ **Biomechanical Feature Extraction** — Knee Valgus, Trunk Lean, ROM, Symmetry, Hip Stability, Fatigue, Movement Quality
- ✅ **Rule-Based Injury Risk Prediction** — 6 deterministic injury models (ACL, Hamstring, Ankle, Shoulder, Lower Back, Overuse)
- ✅ **Position Parameter Adjustment** — Sport-specific risk weight multipliers
- ✅ **Risk Score Generation** — Overall aggregated risk with formula breakdown
- ✅ **Per-Injury "Why?" Explanations** — Triggered factor lists for each injury prediction
- ✅ **Recommendation Engine** — Corrective exercises, mobility, strengthening, recovery, training modifications
- ✅ **Full React Frontend** — Dashboard, Video Analysis, Performance, Recommendations views

---

# 17. Dataset-to-Feature Mapping Table

The following table documents how dataset features map to video-derived biomechanical features in SportShield:

| # | Dataset Source | Dataset Column / Feature | Video Obtainability | Feature Engineering Method | Unit | Calculation Formula | Injury Risk Contribution |
|---|---|---|---|---|---|---|---|
| 1 | Running Injury Clinic Kinematic Dataset | `knee_flexion_angle` | **Direct** — Computed from pose landmarks | 3D angle at Knee vertex (Hip→Knee→Ankle) | Degrees (°) | `arccos(dot(v_HK, v_AK) / (‖v_HK‖ × ‖v_AK‖))` | ACL, Hamstring strain driver |
| 2 | Running Injury Clinic Kinematic Dataset | `knee_valgus_angle` | **Direct** — 2D frontal plane projection | Medial displacement of Knee relative to Hip-Ankle axis | Degrees (°) | `abs(cross(v_HK, v_KA))` frontal plane deviation | Primary ACL tear indicator (>10°) |
| 3 | Running Injury Clinic Kinematic Dataset | `hip_flexion_angle` | **Direct** — Computed from pose landmarks | 3D angle at Hip vertex (Shoulder→Hip→Knee) | Degrees (°) | `arccos(dot(v_SH, v_HK) / (‖v_SH‖ × ‖v_HK‖))` | Lower back, hip stability |
| 4 | Running Injury Clinic Kinematic Dataset | `ankle_dorsiflexion` | **Direct** — Computed from pose landmarks | 3D angle at Ankle vertex (Knee→Ankle→Foot) | Degrees (°) | `arccos(dot(v_KA, v_AF) / (‖v_KA‖ × ‖v_AF‖))` | Ankle sprain risk factor |
| 5 | Running Injury Clinic Kinematic Dataset | `stride_length` | **Derived** — Estimated from ROM | Correlation with knee ROM and ankle displacement | Meters (m) | `1.1 + (ROM / 180) × 0.5` | Overuse, hamstring strain |
| 6 | Running Injury Clinic Kinematic Dataset | `trunk_inclination` | **Direct** — Shoulder-Hip axis vs vertical | Spinal axis deviation from vertical plane | Degrees (°) | `arctan2(abs(Δx_sh_hip), abs(Δy_sh_hip))` | Lower back strain (>10°) |
| 7 | Project-Injury-Dataset.csv | `Training_Load` | **Profile Input** — Athlete self-report | Numeric training intensity index (0–100) | Index | Direct athlete input | Overuse syndrome (0.4× weight) |
| 8 | Project-Injury-Dataset.csv | `Flexibility` | **Profile Input** — Athlete self-report | Overall flexibility assessment (0–100) | Percentage (%) | Direct athlete input | Hamstring strain (<70%) |
| 9 | Project-Injury-Dataset.csv | `Strength` | **Profile Input** — Athlete self-report | Overall strength assessment (0–100) | Percentage (%) | Direct athlete input | Shoulder impingement (<75%) |
| 10 | Project-Injury-Dataset.csv | `Balance` | **Profile Input** — Athlete self-report | Postural balance assessment (0–100) | Percentage (%) | Direct athlete input | ACL, Ankle sprain (<75%) |
| 11 | Project-Injury-Dataset.csv | `Endurance` | **Profile Input** — Athlete self-report | Cardiovascular endurance (0–100) | Percentage (%) | Direct athlete input | Performance baseline composite |
| 12 | Project-Injury-Dataset.csv | `Position` | **Profile Input** — Athlete self-report | Playing position for risk weighting | Category | Position-to-risk multiplier mapping | Position-adjusted risk weights |
| 13 | Video-Derived (SportShield) | `bilateral_symmetry` | **Direct** — Left/Right kinematic comparison | Percentage match between bilateral limb kinematics | Percentage (%) | `(1 - abs(θ_L - θ_R) / max(θ_L, θ_R)) × 100` | ACL, Ankle, multi-joint (<80%) |
| 14 | Video-Derived (SportShield) | `hip_stability` | **Direct** — Vertical CoM variance | Inverse of hip center vertical oscillation | Percentage (%) | `clamp(100 - σ_hip × 400, 40, 100)` | Lower back, ACL (<75%) |
| 15 | Video-Derived (SportShield) | `range_of_motion` | **Direct** — Peak joint angle delta | Difference between max extension and min flexion | Degrees (°) | `θ_max - θ_min` (bilateral average) | Hamstring strain (<60°) |
| 16 | Video-Derived (SportShield) | `fatigue_score` | **Derived** — Kinematic variance decay | Trajectory variance comparison between session halves | Index (0–100) | `clamp(20 + abs(Var₂ - Var₁) × 2, 10, 85)` | Overuse, Hamstring (>35%) |
| 17 | Video-Derived (SportShield) | `movement_quality` | **Derived** — Composite weighted score | Weighted combination of symmetry, alignment, posture | Percentage (%) | `0.35×Symmetry + 0.35×Alignment + 0.30×(100-Lean)` | Overall risk aggregation |
| 18 | Video-Derived (SportShield) | `detected_activity` | **Derived** — Landmark trajectory analysis | Dynamic classification from hip displacement, knee ROM, ankle speed | Category | Heuristic: deep flex→Squat, high disp→Run, else→Walk | Kinematic baseline selection |

---

# 18. Updated AI/ML Pipeline Flowchart

```
Real-Life Video Upload
    ↓
Video Validation & Frame Sampling (OpenCV)
    ↓
MediaPipe Pose Estimation (33 Keypoints)
    ↓
Pose Landmarks / Keypoints Extraction
    ↓
Dynamic Activity Detection (Running / Walking / Squatting)
    ↓
Biomechanical Feature Extraction
  • Knee Valgus, Trunk Lean, ROM, Symmetry
  • Hip Stability, Fatigue Score, Movement Quality
    ↓
Feature Engineering & Dataset Column Mapping
  • Running Injury Clinic Kinematic Dataset
  • Project-Injury-Dataset.csv
    ↓
Athlete Profile Integration (Position, Training Load, Flexibility, etc.)
    ↓
Rule-Based 6-Injury Risk Engine
  1. ACL / Knee Ligament Risk
  2. Hamstring Strain Risk
  3. Ankle Sprain Risk
  4. Shoulder Impingement Risk
  5. Lower Back Strain Risk
  6. Overuse Syndrome Risk
    ↓
Overall Risk Score Aggregation
  Formula: 0.35 × Max(Risks) + 0.35 × Mean(Risks) + 0.30 × (100 − MovementQuality)
    ↓
Risk Classification (Low / Moderate / High)
    ↓
Per-Injury "Why?" Triggered Factor Explanations
    ↓
Corrective Recommendations (Exercise, Mobility, Strengthening, Recovery, Training Modification)
    ↓
SportShield Interactive React Dashboard
```

---

> **⚠️ Non-Medical Disclaimer**: SportShield is an academic research prototype for biomechanical movement analysis and injury-risk estimation. All risk scores are rule-based indicators derived from kinematic deviation thresholds — they are NOT clinical diagnoses. Always consult qualified sports medicine professionals for injury assessment and treatment decisions.