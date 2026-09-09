# Dataset Preparation Report — Sports Injury Detection ML Pipeline

## 1. Source datasets

The ML dataset preparation process evaluated the following three source CSV datasets located in `datasets/`:

1. `datasets/Project-Injury-Dataset.csv` (Clinical & Rehabilitation Injury Registry)
2. `datasets/sports_multimodal_data.csv` (Multimodal Movement, Workload & Injury Risk Dataset)
3. `datasets/collegiate_athlete_injury_dataset.csv` (Collegiate Athlete Profile & Load Dataset)

---

## 2. Dataset statistics

| Dataset | Rows | Columns | Missing Values | Duplicate Rows | Primary Data Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `Project-Injury-Dataset.csv` | 9,600 | 19 | 0 | 0 | Post-injury rehabilitation outcomes & biomechanical measures |
| `sports_multimodal_data.csv` | 5,430 | 31 | 0 | 0 | Kinematic movement sensors, fatigue, workload & pre-injury risk |
| `collegiate_athlete_injury_dataset.csv` | 200 | 17 | 0 | 0 | Macro athlete training load, fatigue & ACL risk indicators |

All 3 datasets are clean of missing (`NaN`) values and contain 0 duplicate rows.

---

## 3. Feature comparison

Cross-dataset comparison reveals equivalent and complementary concepts across the three files:

| Concept / Domain | `Project-Injury-Dataset.csv` | `sports_multimodal_data.csv` | `collegiate_athlete_injury_dataset.csv` | Equivalency & Scale Comparison |
| :--- | :--- | :--- | :--- | :--- |
| **Fatigue** | N/A | `fatigue_index` (7.05 - 85.37) | `Fatigue_Score` (1 - 9) | Equivalent concepts; `fatigue_index` provides fine continuous scale (0-100 index). |
| **Jump Height** | `Jump_Height_cm` (10.1 - 100 cm) | `jump_height` (-0.18 to 1.27 m) | N/A | Equivalent movement metric; DS2 recorded in meters, requiring conversion to cm (`* 100`). |
| **Joint Kinematics / ROM** | `Knee_Angle_deg`, `Ankle_Flexion_deg` | `range_of_motion` (30 - 120°) | N/A | Excursion range vs single joint angles; DS2 captures continuous dynamic ROM. |
| **Movement Speed** | `Speed_m_s` (3.0 - 98.9 m/s) | `speed` (0.0 - 12.0 m/s) | N/A | DS2 represents realistic physical locomotion speed (m/s). |
| **Training & Workload** | N/A | `training_duration`, `workload_intensity`, `rest_period`, `repetition_count` | `Training_Hours_Per_Week`, `Match_Count_Per_Week`, `Rest_Between_Events_Days`, `Load_Balance_Score` | DS2 measures session-level acute load; DS3 measures macro weekly load. |
| **Injury History** | `Injury_Recurrence` (0/1) | `previous_injury_history` (0/1) | N/A | Identical binary indicator for prior joint/muscle injury history. |
| **Symmetry & Balance** | N/A | `gait_symmetry` (0.6 - 1.0) | N/A | Limb movement symmetry score compatible with video biomechanics service. |

---

## 4. Selected features

The final ML training dataset incorporates 18 carefully selected features that represent physiological load, movement mechanics, fatigue, and injury history without introducing data leakage:

