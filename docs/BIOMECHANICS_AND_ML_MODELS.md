# Biomechanics & Machine Learning Models Specification

---

## 1. Overview & Computer Vision Pipeline

The **Sports Injury Risk Detection Platform** integrates real-time computer vision, spatial geometry, and supervised machine learning to extract 3D kinematic parameters from human movement videos and forecast joint-specific injury risks.

```
                    Raw Video (MP4 / MOV)
                              │
                              ▼
                 FFMPEG Video Standardization
               (H.264 / yuv420p / 30-60 FPS)
                              │
                              ▼
               MediaPipe BlazePose 33-Landmarks
            (World Coordinates [x, y, z, visibility])
                              │
                              ▼
            Biomechanical Kinematics Engine
       (Knee Valgus, Trunk Lean, Hip Sway, ROM)
                              │
                              ▼
             Isolation Forest Anomaly Detection
           (Benchmarking vs SportsPose & Human3.6M)
                              │
                              ▼
            Supervised ML Models (RF & XGBoost)
            + 5-Factor Weighted Risk Scoring
                              │
                              ▼
       Granular Joint Risk Scores & Clinical Protocols
```

---

## 2. 3D Pose Estimation: BlazePose 33-Landmark Schema

The vision subsystem utilizes **MediaPipe BlazePose** to predict 33 3D skeletal landmarks per frame. The landmark topology provides both 2D image coordinates ($x, y \in [0.0, 1.0]$) and 3D metric world coordinates ($x, y, z$ in meters centered around the midpoint of hips).

### BlazePose Keypoint Map

| Landmark ID | Anatomical Joint | Region |
| :--- | :--- | :--- |
| `0` | Nose | Cranial / Head |
| `11, 12` | Left / Right Shoulder | Upper Extremity |
| `13, 14` | Left / Right Elbow | Upper Extremity |
| `15, 16` | Left / Right Wrist | Upper Extremity |
| `23, 24` | Left / Right Hip (Anterior Superior Iliac Spine) | Core / Pelvis |
| `25, 26` | Left / Right Knee (Lateral / Medial Condyle) | Lower Extremity |
| `27, 28` | Left / Right Ankle (Lateral Malleolus) | Lower Extremity |
| `29, 30` | Left / Right Heel | Lower Extremity |
| `31, 32` | Left / Right Foot Index (Toes) | Lower Extremity |

---

## 3. Mathematical Formulations of Kinematic Features

### 3.1 3D Joint Angle Calculation
The spatial angle $\theta$ (in degrees) formed at joint vertex $B$ by connecting segments $BA$ and $BC$ is computed using the Euclidean dot product:

$$\mathbf{v}_{ba} = \mathbf{A} - \mathbf{B}, \quad \mathbf{v}_{bc} = \mathbf{C} - \mathbf{B}$$

$$\cos(\theta) = \frac{\mathbf{v}_{ba} \cdot \mathbf{v}_{bc}}{\|\mathbf{v}_{ba}\|_2 \|\mathbf{v}_{bc}\|_2 + \epsilon}$$

$$\theta = \arccos\left(\text{clamp}(\cos(\theta), -1.0, 1.0)\right) \times \frac{180^\circ}{\pi}$$

Where:
- **Knee Flexion Angle:** Computed with $A = \text{Hip}$, $B = \text{Knee}$, $C = \text{Ankle}$.
- **Hip Flexion Angle:** Computed with $A = \text{Shoulder}$, $B = \text{Hip}$, $C = \text{Knee}$.

---

### 3.2 Knee Valgus Ratio & Medial Collapse
Knee valgus collapse is one of the highest clinical indicators of **Anterior Cruciate Ligament (ACL)** tears. It represents excessive inward medial movement of the knees relative to the ankles and hips during deceleration, landing, or deep flexion phases.

The **Knee Valgus Ratio ($VR$)** is defined by:

$$VR = \frac{D_{\text{knees}}}{D_{\text{ankles}}} = \frac{\|\mathbf{Knee}_{\text{left}} - \mathbf{Knee}_{\text{right}}\|_{xy}}{\|\mathbf{Ankle}_{\text{left}} - \mathbf{Ankle}_{\text{right}}\|_{xy} + \epsilon}$$

