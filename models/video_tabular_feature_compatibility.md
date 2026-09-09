# Video Kinematic vs. Tabular Model Feature Compatibility Audit

## Overview
This document evaluates the compatibility between biomechanical joint features extracted from MP4 videos via MediaPipe Pose and the 18 tabular training features in `ml_training_dataset.csv`.

---

## 1. Multimodal Training Status
> [!IMPORTANT]
> **MULTIMODAL TRAINING STATUS**: **NOT GENUINE**
> The ML model binary (`models/best_sports_injury_model.joblib`) is trained strictly on 5,430 rows of tabular data. Video features extracted from uploaded MP4 files are adapted at inference time via a validated feature adaptation layer, but were **not** part of the original tabular model training matrix.

---

## 2. Feature Compatibility Matrix

| Video Extracted Feature (MediaPipe) | Equivalent CSV Feature | Compatibility Status | Justification / Definition Comparison |
| :--- | :--- | :---: | :--- |
| **`trunk_lean_avg`** (degrees tilt from vertical) | **`body_orientation`** | **YES** | **Compatible**. Both measure trunk torso lean angle from vertical axis in degrees. Mean value in Class 0 is $0.63^\circ$ vs $8.99^\circ$ in Class 1. |
| **`knee_range_of_motion`** (angular swing) | **`range_of_motion`** | **PARTIAL** | **Partially Compatible**. Video measures knee joint range of motion (degrees swing). CSV feature `range_of_motion` measures overall lower limb joint range. Direct mapping is valid for squatting/jumping motions. |
| **`gait_symmetry`** (0.0 to 1.0 ratio) | **`gait_symmetry`** | **YES** | **Compatible**. Both represent normalized bilateral symmetry ratio ($1.0 = \text{perfect symmetry}$, $<0.8 = \text{asymmetric strain}$). |
| **`acc_rms`** (acceleration RMS jitter) | **`acc_rms`** | **YES** | **Compatible**. Both quantify movement smoothness and micro-acceleration variance during motion execution. |
| **`knee_flexion_min`** (min knee bend angle) | *(None)* | **NO** | **Incompatible**. CSV dataset does not include a specific minimum knee flexion column. Cannot map to model without retraining. |
| **`min_knee_valgus_ratio`** (knee collapse ratio) | *(None)* | **NO** | **Incompatible**. CSV dataset lacks explicit frontal-plane valgus ratio. Cannot map directly to existing tabular feature schema. |

---

## 3. Recommended Future Multimodal Roadmap
To achieve **GENUINE Multimodal Training** in future iterations:
1. Record paired video keypoint streams for all 5,430 athlete sessions.
2. Extract MediaPipe landmark vectors for every training session.
3. Concatenate video landmark vectors directly into the tabular training matrix before model fitting.