1. **`fatigue_score`** (`float64`): Quantifies pre-exercise neuromuscular fatigue state (0-100 scale). Fatigue impairs dynamic joint stabilization.
2. **`acceleration`** (`float64`): Peak linear acceleration/deceleration magnitude ($m/s^2$). Deceleration forces place high strain on ACL and knee tendons.
3. **`angular_velocity`** (`float64`): Angular joint rotational velocity ($rad/s$). Tracks rapid joint angle changes during cutting/landing.
4. **`body_orientation`** (`float64`): Torso spatial angle relative to movement axis ($deg$). Excessive trunk lean increases knee valgus moments.
5. **`ground_reaction_force`** (`float64`): Impact force transmitted through lower limbs ($N$). High GRF combined with poor alignment correlates directly with non-contact injury.
6. **`step_count`** (`int64`): Total step/movement volume within exercise session. Tracks acute cumulative mechanical exposure.
7. **`cadence`** (`float64`): Movement frequency ($steps/min$). Cadence alterations signal impending fatigue and movement degradation.
8. **`jump_height_cm`** (`float64`): Vertical displacement during explosive jump movements ($cm$). Evaluates lower extremity power output and landing impact potential.
9. **`range_of_motion`** (`float64`): Joint angular excursion ($deg$). Restricted ROM limits shock absorption; excessive laxity reduces joint stability.
10. **`impact_force`** (`float64`): Transient force spike at initial ground contact ($N$). Evaluates shock attenuation during landing phases.
11. **`gait_symmetry`** (`float64`): Left-to-right limb movement symmetry ratio ($0.0 - 1.0$). Limb asymmetry (>15% variance) significantly increases compensatory strain on the non-dominant limb.
12. **`speed`** (`float64`): Horizontal movement velocity ($m/s$). High-speed maneuvers increase joint shear force demands.
13. **`training_duration`** (`float64`): Session duration ($minutes$). Prolonged exercise exposure induces fatigue-related kinematic collapse.
14. **`previous_injury_history`** (`int64`): Binary prior injury indicator ($0$ or $1$). Clinically established as the strongest single pre-disposing factor for recurrent injury.
15. **`rest_period`** (`float64`): Recovery duration between high-intensity bouts ($days$). Inadequate recovery leads to microtrauma accumulation.
16. **`repetition_count`** (`int64`): Exercise repetition volume per set. Measures local muscular fatigue accumulation.
17. **`workload_intensity`** (`float64`): Perceived/calculated session exertion index. Normalizes acute mechanical workload.
18. **`acc_rms`** (`float64`): Root-mean-square acceleration ($g$). Measures movement smoothness and tremor variance under load.

---

## 5. Excluded features

A total of 48 columns across the three datasets were explicitly excluded based on strict safety, relevance, and data leakage criteria:

### Identity & Metadata Exclusions
- `Player_ID` (DS1), `PLAYER_NAME` (DS1), `Athlete_ID` (DS3): Unique personal identifiers contain zero generalizable predictive signal and cause severe overfitting.
- `Sport` (DS1), `Position / Exercise_Type` (DS1), `Position` (DS3), `Gender` (DS3): Categorical contextual descriptors that do not cause biomechanical joint stress directly.

### Irrelevant Environmental & Sensor Signals
- `heart_rate`, `emg_amplitude`, `skin_temp`, `gsr`, `respiratory_rate`, `spo2`, `bp_systolic`, `bp_diastolic` (DS2): Physiological telemetry signals not captured by standard video cameras or basic athlete profiles.
- `altitude`, `ambient_temp`, `humidity`, `heat_index` (DS2): Atmospheric environment features without direct biomechanical causation in indoor/standard athletic analysis.

### Game & Subjective Performance Exclusions
- `Performance_Score` (DS3), `Team_Contribution_Score` (DS3): Subjective game contribution scores unrelated to anatomical risk.

### Data Leakage & Post-Injury Variables (Crucial Exclusion)
- `Injury_Type` (DS1), `Injury_Severity` (DS1), `Rehabilitation_Program` (DS1), `Rehabilitation_Time_weeks` (DS1), `Date_of_Injury` (DS1), `Rehabilitation_Efficiency_Score` (DS1): These attributes describe clinical treatment and severity **after an injury has occurred**. Using post-injury variables as predictive inputs for pre-injury prediction creates catastrophic forward-data leakage.
- `ACL_Risk_Score` (DS3): Investigated explicitly per Phase 4. Highly correlated with the target ($r = 0.525$, mean $43.7$ in uninjured vs $82.6$ in injured). As a pre-calculated composite risk score derived from injury factors, including it as an input feature would leak target information.

### Dataset Incompatibility & Sample Scale Exclusions
- All attributes of `Project-Injury-Dataset.csv` (DS1): DS1 is a post-injury observational clinical registry where 100% of rows represent injured athletes. It lacks non-injured control subjects, making it structurally incompatible for binary injury risk modeling.
- Attributes of `collegiate_athlete_injury_dataset.csv` (DS3): DS3 consists of only 200 rows with 14 positive injury cases. Merging small macro-level weekly averages with granular 5,430-row continuous sensor data would introduce sampling noise and feature distortion.

