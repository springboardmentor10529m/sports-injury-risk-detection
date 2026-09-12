# Automated Dataset & Machine Learning Pipeline

This guide documents the automated data engineering, preprocessing, training, and evaluation pipeline of the AthleteGuard platform.

---

## 1. Pipeline Architecture

```mermaid
graph TD
    A["Public Sources (Zenodo / Figshare / GitHub)"] -->|scripts/download_datasets.py| B["data/raw/"]
    A -->|scripts/scrape_datasets.py| C["data/metadata/"]
    B -->|scripts/prepare_datasets.py| D["data/processed/injury_prediction_dataset.parquet"]
    B -->|scripts/prepare_datasets.py| E["data/processed/unified_biomechanics_dataset.parquet"]
    D -->|scripts/train_models.py (GroupKFold)| F["models/trained/"]
    F -->|scripts/evaluate_models.py| G["reports/model_evaluation/"]
    F -->|FastAPI Backend| H["Production API & Screening Engine"]
```

---

## 2. Reproduction Steps (Command-Line)

The complete pipeline can be reproduced in sequence with four commands:

### Step 1: Automated Dataset Download
```bash
python scripts/download_datasets.py
```
- Automatically creates `data/raw/`, `data/metadata/`.
- Downloads:
  - Lövdal et al. (2021) longitudinal runner cohort (`week_approach_maskedID_timeseries.csv`, `day_approach_maskedID_timeseries.csv`).
  - Swathikiran (2021) athlete workload and injury tables (`injuries.csv`, `game_workload.csv`, `metrics.csv`).
  - Fukuchi et al. Running Biomechanics (RBDS) dataset (`BMC_RIC_dataset.txt`, `metadata.txt`).
  - Santos et al. Balance Evaluations (BDS) dataset (`BDSinfo.txt`).
- Features progress bars, resumption support, and file integrity validation.

### Step 2: Compliant Research Scraper (Optional Metadata Sync)
```bash
python scripts/scrape_datasets.py
```
- Queries Zenodo and Figshare REST APIs for open access files, licenses, and citation metadata.

### Step 3: Unified Data Preprocessing
```bash
python scripts/prepare_datasets.py
```
- Harmonizes schemas across datasets.
- Extracts volume, intensity, ACWR, fatigue indices, and biomechanical proxies.
- Outputs `data/processed/injury_prediction_dataset.parquet` (45,198 samples, 104 athletes) and `data/processed/unified_biomechanics_dataset.parquet`.

### Step 4: Supervised Model Training
```bash
python scripts/train_models.py
```
- Partitions data using **Subject-Level Grouping (`GroupShuffleSplit`)** on `subject_id` to guarantee zero athlete overlap.
- Trains:
  1. Regularized Logistic Regression (L2, class-balanced)
  2. Random Forest Classifier (balanced subsample)
  3. XGBoost Classifier (gradient boosted trees)
  4. Calibrated XGBoost (Platt sigmoidal scaling)
- Saves artifacts in `models/trained/`.

### Step 5: Model Evaluation & Report Generation
```bash
python scripts/evaluate_models.py
```
- Evaluates models on the held-out test split of 26 unseen athletes.
- Computes ROC-AUC, PR-AUC, Sensitivity, Specificity, Brier score, and Confusion Matrices.
- Plots publication-grade charts to `reports/model_evaluation/`.

---

## 3. Generated Artifacts Directory Structure

```
data/
├── metadata/
│   ├── fukuchi_running_biomechanics_rbds.json
│   ├── processed_dataset_schema.json
│   ├── running_injury_lovdal.json
│   ├── santos_balance_bds.json
│   ├── sports_workload_swathikiran.json
│   └── zenodo_4610859.json
├── processed/
│   ├── injury_prediction_dataset.csv
│   ├── injury_prediction_dataset.parquet
│   ├── test_split.parquet
│   └── unified_biomechanics_dataset.parquet
└── raw/
    ├── fukuchi_running_biomechanics_rbds/
    ├── running_injury_lovdal/
    ├── santos_balance_bds/
    └── sports_workload_swathikiran/

models/
├── pretrained/
│   └── pose/
│       ├── rtmpose-m_simcc-body7_pt-body7_420e-256x192-e48f03d0_20230504.onnx
│       └── yolox_m_8xb8-300e_humanart-c2c7a14a.onnx
└── trained/
    ├── calibrated_xgboost.joblib
    ├── feature_scaler.joblib
    ├── feature_schema.json
    ├── logistic_regression.joblib
    ├── random_forest.joblib
    └── xgboost.joblib

reports/
└── model_evaluation/
    ├── calibration_curves.png
    ├── feature_importance.png
    ├── metrics_summary.json
    ├── pr_curves.png
    └── roc_curves.png
```
