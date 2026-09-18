# Technical Details & Biomechanical Formulations

This document describes the mathematical principles, computer vision keypoint models, statistical normalization techniques, machine learning architecture, and risk assessment equations implemented in **SportShield**.

---

## 1. Computer Vision & 33 Skeletal Landmarks

SportShield uses **Google MediaPipe PoseLandmarker** (`pose_landmarker_lite.task` / `vision.PoseLandmarker`) to detect 33 3D body keypoints per video frame. Each landmark $i \in [0, 32]$ returns normalized coordinates:
- $x \in [0.0, 1.0]$: Horizontal position normalized by image width.
- $y \in [0.0, 1.0]$: Vertical position normalized by image height.
- $z \in \mathbb{R}$: Depth relative to the midpoint between the hips (scaled roughly with $x$).
- $\text{visibility} \in [0.0, 1.0]$: Model confidence that the keypoint is not occluded.

### Full 33-Landmark Mapping Table

| Landmark ID | Anatomical Keypoint | Body Region | Primary Usage in SportShield |
| :--- | :--- | :--- | :--- |
| `0` | **Nose** | Head / Face | Head position & posture reference |
| `1`, `2`, `3` | **Left Eye (Inner, Center, Outer)** | Head / Face | Head tilt tracking |
| `4`, `5`, `6` | **Right Eye (Inner, Center, Outer)** | Head / Face | Head tilt tracking |
| `7`, `8` | **Left Ear / Right Ear** | Head / Face | Cervical alignment reference |
| `9`, `10` | **Mouth (Left / Right)** | Head / Face | Facial reference |
| `11` | **Left Shoulder** | Upper Torso | Trunk lateral lean, upper limb kinematics |
| `12` | **Right Shoulder** | Upper Torso | Trunk lateral lean, shoulder alignment |
| `13` | **Left Elbow** | Upper Arm | Elbow flexion angle |
| `14` | **Right Elbow** | Upper Arm | Elbow flexion angle |
| `15` | **Left Wrist** | Arm / Hand | Upper extremity trajectory |
| `16` | **Right Wrist** | Arm / Hand | Upper extremity trajectory |
| `17`, `19`, `21` | **Left Pinky / Index / Thumb** | Hand | Hand position tracking |
| `18`, `20`, `22` | **Right Pinky / Index / Thumb** | Hand | Hand position tracking |
| `23` | **Left Hip (ASIS proxy)** | Pelvis / Lower Torso | Knee flexion, hip angle, pelvic drop, center of mass |
| `24` | **Right Hip (ASIS proxy)** | Pelvis / Lower Torso | Knee flexion, hip angle, pelvic drop, center of mass |
| `25` | **Left Knee** | Lower Limb | Knee valgus, knee flexion angle, ROM, bilateral symmetry |
| `26` | **Right Knee** | Lower Limb | Knee valgus, knee flexion angle, ROM, bilateral symmetry |
| `27` | **Left Ankle** | Lower Limb | Ankle angle, stride length, valgus axis |
| `28` | **Right Ankle** | Lower Limb | Ankle angle, stride length, valgus axis |
| `29` | **Left Heel** | Foot | Plantar contact & gait phase detection |
| `30` | **Right Heel** | Foot | Plantar contact & gait phase detection |
| `31` | **Left Foot Index (Toe)** | Foot | Ankle flexion angle, foot progression angle |
| `32` | **Right Foot Index (Toe)** | Foot | Ankle flexion angle, foot progression angle |

---

## 2. Mathematical Kinematic Formulations

All calculations are implemented in `backend/biomechanics.py`.

### A. 3D Spatial Joint Angle Calculation
Given three keypoints $A$, $B$, and $C$, the 3D angle $\theta$ at joint $B$ is calculated using the dot product of vectors $\vec{BA}$ and $\vec{BC}$:

$$\vec{BA} = [A_x - B_x,\; A_y - B_y,\; A_z - B_z]$$

$$\vec{BC} = [C_x - B_x,\; C_y - B_y,\; C_z - B_z]$$

$$\cos(\theta) = \frac{\vec{BA} \cdot \vec{BC}}{\|\vec{BA}\| \|\vec{BC}\|}$$

$$\theta = \arccos\left(\text{clamp}\left(\cos(\theta), -1.0, 1.0\right)\right) \times \frac{180}{\pi}$$

### B. Dynamic Knee Valgus Angle (2D Frontal Plane Projection)
Dynamic Knee Valgus measures the medial inward collapse of the knee relative to the mechanical axis connecting the hip center and ankle joint:

$$\vec{v}_{hk} = [Knee_x - Hip_x,\; Knee_y - Hip_y]$$

$$\vec{v}_{ka} = [Ankle_x - Knee_x,\; Ankle_y - Knee_y]$$

$$\theta_{valgus} = \arccos\left( \frac{\vec{v}_{hk} \cdot \vec{v}_{ka}}{\|\vec{v}_{hk}\| \|\vec{v}_{ka}\|} \right) \times \frac{180}{\pi}$$

$$\text{Valgus Deviation} = |\theta_{valgus}|$$

- **Normal Athletic Reference**: $< 10.0^\circ$ (Safe)
- **High Risk Threshold**: $\ge 12.0^\circ$ (Elevated non-contact ACL strain)

### C. Trunk Lateral Lean Deviation
Measures coronal plane spinal tilt away from the vertical gravity axis:

$$\Delta x = \text{Midpoint}(Shoulder_x) - \text{Midpoint}(Hip_x)$$

$$\Delta y = \text{Midpoint}(Shoulder_y) - \text{Midpoint}(Hip_y)$$

