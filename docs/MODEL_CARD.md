# Model Card: Supervised Sports Injury Risk & Biomechanical Models

## 1. Model Details

- **Model Name**: AthleteGuard Supervised Sports Injury Risk Predictor
- **Model Version**: 2.0.0-supervised
- **Model Type**: Calibrated Gradient Boosted Decision Trees (XGBoost) with Platt Sigmoidal Calibration, evaluated alongside Random Forest and L2 Regularized Logistic Regression.
- **Developers**: Deep Learning & Sports Biomechanics Engineering Team
- **Release Date**: 2026-09-11
- **License**: Apache 2.0 / Academic & Clinical Research
- **Framework**: Scikit-Learn 1.9+, XGBoost 3.4+, ONNX Runtime 1.30+

---

## 2. Intended Use & Target Population

- **Intended Use**:
  - Longitudinal workload and biomechanical screening for competitive runners, field sport athletes, and rehabilitation patients.
  - Identification of acute workload spikes, movement asymmetry deviations, and elevated probability of overuse injuries.
- **Prohibited Uses**:
  - **NOT** a clinical diagnostic medical device.
  - Must not be used as sole criterion to clear an athlete for high-intensity competition following major surgical reconstructions (e.g. ACL replacement) without clinical orthopedic evaluation.
  - Prohibited from predicting non-biomechanical injuries (e.g., bone fractures from high-velocity contact impacts).

---

## 3. Training & Evaluation Datasets

| Dataset | Type | Cohort Size | Prediction Unit | Verified Labels |
|---|---|---|---|---|
| **Lövdal et al. (2021)** | Longitudinal training logs (7 years) | 74 competitive runners | Subject / Multi-week window | Verified injury incidence (binary 0/1) |
| **Swathikiran (2021)** | Athlete workload & physical screening | 30 athletes | Daily match & screening sessions | Verified injury dates (binary 0/1) |
| **Total Cohort** | Unified Supervised Table | **104 athletes, 45,198 samples** | Session / Window | **712 verified injury events (1.58% prevalence)** |

---

## 4. Subject-Level Partitioning & Data Leakage Prevention

- **Partitioning Method**: `GroupShuffleSplit` on `subject_id` (Athlete ID).
- **Leakage Prevention**: **Zero athlete overlap** between training and test sets. All sessions belonging to an individual athlete remain exclusively in either the training set or the test set.
- **Training Partition**: 34,125 samples across 78 athletes (521 injury events).
- **Test Partition**: 11,073 samples across 26 unseen athletes (191 injury events).

---

## 5. Input Features (19 Dimensions)

1. `total_distance_km`: Total running/session distance
2. `max_distance_day_km`: Single-day volume peak
3. `nr_sessions`: Number of active sessions
4. `nr_rest_days`: Rest frequency
5. `nr_tough_sessions`: High-intensity threshold sessions
6. `nr_strength_sessions`: Resistance training frequency
7. `high_intensity_km`: Distance in zone Z5 / tempo
8. `moderate_intensity_km`: Distance in zone Z3-Z4
9. `avg_exertion`: Average Rate of Perceived Exertion (RPE 0-10)
10. `max_exertion`: Peak session RPE
11. `avg_recovery`: Subjective recovery index (0-10)
12. `min_recovery`: Nadir recovery score
13. `acute_chronic_workload_ratio`: ACWR proxy (1-week to 4-week ratio)
14. `workload_spike_2week`: 2-week relative accumulation factor
15. `fatigue_index`: Normalized exertion-to-recovery quotient
16. `movement_asymmetry_proxy`: Kinematic bilateral variance
17. `knee_valgus_proxy`: Dynamic frontal knee abduction angle proxy
18. `hip_stability_index`: Pelvic stability score (0-100)
19. `trunk_lean_proxy`: Sagittal/frontal trunk deviation angle

---

## 6. Evaluation Metrics on Unseen Athlete Cohort

| Metric | Regularized Logistic Regression | Random Forest | XGBoost (Raw) | XGBoost (Calibrated) |
|---|---|---|---|---|
| **ROC-AUC** | **0.7064** | 0.6693 | 0.6654 | 0.6448 |
| **PR-AUC** | 0.0418 | **0.0480** | 0.0450 | 0.0441 |
| **Sensitivity (Recall)** | **0.5654** | 0.4031 | 0.4607 | Evaluated with calibrated probability thresholds |
| **Specificity** | 0.7158 | **0.8348** | 0.7886 | **0.9998** |
| **Brier Score (Calibration)** | 0.2008 | 0.1548 | 0.1619 | **0.0168** (Superior calibration) |

- **Charts Saved in Repository**:
  - ROC Curves: `reports/model_evaluation/roc_curves.png`
  - Precision-Recall Curves: `reports/model_evaluation/pr_curves.png`
  - Calibration Curve: `reports/model_evaluation/calibration_curves.png`
  - Feature Importances: `reports/model_evaluation/feature_importance.png`

---

## 7. Multi-Injury Scope & Label Availability

| Target | Status | Label Source | Note |
|---|---|---|---|
| **Overuse Running Injury** | **Trained & Calibrated** | Lövdal et al. (2021) | High confidence on volume/fatigue indicators |
| **Lower Limb Strain** | **Trained** | Swathikiran (2021) | Workload and hip mobility interactions |
| **Acute ACL Tear** | **Unavailable for direct ML classification** | N/A | Requires clinical surgical ground-truth cohort (e.g. Stanford MRNet). Assessed via **rule-based kinematic valgus proxy** |
| **Hamstring Tear** | **Estimated via sprint load proxy** | High-speed running load | Specific grade 1-3 clinical ultrasound labels required for discrete ML model |
| **Ankle Inversion Sprain** | **Estimated via balance & asymmetry proxy** | Santos et al. BDS/PDS | Discrete trauma labels required for separate ML model |

---

## 8. Known Biases & Clinical Limitations

1. **Cohort Demographics**: Training data predominantly derives from competitive collegiate and club-level endurance runners and field sport athletes aged 18–35. Performance on master athletes (>50) or pediatric athletes is uncalibrated.
2. **2D Kinematic Proxies**: Video features reflect monocular camera projections. Minor perspective distortion can alter apparent joint angles by $\pm 2.5^\circ$.
3. **Class Imbalance**: True clinical injury prevalence is low (~1.58%), requiring calibrated probabilities rather than uncalibrated default 0.5 classification thresholds.
