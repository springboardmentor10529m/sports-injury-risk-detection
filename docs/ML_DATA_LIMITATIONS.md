# Machine Learning & Data Limitations

## 1. Separation of Pose Datasets from Clinical Injury Datasets

In sports machine learning research, a frequent methodological error is confusing **Human Pose Estimation benchmarks** (e.g. COCO Keypoints, MPII, Human3.6M) with **Injury Outcome Datasets**:
- Pose datasets benchmark the precision with which an artificial vision model identifies joint pixel coordinates $(x, y)$ in RGB frames.
- Pose datasets contain **zero clinical outcomes**, injury diagnoses, or athlete medical histories.
- Any attempt to label a COCO pose as "ACL injured" or "healthy" produces synthetic, non-generalizable pseudo-labels.

**AthleteGuard adheres to strict methodological integrity**:
- **COCO 2017** is used exclusively to evaluate keypoint spatial localization in our RTMPose-M and Keypoint R-CNN backends.
- **Supervised injury risk prediction** is trained exclusively on clinical and research cohorts containing verified subject $\rightarrow$ movement/workload $\rightarrow$ injury event histories (Lövdal et al. 2021, Swathikiran 2021).

---

## 2. 2D Kinematic Estimates vs Clinical 3D Motion Capture

1. **Monocular Camera Constraints**:
   - The video processing pipeline ingests monocular video feeds (smartphones, broadcast footage, or standard action cameras).
   - Pose estimators extract $(x, y)$ pixel coordinates projected onto the 2D image sensor plane.
   - Out-of-plane rotations (e.g., transverse plane tibial rotation) cannot be calculated without multi-camera stereoscopic calibration.
2. **Knee Valgus Kinematic Proxy**:
   - The reported knee valgus angle is a **2D planar projection proxy** $(\Delta = |180^\circ - \angle(\text{hip}, \text{knee}, \text{ankle})|)$.
   - While strongly correlated with medial knee collapse during landing in front-facing camera angles, it must not be conflated with multi-camera 3D motion capture laboratory measurements.
3. **Frontend Three.js Skeleton Clarification**:
   - The 3D Three.js interactive skeleton rendered in the frontend UI is a **spatial biomechanical visualization** driven by calibrated 2D kinematic telemetry, limb segment constraints, and temporal smoothing. It does not represent multi-camera marker-based 3D clinical kinematics.

---

## 3. Kinetic Loading Proxy vs Direct Ground Reaction Force (GRF)

- True kinetic measurements (e.g., peak vertical ground reaction force, center of pressure excursions) require laboratory-grade multi-axis piezoelectric force plates.
- When force plate instrumentation is absent, the system computes a **kinematic loading proxy** derived from segment accelerations and body mass estimates.
- The platform explicitly states **"Kinetic Loading Proxy"** rather than claiming direct ground reaction force measurement.

---

## 4. Multi-Injury Scope & Data Availability

Where verified labels exist in public research cohorts:
- **Overuse Running Injuries**: Supported and trained on longitudinal training logs.
- **Lower Limb Musculoskeletal Strains**: Supported and trained on match workloads and mobility screens.

Where verified public cohorts do not currently exist in open, unauthenticated format:
- **Acute Anterior Cruciate Ligament (ACL) Ruptures with Arthroscopic Confirmation**: Not trained as a separate supervised ML classifier due to absence of public video cohorts with surgical ground truth. The platform uses verified kinematic screening proxies (knee valgus collapse, bilateral asymmetry) to flag risk.
- **Hamstring High-Velocity Tears**: Assessed via sprint workload metrics and bilateral hip extension asymmetry.
- **Acute Inversion Ankle Sprains**: Assessed via postural sway and landing asymmetry metrics.