$$\theta_{trunk} = \arctan2\left( |\Delta x|,\; |\Delta y| + 10^{-6} \right) \times \frac{180}{\pi}$$

- **Normal Reference**: $< 10.0^\circ$

### D. Range of Motion (ROM)
Peak-to-peak amplitude of knee excursion across the movement cycle:

$$\text{ROM}_{knee} = \max(\theta_{knee}(t)) - \min(\theta_{knee}(t))$$

- **Normal Reference**: $\ge 60.0^\circ$

### E. Bilateral Kinematic Symmetry Score
Calculated as the percentage concordance between left and right limb kinematics:

$$\text{Symmetry} = \text{clamp}\left( 100.0 - \left( \frac{|\bar{\theta}_{L} - \bar{\theta}_{R}|}{\max(\bar{\theta}_{L}, \bar{\theta}_{R}) + 10^{-6}} \times 100.0 \right),\; 50.0,\; 100.0 \right)$$

- **Optimal Reference**: $\ge 80.0\%$

### F. Hip Stability Score (Pelvic Vertical Invariance)
Measures the standard deviation of pelvic vertical position over the sampled trajectory:

$$\text{Stability}_{hip} = \text{clamp}\left( 100.0 - (\sigma(Hip_y) \times 400.0),\; 40.0,\; 100.0 \right)$$

- **Optimal Reference**: $\ge 75.0\%$

### G. Composite Movement Quality Index
A weighted index of symmetry, alignment, and trunk posture:

$$\text{Quality} = \text{clamp}\Big( 0.35 \times \text{Symmetry} + 0.35 \times \text{Alignment} + 0.30 \times \max(0, 100 - 2 \cdot \theta_{trunk}),\; 40.0,\; 98.0 \Big)$$

---

## 3. Supervised Machine Learning Pipeline

SportShield implements a supervised **Random Forest Classifier** (`backend/ml_pipeline.py`) trained on `Project-Injury-Dataset.csv`.

### Input Feature Vector (7 Features)
1. `knee_valgus_angle_deg`: Mean peak frontal knee valgus.
2. `hip_stability_score`: Vertical pelvic stability (0–100).
3. `trunk_lateral_flexion_deg`: Lateral trunk lean deviation.
4. `range_of_motion_deg`: Functional knee joint range of motion.
5. `bilateral_symmetry_pct`: Inter-limb symmetry percentage.
6. `movement_smoothness_score`: Movement quality index (0–100).
7. `rpe_fatigue_score`: Rated perceived exertion / motor fatigue (1–10).

### Data Preprocessing & Model Architecture
- **Preprocessing**: `StandardScaler` fitted on training split.
- **Model**: `RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)`.
- **Target Variable**: `injury_risk_level` (`LOW`, `MODERATE`, `HIGH`).
- **Validation**: Stratified 75/25 Train-Test split.

### Model Performance Metrics
- **Test Accuracy**: Evaluated on test partition.
- **Evaluation Metrics**: Multi-class weighted Precision, Recall, F1-Score, and Confusion Matrix.
- **Probability Extraction**: Outputs class probabilities $P(\text{LOW})$, $P(\text{MODERATE})$, $P(\text{HIGH})$ to drive continuous risk scores.

---

## 4. 6-Category Deterministic Risk Scoring Engine

Implemented in `backend/risk_rules.py`. Each formula outputs a risk percentage bounded in $[5.0\%, 95.0\%]$.

### 1. ACL / Knee Ligament Risk
$$\text{Risk}_{ACL} = \Big[ 3.8 \times \max(0, \text{Valgus} - 7.0) + 0.45 \times (100 - \text{Symmetry}) + 0.36 \times (100 - \text{Balance}) \Big] \times F_{pos}$$

### 2. Hamstring Strain Risk
$$\text{Risk}_{Hamstring} = \Big[ 0.88 \times (100 - \text{Flexibility}) + 0.54 \times \max(0, 75.0 - \text{ROM}) + 0.6 \times \text{Fatigue} \Big] \times F_{pos}$$

### 3. Ankle Sprain Risk
$$\text{Risk}_{Ankle} = \Big[ 1.0 \times (100 - \text{Balance}) + 2.0 \times \max(0, \text{Valgus} - 9.0) + 0.36 \times (100 - \text{Symmetry}) \Big] \times F_{pos}$$

### 4. Shoulder Impingement Risk
$$\text{Risk}_{Shoulder} = \Big[ 0.8 \times (100 - \text{Symmetry}) + 0.54 \times (100 - \text{Strength}) + 1.5 \times \max(0, \text{TrunkLean} - 10.0) \Big] \times F_{pos}$$

### 5. Lower Back Strain Risk
$$\text{Risk}_{LowerBack} = \Big[ 3.5 \times \max(0, \text{TrunkLean} - 8.0) + 0.7 \times (100 - \text{HipStability}) + 0.36 \times (100 - \text{Flexibility}) \Big] \times F_{pos}$$

### 6. Overuse Syndrome Risk
$$\text{Risk}_{Overuse} = \Big[ 0.4 \times \text{TrainingLoad} + 0.4 \times \text{Fatigue} + 0.2 \times (100 - \text{MovementQuality}) \Big] \times F_{pos}$$

### Playing Position Multipliers ($F_{pos}$)
- **Cutting / Pivoting** (Striker, Forward, Winger, Point Guard, Defender): $+20\%$ ACL, $+15\%$ Ankle.
- **Overhead / Throwing** (Pitcher, Quarterback, Bowler, Setter, Goalkeeper): $+30\%$ Shoulder, $+15\%$ Lower Back.
- **Endurance / Locomotion** (Runner, Midfielder, Sprinter): $+25\%$ Overuse, $+20\%$ Hamstring.
