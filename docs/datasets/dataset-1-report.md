# Dataset 1 Report: Sports Biomechanics & Injury Dataset

## 1. Executive Summary & Provenance
- **Dataset Title**: Biomechanical Sports Injury & Rehabilitation Dataset
- **Source Repository**: Manojkumar1910 / `injury-prediction-model` (GitHub)
- **Local File Location**: `ai-service/data/sports_injury_biomechanics.csv`
- **File Format & Size**: CSV (1,682,147 bytes / ~1.68 MB)
- **Total Records**: 9,600 rows
- **Total Features / Columns**: 19 columns
- **Missing / Null Values**: 0 nulls across all 19 columns (100% complete)

---

## 2. Schema & Data Dictionary

| Column Name | Data Type | Units / Format | Description | Min | Median | Max |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Sport` | Categorical (String) | N/A | Primary sporting discipline | - | - | - |
| `Player_ID` | Integer | ID | Unique identifier for player | 1 | 3997.5 | 8000 |
| `PLAYER_NAME` | String | Name | Synthetic or anonymized athlete name | - | - | - |
| `Age` | Integer | Years | Athlete chronological age | 18 | 27.0 | 39 |
| `Height_cm` | Integer | Centimeters | Athlete standing height | 150 | 184.0 | 209 |
| `Weight_kg` | Integer | Kilograms | Athlete body mass | 50 | 88.0 | 119 |
| `Position / Exercise_Type` | Categorical (String) | Role | Specific athletic position or exercise movement | - | - | - |
| `Injury_Type` | Categorical (String) | Pathology | Specific diagnosed anatomical injury | - | - | - |
| `Injury_Severity` | Categorical (Ordinal) | Mild / Moderate / Severe | Tri-level clinical severity tier | - | - | - |
| `Rehabilitation_Program`| Categorical (String) | Modality | Primary physical therapy regimen assigned | - | - | - |
| `Rehabilitation_Time_weeks` | Integer | Weeks | Time required for recovery / clearance | 1 | 7.0 | 15 |
| `Injury_Recurrence` | Binary Integer | 0 (No) / 1 (Yes) | History of prior injury recurrence | 0 | 0 | 1 |
| `Date_of_Injury` | String | DD-MM-YYYY HH:MM | Incident timestamp | - | - | - |
| `Rehabilitation_Efficiency_Score` | Float | 0.0 – 1.0 | Standardized recovery outcome metric | 0.40 | 0.78 | 1.00 |
| `Knee_Angle_deg` | Float | Degrees | Dynamic knee flexion / valgus metric | 15.02° | 56.31° | 99.30° |
| `Jump_Height_cm` | Float | Centimeters | Vertical explosive leap displacement | 20.01 cm| 62.84 cm| 99.96 cm |
| `Ankle_Flexion_deg` | Float | Degrees | Dorsiflexion / plantarflexion joint angle | 15.01° | 62.52° | 99.98° |
| `Speed_m_s` | Float | Meters/sec | Instantaneous movement velocity | 5.01 m/s| 40.06 m/s| 98.91 m/s |
| `Reaction_Time_ms` | Float | Milliseconds | Neuro-muscular reactive latency | 30.0 ms | 99.35 ms| 399.5 ms |

---

## 3. Distribution Analysis

### 3.1 Sport Breakdown
The dataset captures multiple dynamic sports with significant biomechanical load:
- **Basketball**: 2,000 (20.83%)
- **Football (Soccer)**: 2,000 (20.83%)
- **Tennis**: 2,000 (20.83%)
- **Gym / Strength Training**: 1,600 (16.67%)
- **Cricket**: 1,000 (10.42%)
- **Badminton**: 1,000 (10.42%)

### 3.2 Target Class: Injury Severity
The three clinical severity tiers are exceptionally balanced:
- **Moderate**: 3,242 (33.77%)
- **Severe**: 3,230 (33.65%)
- **Mild**: 3,128 (32.58%)
*Note: This balanced distribution provides an ideal benchmark for multiclass classification without requiring artificial resampling (SMOTE).*

### 3.3 Target Class: Injury Type (Top Pathologies)
The anatomical distribution features 17 distinct musculoskeletal conditions:
1. **Ankle Sprain**: 1,855 (19.32%)
2. **ACL Tear**: 945 (9.84%)
3. **Knee Injury (General/Meniscus)**: 774 (8.06%)
4. **Hamstring Strain**: 761 (7.93%)
5. **Back Pain**: 504 (5.25%)
6. **Hamstring Tear**: 489 (5.09%)
7. **Concussion**: 484 (5.04%)
8. **Wrist Injury**: 480 (5.00%)
9. **Shoulder Strain**: 476 (4.96%)
10. **Fracture**: 419 (4.36%)
11. **Shoulder Dislocation**: 417 (4.34%)
12. **Shoulder Injury (General)**: 396 (4.12%)
13. **Muscle Strain**: 353 (3.68%)
14. **Rotator Cuff Injury**: 317 (3.30%)
15. **Tendonitis**: 313 (3.26%)
16. **Elbow Pain**: 309 (3.22%)
17. **Lower Back Pain**: 308 (3.21%)

### 3.4 Rehabilitation Programs
- **Physiotherapy**: 2,457 (25.59%)
- **Strength Training**: 2,420 (25.21%)
- **Flexibility Exercises**: 2,386 (24.85%)
- **Balance Training**: 2,337 (24.34%)

---

## 4. Biomechanical & Kinematic Range Evaluation

- **Knee Angle (`Knee_Angle_deg`)**: Mean 57.58° ± 18.23°, Range 15.02° – 99.30°. Higher angles and extreme dynamic shifts correlate with patellofemoral stress and ACL loading.
- **Ankle Flexion (`Ankle_Flexion_deg`)**: Mean 63.08° ± 19.41°, Range 15.01° – 99.98°. Decreased closed-chain dorsiflexion is clinically established as a major risk factor for patellar tendinopathy and ankle inversion sprains.
- **Reaction Time (`Reaction_Time_ms`)**: Mean 183.31 ms ± 112.55 ms, Median 99.35 ms. Slower neuromuscular activation directly impairs anticipatory postural adjustments during decelerations.
- **Injury Recurrence**: 4,663 positive (48.57%), 4,937 negative (51.43%).

---

## 5. Usage in Project Architecture
This dataset serves as the primary training corpus for:
1. **Multiclass Injury Severity Classifier** (`Mild`, `Moderate`, `Severe`).
2. **Specific Anatomical Pathology Risk Classifier** (Estimating risk across Ankle, ACL, Hamstring, Knee, and Shoulder domains).
3. **Rehabilitation Recommender Baseline** (Mapping kinematic profiles and injury severity to evidence-based recovery protocols).