#### Clinical Categorization
- **Normal Knee Tracking ($VR \ge 0.85$):** Knees remain aligned with the patellar-foot progression vector.
- **Borderline Dynamic Valgus ($0.70 \le VR < 0.85$):** Mild medial knee drift; targeted neuromuscular feedback recommended.
- **Excessive Valgus Collapse ($VR < 0.70$ or medial angular deviation $> 15^\circ$):** Severe ACL strain vector; flagged as high priority.

---

### 3.3 Forward Trunk Lean Angle
Forward trunk lean measures pelvic and thoracic displacement relative to the vertical gravity vector:

$$\mathbf{v}_{\text{spine}} = \frac{\mathbf{Shoulder}_{\text{left}} + \mathbf{Shoulder}_{\text{right}}}{2} - \frac{\mathbf{Hip}_{\text{left}} + \mathbf{Hip}_{\text{right}}}{2}$$

$$\theta_{\text{trunk}} = \left| \arctan2\left(v_{\text{spine}, x}, -v_{\text{spine}, y}\right) \right| \times \frac{180^\circ}{\pi}$$

- **Optimal Range:** $10^\circ - 20^\circ$ during athletic squat/landing.
- **Abnormal Forward Tilt ($> 25^\circ$):** Indicates erector spinae weakness or quad-dominant recruitment patterns, increasing lower back shear strain.

---

### 3.4 Lateral Hip Sway & Pelvic Stability Index
Evaluates coronal core stability by computing the standard deviation of the midpoint hip lateral coordinate ($X$) across all frames in the movement:

$$\mu_x = \frac{1}{N} \sum_{t=1}^N X_{\text{mid-hip}}(t)$$

$$\sigma_{\text{sway}} = \sqrt{\frac{1}{N} \sum_{t=1}^N \left( X_{\text{mid-hip}}(t) - \mu_x \right)^2}$$

$$\text{Balance Score} = \max\left(1.0, 10.0 - (\sigma_{\text{sway}} \times 100.0 \times 1.5)\right)$$

---

### 3.5 Bilateral Symmetry Percentage
Quantifies left-to-right kinematic asymmetry across joint ranges of motion:

$$\Delta_{\text{knee}} = \left| \text{ROM}_{\text{knee, left}} - \text{ROM}_{\text{knee, right}} \right|$$

$$\Delta_{\text{hip}} = \left| \text{ROM}_{\text{hip, left}} - \text{ROM}_{\text{hip, right}} \right|$$

$$\text{Symmetry Score (\%)} = \max\left(0.0, 100.0 - \left( \frac{\Delta_{\text{knee}} + \Delta_{\text{hip}}}{2} \times 0.75 \right) \right)$$

Asymmetries exceeding $15\%$ ($\text{Symmetry} < 85\%$) are strong predictors of contralateral compensation injuries.

---

## 4. Anomaly Detection & Reference Baselines

The platform benchmarks extracted joint range of motion against normative athletic kinematics derived from peer-reviewed sports science datasets:
1. **SportsPose Dataset:** High-speed motion-capture kinematics across squats, jump-landings, and directional cuts.
2. **Human3.6M Dataset:** Baseline anatomical posture distributions.

### Normative Range Schema

| Movement Pattern | Joint Target | Normative Range (ROM) |
| :--- | :--- | :--- |
| **Squatting** | Knee Flexion / Extension | $60.0^\circ - 110.0^\circ$ |
| | Hip Flexion / Extension | $70.0^\circ - 120.0^\circ$ |
| **Landing** | Knee Flexion / Extension | $40.0^\circ - 90.0^\circ$ |
| | Hip Flexion / Extension | $50.0^\circ - 100.0^\circ$ |
| **General Athletic** | Knee Flexion / Extension | $50.0^\circ - 100.0^\circ$ |
| | Hip Flexion / Extension | $60.0^\circ - 110.0^\circ$ |

### Anomaly Score Formulation ($s_{\text{anomaly}}$)
For each joint metric $j$ with reference range $[min_j, max_j]$:

$$d_j = \begin{cases} 
\frac{min_j - v_j}{min_j} & \text{if } v_j < min_j \\ 
\frac{v_j - max_j}{max_j} & \text{if } v_j > max_j \\ 
0 & \text{otherwise} 
\end{cases}$$

$$s_{\text{anomaly}} = \min\left(1.0, \frac{1}{|J|} \sum_{j \in J} d_j\right)$$

---

## 5. Machine Learning Models & Risk Classification

