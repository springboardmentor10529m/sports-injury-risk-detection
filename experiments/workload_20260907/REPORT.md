# Standalone workload-model experiment

Application code, video analysis, existing fitted models and original CSV files were not modified. No fitted experimental model was saved. Results are exploratory synthetic-label classification, not validated prediction of future injuries.

## Sources and target definitions

- Collegiate: [Ziya ? Athlete Injury and Performance Dataset](https://www.kaggle.com/datasets/ziya07/athlete-injury-and-performance-dataset), Kaggle dataset ID 6375698, downloaded version identifier 10300774. The source explicitly calls the data synthetic and defines Injury_Indicator as binary ACL injury. It supplies feature descriptions but no generation script, exact labeling algorithm, prospective time horizon or independently observed clinical outcomes.

- Multimodal: [Multimodal Sports Injury Prediction Dataset](https://www.kaggle.com/datasets/anjalibhegam/multimodal-sports-injury-prediction-dataset), Kaggle dataset ID 8243476, downloaded version identifier 13020017. The card defines injury_risk as binary at-risk status derived from primary risk indicators. It does not document the exact rule, collection cohort, session chronology or clinical adjudication. This is not the similarly named 15,420-row dataset with a different target.

Both cards list CC0. Dataset IDs were matched against the local files' download-origin metadata and public Kaggle API metadata. Documentation was checked on 2026-09-07.

## Data audit

| Dataset | Rows | Columns | Negatives | Positives | Positive share | Missing cells | Duplicate rows |
|---|---:|---:|---:|---:|---:|---:|---:|
| collegiate_athlete_injury_dataset.csv | 200 | 17 | 186 | 14 | 7.00% | 0 | 0 |
| sports_multimodal_data.csv | 5430 | 31 | 5160 | 270 | 4.97% | 0 | 0 |

Collegiate has 200 unique Athlete_ID values: one row per synthetic athlete. Multimodal has no athlete/session identifiers or timestamps, so independent-athlete and prospective evaluation cannot be established.

## Feature-derived label diagnostics

The following multimodal rule reproduces all 5,430 labels, with zero mismatches:

```text
S = 3 * (heart_rate > 85)
  + 4 * (emg_amplitude > 0.7)
  + 3 * (ground_reaction_force > 700)
  + 2 * (fatigue_index > 65)
  + 1 * (previous_injury_history == 1)
injury_risk = 1 if S >= 7 else 0
```

This is a post-hoc empirical reconstruction, not a recovered original generation script or held-out model result. Its confusion matrix is [[5160, 0], [0, 270]]. Training on these inputs would learn the label definition, not demonstrate future-injury prediction.

The entire heart_rate column matches numpy.random.RandomState(42).normal(70, 10, 5430) within 1.43e-14. This is strong evidence of synthetic generation, although the source card does not explicitly declare the file synthetic. The file also contains 124 SpO2 values above 100, eight negative training durations, and 35 negative jump heights.

Collegiate: all 14 positives have ACL_Risk_Score >= 70, but only 14 of the 26 rows in that range are positive. The rule ACL_Risk_Score > 75 gives [[184, 2], [2, 12]] (196/200 matches). Equal scores can have different labels. A simple deterministic ACL-score threshold is therefore not an exact definition; the strong dependence is a leakage concern. The generation mechanism and direction of dependence cannot be established from the CSV alone. No claim of an exact collegiate labeling rule is warranted.

## Experimental design

Target: Injury_Indicator, positive class 1. Always excluded: Athlete_ID, ACL_Risk_Score, Load_Balance_Score, Performance_Score, Team_Contribution_Score. Target is never an input.

Primary inputs: Age, Gender, Height_cm, Weight_kg, Position, Training_Intensity, Training_Hours_Per_Week, Recovery_Days_Per_Week, Match_Count_Per_Week, Rest_Between_Events_Days, Fatigue_Score.

The workload-only sensitivity candidate uses the last six training/schedule/fatigue fields. There is no derived workload ratio, feature selection or inferred temporal information.

- Primary evaluation: StratifiedKFold(n_splits=5, shuffle=True, random_state=42); 160 training and 40 test rows per fold. Test positive counts: 2, 3, 3, 3, 3. Athlete IDs are unique, so rows do not split repeated athletes.
- All numeric median imputation and scaling and categorical imputation/one-hot encoding are fitted on training folds only. Unknown categorical values are ignored. No missing rows were removed.
- Models: prior-only dummy; logistic regression C=1, class_weight=balanced, max_iter=2000; random forest with 300 trees, max_depth=5, min_samples_leaf=3, class_weight=balanced, random_state=42; and the same logistic model restricted to workload inputs.
- Fixed probability threshold 0.5. No hyperparameter/threshold tuning, SMOTE or probability calibration. Scores are uncalibrated.
- Split sensitivity: repeat five-fold evaluation for seeds 42?51, using fixed estimator seeds. This isolates split variability; it is not an independent validation cohort.
- PR-AUC is reported as average precision (non-trapezoidal). Undefined precision for no positive predictions is set to zero.

## Primary cross-validation: mean ? sample SD across five folds

| Model | Precision | Recall | F1 | PR-AUC (AP) | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Prior baseline | 0.000 ? 0.000 | 0.000 ? 0.000 | 0.000 ? 0.000 | 0.070 ? 0.011 | 0.500 ? 0.000 |
| Balanced logistic (11 inputs) | 0.275 ? 0.144 | 0.700 ? 0.298 | 0.392 ? 0.189 | 0.433 ? 0.297 | 0.845 ? 0.105 |
| Balanced random forest (11 inputs) | 0.293 ? 0.289 | 0.400 ? 0.365 | 0.333 ? 0.312 | 0.517 ? 0.258 | 0.866 ? 0.085 |
| Workload-only logistic (6 inputs) | 0.240 ? 0.056 | 0.700 ? 0.183 | 0.353 ? 0.077 | 0.527 ? 0.257 | 0.839 ? 0.115 |

## Primary pooled out-of-fold predictions

Every athlete contributes exactly one held-out prediction per candidate. Pooled metrics differ from unweighted fold means.

| Model | Precision | Recall | F1 | PR-AUC (AP) | ROC-AUC | Confusion matrix |
|---|---:|---:|---:|---:|---:|---|
| Prior baseline | 0.000 | 0.000 | 0.000 | 0.067 | 0.469 | [[186, 0], [14, 0]] |
| Balanced logistic (11 inputs) | 0.270 | 0.714 | 0.392 | 0.403 | 0.868 | [[159, 27], [4, 10]] |
| Balanced random forest (11 inputs) | 0.375 | 0.429 | 0.400 | 0.455 | 0.847 | [[176, 10], [8, 6]] |
| Workload-only logistic (6 inputs) | 0.233 | 0.714 | 0.351 | 0.471 | 0.858 | [[153, 33], [4, 10]] |

Matrix layout throughout: [[TN, FP], [FN, TP]], rows = actual class, columns = predicted class. The prior baseline has per-fold ROC-AUC 0.5; pooled ROC-AUC is 0.469 because training-fold prevalence differs inversely with test-fold prevalence. This is a pooling artifact, not useful discrimination. The overall positive-prevalence reference for AP is 0.070.

## Individual primary folds

| Model | Fold | Test positives | Precision | Recall | F1 | PR-AUC (AP) | ROC-AUC | Confusion matrix |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Prior baseline | 1 | 2 | 0.000 | 0.000 | 0.000 | 0.050 | 0.500 | [[38, 0], [2, 0]] |
| Prior baseline | 2 | 3 | 0.000 | 0.000 | 0.000 | 0.075 | 0.500 | [[37, 0], [3, 0]] |
| Prior baseline | 3 | 3 | 0.000 | 0.000 | 0.000 | 0.075 | 0.500 | [[37, 0], [3, 0]] |
| Prior baseline | 4 | 3 | 0.000 | 0.000 | 0.000 | 0.075 | 0.500 | [[37, 0], [3, 0]] |
| Prior baseline | 5 | 3 | 0.000 | 0.000 | 0.000 | 0.075 | 0.500 | [[37, 0], [3, 0]] |
| Balanced logistic (11 inputs) | 1 | 2 | 0.200 | 0.500 | 0.286 | 0.219 | 0.750 | [[34, 4], [1, 1]] |
| Balanced logistic (11 inputs) | 2 | 3 | 0.200 | 0.667 | 0.308 | 0.269 | 0.820 | [[29, 8], [1, 2]] |
| Balanced logistic (11 inputs) | 3 | 3 | 0.500 | 1.000 | 0.667 | 0.833 | 0.973 | [[34, 3], [0, 3]] |
| Balanced logistic (11 inputs) | 4 | 3 | 0.143 | 0.333 | 0.200 | 0.177 | 0.748 | [[31, 6], [2, 1]] |
| Balanced logistic (11 inputs) | 5 | 3 | 0.333 | 1.000 | 0.500 | 0.667 | 0.937 | [[31, 6], [0, 3]] |
| Balanced random forest (11 inputs) | 1 | 2 | 0.000 | 0.000 | 0.000 | 0.317 | 0.816 | [[37, 1], [2, 0]] |
| Balanced random forest (11 inputs) | 2 | 3 | 0.400 | 0.667 | 0.500 | 0.750 | 0.919 | [[34, 3], [1, 2]] |
| Balanced random forest (11 inputs) | 3 | 3 | 0.400 | 0.667 | 0.500 | 0.622 | 0.883 | [[34, 3], [1, 2]] |
| Balanced random forest (11 inputs) | 4 | 3 | 0.000 | 0.000 | 0.000 | 0.174 | 0.748 | [[35, 2], [3, 0]] |
| Balanced random forest (11 inputs) | 5 | 3 | 0.667 | 0.667 | 0.667 | 0.722 | 0.964 | [[36, 1], [1, 2]] |
| Workload-only logistic (6 inputs) | 1 | 2 | 0.250 | 0.500 | 0.333 | 0.293 | 0.711 | [[35, 3], [1, 1]] |
| Workload-only logistic (6 inputs) | 2 | 3 | 0.182 | 0.667 | 0.286 | 0.442 | 0.757 | [[28, 9], [1, 2]] |
| Workload-only logistic (6 inputs) | 3 | 3 | 0.286 | 0.667 | 0.400 | 0.792 | 0.955 | [[32, 5], [1, 2]] |
| Workload-only logistic (6 inputs) | 4 | 3 | 0.182 | 0.667 | 0.286 | 0.300 | 0.811 | [[28, 9], [1, 2]] |
| Workload-only logistic (6 inputs) | 5 | 3 | 0.300 | 1.000 | 0.462 | 0.810 | 0.964 | [[30, 7], [0, 3]] |

## Split sensitivity: ten repeated pooled OOF evaluations

Values are mean ? sample SD [minimum, maximum] across seeds 42?51.

| Model | Precision | Recall | F1 | PR-AUC (AP) | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Prior baseline | 0.000 ? 0.000 [0.000, 0.000] | 0.000 ? 0.000 [0.000, 0.000] | 0.000 ? 0.000 [0.000, 0.000] | 0.067 ? 0.000 [0.067, 0.067] | 0.469 ? 0.000 [0.469, 0.469] |
| Balanced logistic (11 inputs) | 0.236 ? 0.030 [0.186, 0.270] | 0.643 ? 0.089 [0.500, 0.786] | 0.345 ? 0.044 [0.275, 0.393] | 0.425 ? 0.044 [0.365, 0.508] | 0.852 ? 0.018 [0.819, 0.868] |
| Balanced random forest (11 inputs) | 0.402 ? 0.059 [0.286, 0.467] | 0.371 ? 0.081 [0.214, 0.500] | 0.384 ? 0.067 [0.261, 0.483] | 0.411 ? 0.068 [0.277, 0.513] | 0.841 ? 0.026 [0.788, 0.872] |
| Workload-only logistic (6 inputs) | 0.226 ? 0.014 [0.205, 0.250] | 0.721 ? 0.053 [0.643, 0.786] | 0.344 ? 0.021 [0.310, 0.379] | 0.504 ? 0.025 [0.471, 0.547] | 0.862 ? 0.022 [0.815, 0.882] |

These SDs/ranges are descriptive, not confidence intervals. Folds share training data, and repeats reuse the same 200 athletes. No statistical superiority or external generalization claim is supported.

## Interpretation and next steps

The 11-input logistic model catches 10/14 positives but raises 27 false positives in the primary run. The forest catches only 6/14, with 10 false positives; it catches zero positives in two of five primary folds. Workload-only logistic catches 10/14 with 33 false positives. The small positive count makes apparent model rankings unstable.

Use workload-only logistic as the interpretable experimental reference, with the other candidates retained for comparison; do not declare a clinically superior model. A stronger future protocol needs documented label generation, timestamps/prediction horizon, pre-outcome feature availability, more independent injury-positive athletes, and external validation. If tuning or selecting a final threshold/model, use nested stratified CV and a separate untouched evaluation cohort. Excluding the five specified columns removes obvious leakage candidates but cannot establish independence of synthetic labels from the remaining inputs.

Keep this experiment separate from video analysis. Do not use the reconstructed multimodal rule as clinical evidence or deploy these synthetic-data models.

## Reproducibility and verification

Runtime versions: python 3.12.10, numpy 2.5.2, pandas 3.0.5, scikit_learn 1.9.0. The existing virtual environment differs from the application requirements file; no dependencies were installed or changed.

Artifacts in this directory: run_experiment.py and results.json, including every fold metric, confusion matrix, primary OOF prediction, protected file hash and fixed setting. No fitted estimator was serialized.

```powershell
.\backend\venv\Scripts\python.exe -B experiments/workload_20260907/run_experiment.py
```

Input SHA-256 hashes:

- collegiate_athlete_injury_dataset.csv: `1eccd0381c8685b1bc57cc87404095bde56d7381f90a183b33c494a78be7dc4b`
- sports_multimodal_data.csv: `fbd72428bd522f3bd65bb27a2bd86326e0924da03dbf38ec9fde2af5239a2d59`
