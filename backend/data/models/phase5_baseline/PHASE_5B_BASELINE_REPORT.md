# SafeMove Phase 5B: Baseline Machine Learning Research Experiment Report

> **DISCLAIMER**: RESEARCH PROTOTYPE ONLY — NOT CLINICALLY VALIDATED.
> This report documents baseline machine learning experiments conducted on the currently integrated 20-subject research cohort. It does not provide medical diagnoses or guaranteed injury predictions.

---

## 1. Dataset Description & Cohort Size
- **Source Dataset**: Calgary_Running_Injury_Biomechanical_Dataset
- **Dataset Version**: 1.0.0
- **Integrated SafeMove Cohort**: **20 subjects** (12 Injured runners, 8 Healthy controls)
- **Cohort Split**: 17 Development subjects (used for Cross-Validation), 3 Holdout Test subjects
- **Important Scale Note**: The full published Calgary biomechanical dataset contains 1,798 subjects. This research baseline is strictly evaluated on the current 20-subject prototype cohort.

---

## 2. Target Definition & Task
- **Target Variable**: `injury_label (0=Healthy Control, 1=Injured)`
- **Task**: Binary injury-status classification (0 = Healthy Control, 1 = Documented Injury).
- **Multiclass Status**: Multiclass injury-type prediction is deferred to future scaled iterations to preserve statistical rigor.

---

## 3. Feature Sets & Experiments
- **Experiment A (Core Biomechanics)**: Sagittal plane kinematics (Knee Flexion ROM, Peak Knee Flexion, Hip Flexion ROM, Ankle Dorsiflexion ROM, Trunk Lean, Hip Adduction, Hip Internal Rotation) and ground reaction forces (Peak Vertical GRF, Vertical Loading Rate).
- **Experiment B (Core + Asymmetry)**: Core features + frontal plane proxy (`knee_valgus_proxy_left_max`).
- **Experiment C (Core + Asymmetry + Deviations)**: Core + Asymmetry + statistical deviations from developmental normative baselines (`knee_flexion_deviation_proxy`, `hip_flexion_deviation_proxy`).
- **Strict Leakage Filters**: All identifiers (`sample_id`, `athlete_id`, `video_id`, `source_dataset`) and outcome proxies (`injury_type`) are strictly excluded from predictive features.

---

## 4. Subject-Level Cross-Validation Results

Cross-Validation Strategy: `StratifiedGroupKFold (Subject-Level Isolation, 0 Cross-Fold Leakage)` (4-Fold Subject-Isolated Stratified Group K-Fold, 0 Cross-Fold Leakage).

| Experiment | Model | Features | Mean Bal Acc | Mean ROC-AUC | Mean PR-AUC | Mean F1 | Mean Brier | OOF Bal Acc | OOF ROC-AUC |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp A** | Logistic Regression (L2) | 9 | 1.000 | 1.000 | 1.000 | 1.000 | 0.003 | **1.000** | **1.000** |
| **Exp A** | Random Forest Classifier | 9 | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 | **1.000** | **1.000** |
| **Exp A** | XGBoost Classifier | 9 | 0.875 | 0.938 | 0.938 | 0.917 | 0.112 | **0.875** | **0.986** |
| **Exp B** | Logistic Regression (L2) | 10 | 1.000 | 1.000 | 1.000 | 1.000 | 0.002 | **1.000** | **1.000** |
| **Exp B** | Random Forest Classifier | 10 | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 | **1.000** | **1.000** |
| **Exp B** | XGBoost Classifier | 10 | 0.875 | 0.938 | 0.938 | 0.917 | 0.114 | **0.875** | **0.986** |
| **Exp C** | Logistic Regression (L2) | 12 | 1.000 | 1.000 | 1.000 | 1.000 | 0.002 | **1.000** | **1.000** |
| **Exp C** | Random Forest Classifier | 12 | 1.000 | 1.000 | 1.000 | 1.000 | 0.000 | **1.000** | **1.000** |
| **Exp C** | XGBoost Classifier | 12 | 0.875 | 0.938 | 0.938 | 0.917 | 0.112 | **0.875** | **0.986** |

---

## 5. Champion Model Selection & Explainability
- **Selected Champion Configuration**: **Experiment A** with **logistic_regression**
- **Composite CV Score**: 1.0
- **Explainability Nomenclature**: Predictive feature associations and model contributions (non-causal).

### Top Predictive Feature Associations
| Feature | Model Contribution | Contribution Type | Permutation Importance (Mean ± Std) |
| :--- | :---: | :--- | :---: |
| `hip_adduction_max` | **0.4612** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `hip_internal_rotation_max` | **0.4605** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `vertical_loading_rate` | **0.4583** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `knee_flexion_rom_left` | **-0.4560** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `trunk_lean_max` | **0.4432** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `peak_knee_flexion_left` | **-0.4341** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `hip_flexion_rom_left` | **-0.4295** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |
| `peak_vertical_grf` | **0.4154** | Logistic Regression Coefficient (Log-Odds Ratio) | 0.0000 ± 0.0000 |

---

## 6. Final Isolated Test Set Evaluation (1-Time Holdout Evaluation)
- **Test Cohort Size**: 3 subjects (CALGARY_SUBJ_0001, CALGARY_SUBJ_0004, CALGARY_SUBJ_0009)
- **True Labels**: `[1, 1, 1]`
- **Model Predictions**: `[1, 1, 1]` (Probabilities: `[0.8003, 0.8926, 0.9047]`)
- **Test Balanced Accuracy**: **1.0**
- **Test Sensitivity / Recall**: **1.0**
- **Test Specificity**: **0.0**
- **Statistical Uncertainty Warning**: *"The test cohort contains only 3 subjects; therefore the final test estimate has very high statistical uncertainty and must not be interpreted as clinical validation."*

---

## 7. Scientific & Statistical Limitations
1. **Sample Size Constraint**: The current integrated prototype cohort ($N=20$) provides proof of pipeline architecture, but empirical estimates carry wide confidence intervals.
2. **Generalizability**: Motion-capture tabular stance phase data may not fully translate to markerless in-the-wild single-camera video estimation without domain adaptation.
3. **Non-Causal Inference**: Observed high-loading rate or knee flexion associations reflect statistical predictive correlations, not proven physiological injury etiologies.

---

## 8. Next Recommended Phase (Phase 6)
- Scale ingestion to the full Calgary cohort ($N=1,798$ subjects).
- Implement Calibrated Probability outputs (Platt scaling / Isotonic regression).
- Integrate SHAP (SHapley Additive exPlanations) visual summary plots for physiotherapist review.