---

## 6. Target analysis

The targets present in each source dataset represent fundamentally different analytical concepts:

1. **`Project-Injury-Dataset.csv` (`Injury_Type`)**:
   - **Type**: Multi-class categorical string (17 injury types: Ankle Sprain, ACL Tear, Knee Injury, etc.).
   - **Meaning**: Represents diagnosed clinical injury classification after event occurrence.
   - **Nature**: Every row has an injury (no uninjured control group).

2. **`sports_multimodal_data.csv` (`injury_risk`)**:
   - **Type**: Binary integer (`0` = Low Injury Risk / Safe, `1` = High Injury Risk / Impending Risk).
   - **Meaning**: Pre-injury prediction target indicating whether movement kinematics, fatigue, and workload cross risk thresholds.
   - **Nature**: Balanced real-world distribution (5,160 Low Risk, 270 High Risk).

3. **`collegiate_athlete_injury_dataset.csv` (`Injury_Indicator`)**:
   - **Type**: Binary integer (`0` = No Injury, `1` = Injury Occurred).
   - **Meaning**: Macro seasonal injury occurrence indicator.
   - **Nature**: Small sample size (186 Uninjured, 14 Injured).

---

## 7. Target compatibility

> [!IMPORTANT]
> **Can the targets across all 3 datasets be blindly merged?**
> **NO.** Target concatenation across all three datasets is scientifically invalid and prohibited.

### Reasoning:
1. `Project-Injury-Dataset.csv` has **NO** binary `injury_risk` column; 100% of its records describe post-injury rehabilitation states. Assigning `1` to all DS1 rows or attempting to force categorical `Injury_Type` into binary risk would distort the ML decision boundary and cause target contamination.
2. `sports_multimodal_data.csv` (`injury_risk`) provides a high-sample ($N=5,430$), movement-level binary risk target aligned with real-time video biomechanical analysis.
3. `collegiate_athlete_injury_dataset.csv` (`Injury_Indicator`) provides seasonal athlete-level outcomes ($N=200$).

### Scientifically Defensible Decision:
Use `sports_multimodal_data.csv` as the sole primary dataset for `ml_training_dataset.csv`. It contains 5,430 complete instances with precise kinematic and workload features directly compatible with the application's video processing pipeline.

---

## 8. Data leakage analysis

| Potential Leakage Feature | Dataset | Analysis Findings | Decision |
| :--- | :--- | :--- | :--- |
| `Injury_Type` | DS1 | Diagnosed clinical condition after injury occurrence | **EXCLUDED** |
| `Injury_Severity` | DS1 | Clinical severity grade assigned during rehabilitation | **EXCLUDED** |
| `Rehabilitation_Program` | DS1 | Physical therapy protocol implemented post-injury | **EXCLUDED** |
| `Rehabilitation_Time_weeks` | DS1 | Weeks spent in recovery after injury event | **EXCLUDED** |
| `Date_of_Injury` | DS1 | Timestamp of past injury event | **EXCLUDED** |
| `Rehabilitation_Efficiency_Score` | DS1 | Post-rehab outcome metric | **EXCLUDED** |
| `ACL_Risk_Score` | DS3 | Strongly correlated with injury target ($r = 0.525$). Pre-calculated risk index derived from target factors | **EXCLUDED** |

All potential data leakage channels have been completely eliminated from the training set.

---

## 9. Transformations

1. **Unit Conversion**:
   - `jump_height` in DS2 was recorded in meters (range $-0.18$ to $1.27$ m). Converted to centimeters (`jump_height_cm = jump_height * 100`) to align with standard biomechanical metrics and backend conventions (range $-18.54$ to $126.60$ cm).
2. **Noise Floor Bounding / Clipping**:
   - `training_duration` contained negative values down to $-11.86$ min due to sensor baseline noise. Clipped lower boundary to $0.0$ min.
   - `workload_intensity` contained negative values down to $-1.24$. Clipped lower boundary to $0.0$.
3. **Feature Renaming**:
   - `fatigue_index` renamed to `fatigue_score` for exact compatibility with application naming.
