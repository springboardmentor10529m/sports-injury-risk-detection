Subject: Technical Explanation - Features and Implementation of Video Processing and ML Pipeline

Dear Madam,

Below is a technical explanation of the features extracted, how they are implemented, and how the ML pipeline works.

## 1. FEATURES EXTRACTED FROM VIDEO

The system extracts 45 biomechanical features from athlete movement videos. These features measure how the body moves and what indicators suggest injury risk.

### 1.1 Joint Angles (10 features)

- Knee flexion (left and right): How much the knee bends during movement
- Hip flexion (left and right): How much the hip bends during movement
- Ankle dorsiflexion (left and right): How much the ankle bends upward
- Shoulder flexion (left and right): How much the shoulder bends forward
- Elbow flexion (left and right): How much the elbow bends

Joint angles are calculated using the MediaPipe landmarks. For example, knee flexion is calculated as the angle between three points: hip, knee, and ankle.

### 1.2 Range of Motion (6 features)

- Knee ROM (left and right): Maximum to minimum knee angle during the movement
- Hip ROM (left and right): Maximum to minimum hip angle during the movement
- Ankle ROM (left and right): Maximum to minimum ankle angle during the movement

Range of motion shows how flexible and mobile the athlete is.

### 1.3 Movement Velocity (4 features)

- Knee velocity (left and right): How fast the knee angle is changing
- Hip velocity (left and right): How fast the hip angle is changing

Velocity is calculated by dividing the change in angle by the time between frames (dt = 1/fps).

### 1.4 Symmetry Features (3 features)

- Bilateral symmetry: Overall left-right balance
- Bilateral symmetry knee: How symmetric the left and right knees move
- Bilateral symmetry hip: How symmetric the left and right hips move

Symmetry is measured by calculating the difference between left and right side movements. Lower asymmetry is better.

### 1.5 Injury Risk Indicators (2 features)

- Knee valgus (left and right): Inward collapse of the knee (dangerous movement pattern)

Knee valgus is calculated from the angle between the hip, knee, and ankle. High valgus indicates poor knee alignment during movement.

### 1.6 Stability Features (3 features)

- Hip stability (left and right): How stable the hip stays during movement
- Trunk stability: How still the trunk/core stays during movement

Stability is measured by calculating how much the joint position varies across frames.

### 1.7 Landing and Gait Features (8 features)

- Landing impact score: How hard the athlete lands (from vertical force calculations)
- Trunk lean angle: How much the body leans forward during landing
- Peak vertical force: Maximum upward force during landing
- Peak braking force: Maximum forward resistance force during landing
- Ground contact time (left and right): How long each foot touches the ground
- Stride length (left and right): Distance traveled per step

These features show the quality of landing, jumping, and running mechanics.

### 1.8 Movement Quality Features (4 features)

- Movement quality score: Overall smoothness and coordination (0 to 1)
- Movement smoothness: How jittery or smooth the movement is
- Movement consistency: How similar each movement repetition is
- Balance score: How well the athlete maintains balance

These are calculated using jerk (change in acceleration), signal filtering, and variance analysis.

### 1.9 Global Features (3 features)

- Center of mass displacement: How much the body's center shifts during movement
- Fatigue index: Signs of fatigue detected from movement degradation
- Age and BMI: Athlete profile data

### 1.10 Feature Summary Table

Total: 45 features
- Joint angles: 10
- Range of motion: 6
- Angular velocities: 4
- Symmetry: 3
- Knee valgus: 2
- Stability: 3
- Landing/gait: 8
- Movement quality: 4
- Profile: 2 (age, BMI)
- Biomechanics: 3 (COMDisplacement, fatigue, balance)

## 2. HOW FEATURES ARE EXTRACTED - TECHNICAL IMPLEMENTATION

### 2.1 MediaPipe Pose Detection

Step 1: Each video frame (640x480 pixels) is given to MediaPipe Pose.

Step 2: MediaPipe returns 33 body landmarks as (x, y, z, confidence) values:
- Head landmarks (nose)
- Shoulder landmarks (left and right)
- Arm landmarks (elbow, wrist)
- Hip landmarks (left and right)
- Leg landmarks (knee, ankle, heel, foot_index)

Step 3: Landmarks are adjusted using hip position as the reference point, so the distance from the camera doesn't affect angle calculations.

### 2.2 Feature Calculation Formulas

**Example 1: Knee Flexion Angle**
```
landmarks = [hip, knee, ankle]
vector1 = hip - knee
vector2 = ankle - knee
angle = arccos(dot_product(vector1, vector2) / (norm(vector1) * norm(vector2)))
knee_flexion = 180 - angle  (convert to flexion angle)
```

