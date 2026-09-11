# SportShield Mentor Datasets Directory

This directory contains the three required benchmark and training datasets provided for the **SportShield Sports Injury Risk Detection** platform.

---

## 1. Project-Injury-Dataset.csv
- **Description**: Cohort dataset mapping computer-vision biomechanical metrics (angles, symmetry, smoothness) and athlete self-reported fatigue to observed injury outcomes.
- **Role in Platform**: Serves as the primary ground-truth benchmark for biomechanical risk thresholds and future supervised classification of high-risk movement patterns.
- **Key Columns**:
  - `athlete_id`: Identifier for the athlete.
  - `sport`: Sport discipline (Basketball, Soccer, Volleyball, Rugby, Track & Field, Tennis).
  - `position`: Playing position.
  - `activity_type`: Activity evaluated (`running`, `squatting`).
  - `knee_valgus_angle_deg`: Mean peak knee valgus deviation in degrees.
  - `hip_stability_score`: Hip abductor and pelvic stability index (0–100 scale).
  - `trunk_lateral_flexion_deg`: Lateral trunk lean deviation from vertical in degrees.
  - `range_of_motion_deg`: Functional range of motion of the knee/hip complex in degrees.
  - `bilateral_symmetry_pct`: Bilateral kinematic symmetry percentage (100% = perfect symmetry).
  - `movement_smoothness_score`: Acceleration jerk / smoothness metric (0–100 scale).
  - `rpe_fatigue_score`: Borg Session Rate of Perceived Exertion (1–10).
  - `previous_injury`: Prior injury history indicator (0 = No, 1 = Yes).
  - `injury_occurred`: Ground-truth observed injury status (0 = Uninjured, 1 = Injured).
  - `injury_risk_level`: Classified categorical risk (`LOW`, `MODERATE`, `HIGH`).
  - `primary_risk_zone`: Primary anatomical vulnerable area (`Knee (ACL/MCL)`, `Hamstring`, `Patellar Tendon`, `Ankle`, etc.).

---

## 2. sports_multimodal_data.csv
- **Description**: Longitudinal multimodal dataset combining kinematic movement markers with acute/chronic workload ratios (ACWR) and subjective wellness metrics.
- **Role in Platform**: Provides statistical distributions for the Fatigue Monitoring and Workload Recommendation engines.
- **Key Columns**:
  - `session_id`: Unique session identifier.
  - `athlete_id`: Athlete identifier.
  - `sport`: Sport discipline.
  - `session_type`: Game, Practice, Drills, Conditioning, Match.
  - `session_duration_mins`: Duration in minutes.
  - `acute_training_load`: 7-day rolling training load (sRPE × duration).
  - `chronic_training_load`: 28-day rolling baseline workload.
  - `acwr_ratio`: Acute-to-Chronic Workload Ratio (>1.5 indicates spike in injury risk).
  - `knee_valgus_peak_deg`: Peak dynamic knee valgus recorded during high-strain segments.
  - `asymmetry_index_pct`: Limb asymmetry percentage.
  - `trunk_sway_deg`: Dynamic trunk sway amplitude in degrees.
  - `sleep_quality_score`: Sleep quality rating (1–10).
  - `soreness_score`: Muscle soreness rating (1–10).
  - `fatigue_index`: Cumulative fatigue index (1–10).
  - `historical_injury_count`: Number of prior documented musculoskeletal injuries.
  - `injury_risk_flag`: Binary risk flag (0 = Safe, 1 = Elevated Risk).
  - `injury_category`: Specific affected pathology or `Non-Injury`.

---

## 3. collegiate_athlete_injury_dataset.csv
- **Description**: Collegiate athletic department cohort dataset recording anthropometrics, prior orthopedic history, functional screening tests, and in-season time lost to injury.
- **Role in Platform**: Used for population normalization, height/weight sanity validation baselines, and prior injury risk weighting calibration.
- **Key Columns**:
  - `athlete_id`: Collegiate athlete ID.
  - `college_division`: NCAA Division tier (`NCAA-D1`, `NCAA-D2`).
  - `sport_discipline`: Sport code.
  - `gender`: Biological sex / category (`Male`, `Female`).
  - `age`: Athlete age in years.
  - `height_cm`: Stature in centimeters (validated range 50–250 cm).
  - `weight_kg`: Mass in kilograms (validated range 20–250 kg).
  - `years_experience`: Collegiate and competitive experience in years.
  - `prior_acl_tear`: Prior ACL tear history flag (0/1).
  - `prior_ankle_sprain`: Prior lateral ankle sprain count.
  - `prior_hamstring_strain`: Prior hamstring strain count.
  - `squat_depth_deg`: Maximum functional squat depth angle in degrees.
  - `jump_landing_valgus_deg`: Frontal plane knee collapse during jump landing (deg).
  - `core_endurance_sec`: Isometric plank/core endurance in seconds.
  - `session_rpe`: Borg CR-10 subjective rating of exertion.
  - `injury_in_season`: In-season injury occurrence flag (0 = No, 1 = Yes).
  - `days_missed`: Time lost due to injury in days.
  - `injury_site`: Anatomical site (`ACL`, `Patellar Tendon`, `Meniscus`, `Hamstring`, `Ankle`, `None`).

---

## Code Integration
The dataset files in this directory are loaded programmatically by `backend/dataset_loader.py` and utilized across:
1. Population-level normative statistics and percentile rankings.
2. Anomaly detection thresholds calibrated against empirical standard deviations.
3. Supervised feature extraction matrices prepared in `backend/ml_pipeline.py`.
4. API endpoint `/api/v1/datasets/summary` and `/api/v1/datasets/benchmarks`.