### 5.1 Model Architecture
- **Isolation Forest:** Unsupervised spatial outlier detection isolating kinematic feature vectors outside normal distribution clusters.
- **Random Forest Classifier (Ensemble):** 100 decision trees trained with Gini impurity criterion to predict multi-class injury categories based on joint kinematics, athlete age, BMI, and training load.
- **XGBoost (Extreme Gradient Boosting):** Gradient-boosted decision trees (learning rate $\eta = 0.05$, max depth $= 6$) predicting probability distributions across:
  1. ACL Injury Risk ($P_{\text{ACL}}$)
  2. Hamstring Strain Risk ($P_{\text{Hamstring}}$)
  3. Ankle Sprain Risk ($P_{\text{Ankle}}$)
  4. Shoulder Impingement Risk ($P_{\text{Shoulder}}$)
  5. Lower Back Strain Risk ($P_{\text{Back}}$)

---

## 6. 5-Factor Weighted Risk Decomposition Formula

To provide clinical transparency, the platform decomposes overall injury probability into 5 weighted biomechanical vectors totaling $100\%$:

$$S_{\text{overall}} = F_{\text{kinematics}} + F_{\text{load}} + F_{\text{asymmetry}} + F_{\text{velocity}} + F_{\text{prior}}$$

```
+--------------------------------------------------------------------------------+
|                 COMPOSITE INJURY RISK DECOMPOSITION (100 PTS)                  |
|                                                                                |
|  [30%] Factor 1: Joint Kinematics & Valgus Angle           (Max 30.0 pts)      |
|  [25%] Factor 2: Acute-to-Chronic Training Load (ACWR)     (Max 25.0 pts)      |
|  [20%] Factor 3: Bilateral Limb Asymmetry Deficit          (Max 20.0 pts)      |
|  [15%] Factor 4: Trunk Lean & Angular Velocity             (Max 15.0 pts)      |
|  [10%] Factor 5: Prior Injury History & Age Factor         (Max 10.0 pts)      |
+--------------------------------------------------------------------------------+
```

### 1. Factor 1: Joint Kinematics & Valgus ($F_{\text{kinematics}}$, Max 30.0 pts)
$$F_{\text{kinematics}} = \min(30.0, \max(2.0, \text{Base}_{\text{valgus}} + 5.0 \cdot s_{\text{anomaly}}))$$
- $\text{Base}_{\text{valgus}} = 24.5$ if Knee Valgus detected.
- $\text{Base}_{\text{valgus}} = 15.0$ if Borderline.
- $\text{Base}_{\text{valgus}} = 6.0$ if Normal.

### 2. Factor 2: Training Load & ACWR Fatigue ($F_{\text{load}}$, Max 25.0 pts)
$$F_{\text{load}} = \min\left(25.0, \max\left(3.0, \frac{\text{Load}}{10.0} \cdot 18.0 + \Delta_{\text{overload}}\right)\right)$$

### 3. Factor 3: Bilateral Asymmetry ($F_{\text{asymmetry}}$, Max 20.0 pts)
$$F_{\text{asymmetry}} = \min(20.0, \max(1.5, (100.0 - \text{Symmetry}) \cdot 1.25))$$

### 4. Factor 4: Movement Velocity & Trunk Lean ($F_{\text{velocity}}$, Max 15.0 pts)
$$F_{\text{velocity}} = \min\left(15.0, \max\left(1.5, \frac{\theta_{\text{trunk}}}{30.0} \cdot 7.5 + (10.0 - \text{Balance}) \cdot 0.75\right)\right)$$

### 5. Factor 5: Prior Injury & Age Factor ($F_{\text{prior}}$, Max 10.0 pts)
$$F_{\text{prior}} = \min(10.0, \max(1.0, \text{Score}_{\text{history}} + \text{Score}_{\text{age}}))$$

---

## 7. Clinical Risk Bands & Thresholds

| Risk Category | Score Range | Clinical Meaning & Prescribed Action |
| :--- | :--- | :--- |
| **Low** | $0.0\% - 41.9\%$ | Biomechanically sound movement. Standard maintenance conditioning. |
| **Moderate** | $42.0\% - 64.9\%$ | Minor compensations or elevated fatigue. Assign corrective mobility drills. |
| **High** | $65.0\% - 81.9\%$ | Pronounced medial valgus or bilateral deficit. Restrict load, assign targeted rehab. |
| **Critical** | $82.0\% - 100.0\%$ | Acute injury vulnerability. Halt high-intensity drills immediately; full medical exam. |
