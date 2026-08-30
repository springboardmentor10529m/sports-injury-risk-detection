# Datasets Documentation - AI Sport Injury Risk Detection Platform

This directory documents the public and reference datasets planned for model training, validation, and biomechanical calibration during **Week 3–8** of the project.

> [!NOTE]
> For Week 1–2 milestone deployment, large external datasets are not bundled directly into the repository to ensure lightweight installation. Placeholder service interfaces and MediaPipe Pose landmark trackers are active.

---

## 1. Human3.6M Dataset

- **Name**: Human3.6M (Large Scale 3D Human Pose Dataset)
- **Primary Purpose**: 3D keypoint estimation and joint spatial angle calculation (knee valgus angle, hip tilt, trunk lean).
- **Expected Usage**: Training 3D pose lifting networks (2D-to-3D keypoint lifting) for planar video analysis.
- **Integration Target**: Week 3–4 (`pose_estimation_service` & `biomechanics_service`).
- **Official Source**: [http://vision.imar.ro/human3.6m/](http://vision.imar.ro/human3.6m/)

---

## 2. MPII Human Pose Dataset

- **Name**: MPII Human Pose Dataset
- **Primary Purpose**: Multi-person 2D body pose estimation under unconstrained athletic conditions.
- **Expected Usage**: Benchmark model evaluation for high-velocity sports movements (running, sprinting, jumping).
- **Integration Target**: Week 3–4 (`pose_estimation_service`).
- **Official Source**: [http://human-pose.mpi-inf.mpg.de/](http://human-pose.mpi-inf.mpg.de/)

---

## 3. COCO Keypoints Dataset

- **Name**: MS COCO (Common Objects in Context) Keypoint Detection Dataset
- **Primary Purpose**: 17-keypoint skeletal landmark detection and baseline bounding box detection for athletes.
- **Expected Usage**: Fine-tuning object detection and landmark localization pipelines.
- **Integration Target**: Week 4 (`pose_estimation_service`).
- **Official Source**: [https://cocodataset.org/#keypoints-2020](https://cocodataset.org/#keypoints-2020)

---

## 4. SportsPose Dataset

- **Name**: SportsPose: A Dynamic 3D Sports Pose Dataset
- **Primary Purpose**: Dynamic high-speed movements, jump landing mechanics, cutting maneuvers, and fast direction changes.
- **Expected Usage**: Training deep neural networks for movement quality assessment and acute anomaly detection.
- **Integration Target**: Week 5 (`movement_anomaly_service` & `risk_scoring_service`).
- **Official Source**: Academic SportsPose Repository.

---

## 5. FIFA Injury Dataset (Reference Framework)

- **Name**: FIFA Football Medicine & Epidemiological Injury Dataset Reference
- **Primary Purpose**: Epidemiological risk matrix calibration for lower-limb sports injuries (ACL strain, hamstring tears, ankle sprains).
- **Expected Usage**: Weighting heuristic risk matrices in the prediction engine based on historical injury recurrence rates.
- **Integration Target**: Week 5–6 (`risk_prediction_service` & `recommendation_service`).

---

## Connection Pipeline Architecture

```
Raw Video Stream
       │
       ▼
Pose Landmark Extraction (COCO / Human3.6M / MPII)
       │
       ▼
Biomechanical Kinematics (SportsPose Joint Angles)
       │
       ▼
Injury Risk Probability Matrix (FIFA Epidemiological Weights)
       │
       ▼
Corrective Training Recommendations
```
