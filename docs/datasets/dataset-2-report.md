# Dataset 2 Report: Athlete Injury Prediction Dataset

## 1. Executive Summary & Provenance
- **Dataset Title**: Athlete Injury Prediction Dataset
- **Source**: Kaggle (`mrsimple07/injury-prediction-dataset`)
- **Local File Location**: `ai-service/data/kaggle_injury_data.csv`
- **File Format & Size**: CSV (64,956 bytes / ~65 KB)
- **Total Records**: 1,000 rows
- **Total Features / Columns**: 7 columns
- **Missing / Null Values**: 0 nulls across all 7 columns (100% complete)

---

## 2. Schema & Data Dictionary

| Column Name | Data Type | Units / Range | Description | Mean | Std Dev | Min | Max |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Player_Age` | Integer | Years (18–39) | Athlete age in years | 28.23 | 6.54 | 18 | 39 |
| `Player_Weight` | Float | Kilograms (40.0–104.7) | Body mass | 74.79 | 9.89 | 40.13 | 104.65 |
| `Player_Height` | Float | Centimeters (145.4–207.3)| Stature / vertical height | 179.75 | 9.89 | 145.40 | 207.31 |
| `Previous_Injuries` | Binary Integer | 0 or 1 | Prior documented sports injury | 0.515 | 0.500 | 0 | 1 |
| `Training_Intensity`| Float | Normalized (0.00 – 1.00) | ACWR / training load metric | 0.491 | 0.286 | 0.000 | 0.998 |
| `Recovery_Time` | Integer | Days (1 – 6) | Rest/recovery days between high load | 3.47 | 1.70 | 1 | 6 |
| `Likelihood_of_Injury`| Binary Integer | 0 (No) or 1 (Yes) | Ground-truth injury event indicator | 0.500 | 0.500 | 0 | 1 |

---

## 3. Distribution & Target Balance

### 3.1 Target Class Balance
The dependent variable `Likelihood_of_Injury` is split evenly:
- **Class 0 (Low / No Injury Risk)**: 500 samples (50.0%)
- **Class 1 (High Injury Risk)**: 500 samples (50.0%)

### 3.2 Feature Correlations with Injury Likelihood
Analysis of Pearson correlations reveals key predictive signals:
- **`Previous_Injuries`**: Strong positive correlation with injury likelihood (~0.58). Athletes with a prior injury exhibit a markedly higher probability of reinjury.
- **`Training_Intensity`**: Positive correlation (~0.43). Higher cumulative intensity without proportional recovery increases microtrauma accumulation.
- **`Recovery_Time`**: Negative correlation (~ -0.39). Longer adequate recovery windows attenuate acute-to-chronic workload spikes and decrease vulnerability.
- **`Player_Age`, `Player_Weight`, `Player_Height`**: Demographic co-factors that modulate basal mechanical joint stress.

---

## 4. Integration with the 5-Factor Weighted Scoring Model

The features from this dataset correspond with 3 of the 5 primary factors defined in the system architecture:
1. **Factor 2: Injury History Weight (20%)** $\rightarrow$ directly mapped to `Previous_Injuries` and prior recurrence.
2. **Factor 4: Training Load Weight (15%)** $\rightarrow$ directly mapped to `Training_Intensity`.
3. **Factor 5: Recovery / Fatigue Weight (10%)** $\rightarrow$ directly mapped to inverse `Recovery_Time` and sleep/workload deficit.

---

## 5. Usage in Project Architecture
This dataset is utilized for:
1. **Binary Probability Calibration**: Serving as a standardized benchmark for overall athlete injury propensity based on workload and clinical history.
2. **Feature Cross-Validation**: Validating that our Random Forest and XGBoost ensembles generalize across independent workload-based injury benchmarks in addition to kinematic-based datasets.
