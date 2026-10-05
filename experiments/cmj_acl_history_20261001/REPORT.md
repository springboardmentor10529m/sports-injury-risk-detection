# CMJ prior-ACL-history classification experiment

## Purpose and scope

This experiment trains a model to distinguish participants with a **history of ACL injury** from control participants using laboratory-derived countermovement-jump (CMJ) joint angles. It does not predict a future injury, estimate clinical risk, validate KINETIQ's video pose extraction, or replace the production rule-based video score.

The dataset has 43 participants: 21 with prior ACL injury and 22 controls. Each participant is one model example. Features are the median across up to three usable, non-fatigued bilateral CMJ trials. One participant had only two usable trials. The source has two trials flagged as missing overall; one was in the selected non-fatigued CMJ set. The study excluded participant 5, who has no trial-label rows in this subset.

The target uses the trial label sheet's explicit `ACL injured leg` field (0 = control; 1 or 2 = ACL side), cross-checked against its group code (1 = control, 2 = ACL). The participant-log group field documents the inverse numeric mapping; it was not used as the target.

## Features and training

The input features summarize both knees, knee asymmetry, knee adduction, bilateral hip flexion, and lumbar extension from knee initial contact through 200 ms after contact. The source joint-angle table specifies degrees and 250 Hz sampling. Only non-fatigued trials were used; trials were aggregated by participant before splitting.

The experiment compares a majority-class baseline, balanced logistic regression, and a Random Forest. It uses five-fold stratified grouped cross-validation, repeated with seeds 42–51. Since the feature table contains one row per participant, grouping ensures each participant remains wholly within one fold. Preprocessing is fitted inside each training fold. The probability threshold is fixed at 0.5; there is no tuning, feature selection, oversampling, or threshold optimization.

## Results

Primary out-of-fold metrics (seed 42):

| Model | Accuracy | Balanced accuracy | Precision | Recall | F1 | Average precision | ROC-AUC | Confusion matrix `[[TN, FP], [FN, TP]]` |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Majority baseline | 0.512 | 0.500 | 0.000 | 0.000 | 0.000 | 0.488 | 0.500 | `[[22, 0], [21, 0]]` |
| Logistic regression | 0.535 | 0.534 | 0.526 | 0.476 | 0.500 | 0.501 | 0.506 | `[[13, 9], [11, 10]]` |
| Random Forest | 0.535 | 0.536 | 0.522 | 0.571 | 0.545 | 0.536 | 0.504 | `[[11, 11], [9, 12]]` |

Across the ten repeated split seeds, Random Forest ROC-AUC averaged **0.520 (SD 0.043; range 0.476–0.597)**, and average precision averaged **0.533 (SD 0.038; range 0.470–0.612)**. Logistic regression ROC-AUC averaged 0.465 (SD 0.030), and average precision averaged 0.480 (SD 0.026). Repeats reuse the same 43 participants, so these are split-sensitivity summaries, not independent validation or confidence intervals.

The Random Forest is close to chance on ROC-AUC and has an 11/21 false-positive count at the fixed threshold in the primary run. The results do **not** demonstrate reliable classification. The dataset is small, the labels are prior injury history rather than future outcomes, and the laboratory-derived angles are not features extracted by KINETIQ's video pipeline.

## Artifacts and reproduction

- `run_experiment.py` — feature extraction, participant-level evaluation, and final fit.
- `results.json` — source hashes, protocol, per-fold configuration, out-of-fold predictions, repeated-split metrics, and versions.
- `random_forest_acl_history.joblib` — final Random Forest fit on all 43 participants, for isolated research use only.
- Input data are in the Git-ignored `data/external/kinetiq_jump_landing/` directory.

Run from the repository root:

```powershell
.venv\python.exe -B experiments/cmj_acl_history_20261001/run_experiment.py
```

Source: Calisti, M., Mohr, M. & Federolf, P. (2025), *Scientific Data* 12, 1645. Dataset DOI: [10.6084/m9.figshare.28890545.v1](https://doi.org/10.6084/m9.figshare.28890545.v1). License: CC BY 4.0.