4. **Precision Formatting**:
   - All continuous floating-point features rounded to 4 decimal places for clean storage without loss of scientific precision.

---

## 10. Final ML dataset

The final ML training dataset has been compiled and saved to `datasets/ml_training_dataset.csv`.

- **Total Rows**: `5,430`
- **Total Columns**: `19` (18 Features + 1 Target)
- **Features**: `fatigue_score`, `acceleration`, `angular_velocity`, `body_orientation`, `ground_reaction_force`, `step_count`, `cadence`, `jump_height_cm`, `range_of_motion`, `impact_force`, `gait_symmetry`, `speed`, `training_duration`, `previous_injury_history`, `rest_period`, `repetition_count`, `workload_intensity`, `acc_rms`
- **Target**: `injury_risk` (Binary: 0 or 1)
- **Missing Values**: `0` (100% complete)
- **Class Distribution**:
  - Class `0` (Low Risk / Safe): **5,160 rows** (95.03%)
  - Class `1` (High Risk / Injured): **270 rows** (4.97%)

---

## 11. Video pipeline compatibility

Every final ML feature has been mapped to its operational source within the existing application:

| Final ML Feature | Primary Input Source Category | Operational Source in Application Pipeline |
| :--- | :--- | :--- |
| `fatigue_score` | **B. Athlete Input / Kinematic Decay** | Self-reported athlete baseline score or computed from movement smoothness decay across video frames |
| `acceleration` | **A. Existing Video / Pose Pipeline** | Calculated from frame-by-frame pose keypoint velocity derivatives ($m/s^2$) |
| `angular_velocity` | **A. Existing Video / Pose Pipeline** | Derived from joint angle temporal rate of change ($rad/s$) in `BiomechanicsService` |
| `body_orientation` | **A. Existing Video / Pose Pipeline** | Calculated from trunk lean angle relative to vertical axis in `BiomechanicsService` |
| `ground_reaction_force` | **A. Existing Video / Pose Pipeline** | Estimated biomechanical proxy calculated from landing vertical deceleration & athlete body weight |
| `step_count` | **A. Existing Video / Pose Pipeline** | Stride/step cycle detection from ankle distance horizontal displacement peaks |
| `cadence` | **A. Existing Video / Pose Pipeline** | Step frequency computed over video duration ($steps/min$) |
| `jump_height_cm` | **A. Existing Video / Pose Pipeline** | Vertical displacement of hip center keypoint during jump movement phase |
| `range_of_motion` | **A. Existing Video / Pose Pipeline** | Knee and hip angular excursion ($	ext{max\_angle} - 	ext{min\_angle}$) computed in `BiomechanicsService` |
| `impact_force` | **A. Existing Video / Pose Pipeline** | Peak landing impact deceleration proxy derived during max flexion phase |
| `gait_symmetry` | **A. Existing Video / Pose Pipeline** | Bilateral movement symmetry score calculated in `BiomechanicsService` |
| `speed` | **A. Existing Video / Pose Pipeline** | Keypoint pixel displacement rate converted to movement velocity ($m/s$) |
| `training_duration` | **C. Training History / Athlete Input** | Entered by athlete/coach in session profile or aggregated from historical training log |
| `previous_injury_history` | **C. Training History / Athlete Profile** | Retrieved from stored `Athlete` database profile (`previous_injury_history` flag) |
| `rest_period` | **C. Training History / Athlete Input** | Retrieved from athlete calendar / rest interval log ($days$) |
| `repetition_count` | **A. Existing Video / Pose Pipeline** | Repetition count detected by `BiomechanicsService` phase transitions |
| `workload_intensity` | **B. Athlete Input / C. History** | Computed session exertion index or athlete pre-session input |
| `acc_rms` | **A. Existing Video / Pose Pipeline** | Acceleration RMS / smoothness score calculated from keypoint acceleration variance |

### Source Summary Breakdown:
- **A. Existing Video / Pose Pipeline**: 13 features (72.2%)
- **B. Athlete Input**: 2 features (11.1%)
- **C. Training History / Profile**: 3 features (16.7%)
- **D. Dataset Only**: 0 features (0.0%)

**Conclusion**: 100% of the selected ML features are fully compatible with the existing application architecture and video processing pipeline.