**Example 2: Movement Smoothness (Jerk Calculation)**
```
velocity = derivative(position) over time
acceleration = derivative(velocity) over time
jerk = derivative(acceleration) over time
smoothness_score = 1 / (1 + average(abs(jerk)))  (normalized to 0-1)
```

**Example 3: Bilateral Symmetry**
```
left_value = average(left_side_measurements)
right_value = average(right_side_measurements)
asymmetry = abs(left_value - right_value)
symmetry = 1 - (asymmetry / max_value)  (normalized to 0-1)
```

**Example 4: Knee Valgus (Frontal Plane Angle)**
```
Calculate the angle in the frontal plane (looking from the front):
valgus_angle = angle between hip-knee and knee-ankle in frontal plane
If valgus_angle > 20 degrees, it indicates inward knee collapse
```

### 2.3 Frame Processing

The video is sampled at approximately 10 frames per second (not every frame).
Each frame is resized to 640x480 pixels for consistent processing.
Up to 300 frames are processed to avoid excessive computation.

For a 30-second video:
- 30 seconds × 10 fps = 300 frames processed
- This gives approximately 30 seconds of feature data

### 2.4 Feature Sequence Processing

Features are calculated for each frame, creating a time series:
```
Frame 1: [angle1, angle2, ..., feature45]
Frame 2: [angle1, angle2, ..., feature45]
...
Frame N: [angle1, angle2, ..., feature45]
```

Statistics are then calculated across all frames:
- Average value
- Maximum value
- Minimum value
- Standard deviation
- Variance

These statistics become the final feature vector for ML model input.

## 3. HOW THE ML MODEL WORKS - XGBOOST

### 3.1 Model Type

The model is an XGBoost (Extreme Gradient Boosting) classifier. XGBoost is a tree-based ensemble method that builds multiple decision trees sequentially, where each tree corrects errors from previous trees.

### 3.2 Model Input

The model receives:
- 45 biomechanical features (numbers between 0 and 1, normalized)
- Data from one athlete's single video

### 3.3 Model Output

The model outputs:
- Probability of injury risk (0 to 1)
- Classification: Low risk or High risk

For example:
- Output = 0.2 means 20% probability of high injury risk
- Output = 0.8 means 80% probability of high injury risk

### 3.4 How XGBoost Works

XGBoost learns from training data:

1. Build Tree 1: Creates a decision tree that splits features to separate low-risk from high-risk samples
   - Example split: "If movement_smoothness < 0.5 AND knee_valgus > 15, then likely high risk"

2. Build Tree 2: Looks at errors from Tree 1 and creates a tree to correct those errors

3. Build Tree 3-100: Each tree further refines predictions

4. Final prediction: Combines results from all 100 trees with weighted voting
   - Tree predictions are averaged: Final_score = (Tree1 + Tree2 + ... + Tree100) / 100

### 3.5 Model Performance

The model was trained on 1,400 samples and tested on 300 samples:

- Accuracy: 95.67% (correctly classifies 95.67% of videos)
- Precision: 91.55% (when model says high risk, it's correct 91.55% of the time)
- Recall: 90.28% (catches 90.28% of actual high-risk cases)
- ROC-AUC: 0.9916 (nearly perfect discrimination between low and high risk)

Confusion Matrix (on 300 test samples):
```
                  Predicted Low    Predicted High
Actual Low         222              6
Actual High         7               65
```

This means:
- 222 low-risk videos correctly identified as low-risk
- 6 low-risk videos incorrectly identified as high-risk (false positives)
- 7 high-risk videos incorrectly identified as low-risk (false negatives)
- 65 high-risk videos correctly identified as high-risk

### 3.6 Model File

Model location: backend/ml/models/risk_classifier.pkl

File size: ~5 MB (XGBoost serialized object)

The model was trained with:
```
XGBoost parameters:
- max_depth: 6 (maximum tree depth)
- learning_rate: 0.1 (how much each tree corrects previous errors)
- n_estimators: 100 (number of trees)
- objective: binary:logistic (binary classification with probability output)
```

## 4. RULE-BASED SCORING - HOW FEATURES ARE WEIGHTED

Before combining with ML model, a rule-based score is calculated using manual weights:

### 4.1 Scoring Weights

```
Final_Score = 0.70 × Rule_Based_Score + 0.30 × ML_Probability

Where Rule_Based_Score = 
  0.35 × Movement_Biomechanics_Risk +
  0.20 × Injury_History_Risk +
  0.20 × Asymmetry_Risk +
  0.15 × Training_Load_Risk +
  0.10 × Fatigue_Risk
```

### 4.2 Movement Biomechanics Risk (35%)

Calculated from:
- Knee valgus > 20° (high risk indicator)
- Hip stability < 0.5 (poor stability = high risk)
- Landing impact > 3 G-force (hard landing = high risk)
- Movement smoothness < 0.6 (jerky movement = high risk)
- Trunk stability < 0.5 (poor core control = high risk)

Score ranges from 0 (safe) to 1 (very risky).

### 4.3 Injury History Risk (20%)

Calculated from:
- Number of previous injuries
- Recency of injuries (recent injuries = higher risk)
- Severity of injuries
- Body part affected (sport-specific)

### 4.4 Asymmetry Risk (20%)

Calculated from:
- Bilateral asymmetry score (left-right imbalance)
- Knee asymmetry (if knees move differently)
- Hip asymmetry (if hips move differently)

High asymmetry indicates one side is weaker or less controlled.

### 4.5 Training Load Risk (15%)

Calculated from:
- Number of training sessions in the last week
- Intensity of recent training
- Rest days between training sessions
- Total hours of training

High training load without adequate rest = higher injury risk.

### 4.6 Fatigue Risk (10%)

Calculated from:
- Movement degradation (if movement gets worse over time)
- Reported fatigue level (1-10 scale)
- Stride variability increase (if stride becomes more inconsistent)
- Balance deterioration (if balance score decreases over time)
- Heart rate trends (if available)

## 5. FINAL RISK SCORE AND THRESHOLDS

### 5.1 Risk Score Calculation

```
Final_Risk_Score = 0.70 × Rule_Based_Score + 0.30 × ML_Probability
```

Example calculation:
- Rule-based score: 0.4 (moderate issues detected)
- ML probability: 0.6 (model thinks 60% high-risk)
- Final score = 0.70 × 0.4 + 0.30 × 0.6 = 0.28 + 0.18 = 0.46

### 5.2 Risk Level Assignment

```
Score < 0.25:           LOW RISK (green)
Score 0.25 - 0.50:      MODERATE RISK (yellow)
Score 0.50 - 0.75:      HIGH RISK (orange)
Score >= 0.75:          CRITICAL RISK (red)
```

In the example above (score 0.46), the athlete is at MODERATE RISK.

### 5.3 Sport-Specific Adjustments

Different sports have different risk profiles:

- Basketball: Higher weight on landing impact, knee valgus
- Running: Higher weight on stride metrics, repetitive stress
- Cutting sports (soccer, football): Higher weight on bilateral asymmetry, hip stability
- Jumping sports (volleyball): Higher weight on landing mechanics

## 6. DATASETS USED FOR TRAINING

### 6.1 Kaggle Datasets (5 Available)

1. **Multimodal Sports Injury Dataset**
   - Link: anjalibhegam/multimodal-sports-injury-dataset
   - Contains video + injury labels

2. **Athlete Injury and Performance Dataset**
   - Link: ziya07/athlete-injury-and-performance-dataset
   - Contains performance metrics and injury records

3. **NFL Injury Reports Dataset 2009-2025**
   - Link: mansiaggarwal88/nfl-injury-reports-dataset-20092025
   - Contains professional football injury data

4. **Basketball Player Injury Rehabilitation Dataset**
   - Link: ziya07/basketball-player-injury-in-sports-rehabilitation
   - Contains basketball-specific injury data

5. **Athlete Training Performance and Fatigue Dataset**
   - Link: jashanpreetsingh645/athlete-training-performance-and-fatigue-dataset
   - Contains training load and fatigue data

### 6.2 Synthetic Dataset (Primary for Current Model)

**File:** ml/training/generate_synthetic_data.py

**Generation Parameters:**
```
Number of athletes: 500
Movement samples per athlete: 4
Total samples: 2,000
Injury records: 300 (15% injury rate)
Features: 45 biomechanical features
```

**Data Split:**
```
Training: 1,400 samples (70%)
Validation: 300 samples (15%)
Testing: 300 samples (15%)
Split method: Stratified (same injury rate in each split)
Random seed: 42 (reproducible)
```

**Preprocessing Applied:**
```
1. StandardScaler: All features normalized to mean=0, std=1
2. One-hot encoding: Categorical features (sport, position) converted to binary
3. IQR outlier handling: Values beyond 1.5×IQR capped to IQR bounds
4. Variance filtering: Features with very low variance removed
```

### 6.3 Class Distribution

```
Training data:
- Low-risk (negative): 1,062 samples (75.9%)
- High-risk (positive): 338 samples (24.1%)

Imbalance handled by:
- Class weights in XGBoost (penalty for misclassifying minority class)
- Stratified train-test split (maintains ratio)
```

## 7. TRAINING PROCESS - HOW THE MODEL WAS TRAINED

### 7.1 Training Pipeline

```
Step 1: Load synthetic dataset (2,000 samples, 45 features)

Step 2: Data preprocessing
  - Normalize features (StandardScaler)
  - One-hot encode sports/positions
  - Remove outliers (IQR method)
  - Feature selection (variance > threshold)

Step 3: Train-test split
  - 1,400 training samples
  - 300 validation samples
  - 300 test samples
  - Stratified (maintain injury rate in each)

Step 4: Train XGBoost model
  - Initialize model with parameters
  - Fit model on training data
  - Parameters: max_depth=6, learning_rate=0.1, n_estimators=100

Step 5: Cross-validation
  - 5-fold cross-validation on training data
  - Evaluate on validation set
  - Calculate average AUC and standard deviation

Step 6: Evaluate on test set
  - Calculate accuracy, precision, recall, F1-score, ROC-AUC
  - Generate confusion matrix

Step 7: Save model
  - Serialize model to backend/ml/models/risk_classifier.pkl
  - Save metadata: feature names, performance metrics
```

### 7.2 Model Parameters

```python
XGBClassifier(
    max_depth=6,                    # Maximum tree depth
    learning_rate=0.1,              # Shrinkage (0.1 = slow learning)
    n_estimators=100,               # Number of trees to build
    objective='binary:logistic',    # Binary classification
    random_state=42,                # Reproducible results
    scale_pos_weight=3.14,          # Handle class imbalance
    subsample=0.8,                  # Use 80% of training data per tree
    colsample_bytree=0.8            # Use 80% of features per tree
)
```

### 7.3 Alternative Models Trained (Comparison)

The same dataset was used to train multiple models:

```
1. Random Forest
   - Accuracy: 95.67%
   - ROC-AUC: 0.9921

2. Gradient Boosting
   - Similar performance to XGBoost

3. LightGBM
   - Faster training than XGBoost
   - Similar accuracy

XGBoost was selected as primary due to good balance of:
- Accuracy (95.67%)
- Interpretability (tree-based)
- Training speed
- Inference speed
```

## 8. RUNTIME IMPLEMENTATION - HOW VIDEO IS PROCESSED

### 8.1 Backend Architecture

```
Frontend (React)
    ↓
FastAPI Endpoint: /api/videos/upload
    ↓
Video saved to storage/uploads/
    ↓
Background Worker (ThreadPoolExecutor)
    ↓
VideoProcessor class
    ├→ Frame extraction (10 FPS)
    ├→ Pose detection (MediaPipe)
    ├→ Feature extraction (BiomechanicalFeatureExtractor)
    ├→ Feature alignment with model
    ├→ ML inference (XGBoost prediction)
    ├→ Rule-based scoring
    ├→ Risk calculation
    └→ Save to database
    ↓
Frontend fetches results
```

### 8.2 Feature Extraction at Runtime

```python
# Pseudocode of the inference pipeline

1. Load model: risk_classifier = load('backend/ml/models/risk_classifier.pkl')

2. Load feature metadata: feature_names = [
    'knee_flexion_left', 'knee_flexion_right', ..., 'bmi'
   ]

3. For each video:
   a. Extract frames at 10 FPS
   b. Run MediaPipe Pose on each frame
   c. Calculate 45 features per frame
   d. Average features across all frames: feature_vector (45,)

4. Align features to model:
   feature_vector_aligned = reorder_to_match_training_order(feature_vector)

5. Normalize features:
   feature_vector_normalized = StandardScaler.transform(feature_vector_aligned)

6. Get ML prediction:
   ml_probability = risk_classifier.predict_proba(feature_vector_normalized)[0][1]
   # Output: probability of high-risk (0 to 1)

7. Calculate rule-based score:
   rule_score = weighted_sum([
     biomechanics_risk × 0.35,
     injury_history_risk × 0.20,
     asymmetry_risk × 0.20,
     training_load_risk × 0.15,
     fatigue_risk × 0.10
   ])

8. Combine scores:
   final_score = 0.70 × rule_score + 0.30 × ml_probability

9. Assign risk level:
   if final_score < 0.25: risk_level = "LOW"
   elif final_score < 0.50: risk_level = "MODERATE"
   elif final_score < 0.75: risk_level = "HIGH"
   else: risk_level = "CRITICAL"

10. Save to database:
    INSERT INTO risk_predictions (video_id, score, level, features, recommendations)
```

### 8.3 Database Storage

```
risk_predictions table:
- id: Unique prediction ID
- athlete_id: Athlete who uploaded video
- video_id: Video that was analyzed
- final_risk_score: The 0-1 risk score
- risk_level: LOW/MODERATE/HIGH/CRITICAL
- biomechanical_features: JSON of all 45 features
- ml_probability: XGBoost output (0-1)
- rule_based_score: Rule-based score component
- confidence_score: How confident the system is
- timestamp: When analysis was completed
- recommendations: Generated injury prevention recommendations
- anomalies_detected: Any unusual patterns

Example row:
{
  "final_risk_score": 0.46,
  "risk_level": "MODERATE",
  "ml_probability": 0.60,
  "rule_based_score": 0.40,
  "biomechanical_features": {
    "knee_flexion_left": 45.2,
    "knee_flexion_right": 42.8,
    "bilateral_symmetry": 0.92,
    "knee_valgus_left": 12.5,
    ...
  },
  "recommendations": [
    "Improve knee alignment during landing",
    "Strengthen hip stabilizers",
    "Reduce training load by 20%"
  ]
}
```

## 9. KNOWN LIMITATIONS AND TECHNICAL ISSUES

### 9.1 Data Quality

- Model trained on synthetic data only (500 athletes × 4 movements = 2,000 samples)
- No validation with real athlete videos yet
- Synthetic data may not capture all real-world movement variations
- Class imbalance: Only 15% injury cases in training data

### 9.2 Feature Consistency Issue

**Current issue:** Feature names used during training differ from names produced during runtime.

Training expects:
- movement_smoothness
- stride_variability_mean
- balance_sway_area_mean

Runtime produces:
- movement_smoothness_score
- stride_length_std
- sway_area

**Impact:** Feature alignment may fail if metadata.json names don't match extractor output.

**Resolution needed:** Create canonical feature schema used by all components (generation, training, extraction, inference).

### 9.3 Model Limitations

- Trained on 45 features extracted from MediaPipe landmarks only
- Does not use video appearance (e.g., footwear, clothing)
- Does not use external load (weights, resistance)
- Does not use heart rate or other biometric data
- XGBoost is a black box (hard to interpret individual tree decisions)

### 9.4 Video Input Constraints

- Requires full-body visibility (at least shoulders to feet)
- Optimal distance: 1-3 meters from camera
- Works best with side view (sagittal plane) for some movements
- Lighting and background can affect MediaPipe accuracy

### 9.5 Processing Time

- Frame extraction: ~0.1 seconds per 100 frames
- Pose detection: ~0.5 seconds per 100 frames (depends on hardware)
- Feature extraction: ~0.2 seconds per 100 frames
- ML inference: ~0.01 seconds (very fast)
- Total: ~1-2 seconds for 300-frame video (30 seconds of movement)

## 10. SUMMARY

**The ML pipeline works as follows:**

```
Video Upload
    ↓
Frame Extraction (10 FPS)
    ↓
MediaPipe Pose Detection (33 landmarks per frame)
    ↓
Biomechanical Feature Calculation (45 features)
    ↓
Feature Normalization (StandardScaler)
    ↓
XGBoost Prediction (ML probability output)
    ↓
Rule-Based Scoring (weighted component scores)
    ↓
Final Risk Calculation (70% rule + 30% ML)
    ↓
Risk Level Assignment (LOW/MODERATE/HIGH/CRITICAL)
    ↓
Database Storage + Recommendations
    ↓
Frontend Display
```

**The 45 features measure:**
- Joint angles and range of motion
- Movement velocity and quality
- Bilateral symmetry and stability
- Landing mechanics and gait patterns
- Fatigue indicators
- Athlete demographics (age, BMI)

**The XGBoost model:**
- Trained on 1,400 samples from synthetic data
- Achieves 95.67% accuracy on test set
- ROC-AUC: 0.9916 (excellent discrimination)
- Uses tree-based ensemble for robust classification

**The rule-based component:**
- Weights biomechanics (35%), injury history (20%), asymmetry (20%), training load (15%), fatigue (10%)
- Combined with ML output (70% rule + 30% ML)
- Produces final score normalized to 0-1 range

Regards,
Danny Soundaraj D

---

On Fri, Sep 4, 2026 at 3:05 PM Springboard mentor <springboardmentor10529m@gmail.com> wrote:

> Hi Danny,
>
> Please upload the documentation of the project (requirements, guidelines, features, working, outputs, tech stack, workflows, etc) and ER diagrams.
>
> Thanks & Regards
