# Computer Vision Sports Pose Estimation & Biomechanics Pipeline

> **IMPORTANT DISCLAIMER**  
> *This system provides computer-vision-based movement and biomechanical screening. It is not a medical diagnosis system.*

---

## 🎯 System Architecture Overview

The pipeline extends the core web application with an asynchronous computer-vision movement processing engine:

```
VIDEO FILE (backend/uploads/videos/)
  ↓
OPENCV SEQUENTIAL FRAME READER (15 FPS target)
  ↓
PRETRAINED RTMPose-M MODEL (17 COCO Keypoints)
  ↓
PRIMARY ATHLETE TRACKING (IoU / BBox area tracking, person_id = 1)
  ↓
TEMPORAL SMOOTHING (One Euro Filter with EMA fallback)
  ↓
ANNOTATED SKELETON VIDEO RENDERING (backend/uploads/processed/)
  ↓
BIOMECHANICS ENGINE
  ├── 3-Point Joint Angles (Left/Right Knees, Hips, Ankles, Elbows, Shoulders)
  ├── Normalized Coordinates (0.0 to 1.0 screen ratio)
  ├── Image-Derived Kinematics (Angular velocity, acceleration, relative movement velocity)
  └── Bilateral Symmetry Analysis (Left vs Right angle deltas)
  ↓
DATABASE PERSISTENCE (AnalysisJob, PoseFrame, BiomechanicsFrame)
  ↓
FRONTEND DASHBOARD (Synchronized video playback & interactive time-series charts)
```

---

## 📌 COCO 17 Keypoints Representation

| Index | Keypoint Name | Index | Keypoint Name |
| :--- | :--- | :--- | :--- |
| `0` | `nose` | `9` | `left_wrist` |
| `1` | `left_eye` | `10` | `right_wrist` |
| `2` | `right_eye` | `11` | `left_hip` |
| `3` | `left_ear` | `12` | `right_hip` |
| `4` | `right_ear` | `13` | `left_knee` |
| `5` | `left_shoulder` | `14` | `right_knee` |
| `6` | `right_shoulder` | `15` | `left_ankle` |
| `7` | `left_elbow` | `16` | `right_ankle` |
| `8` | `right_elbow` | | |

---

## 📐 Biomechanical Calculations

### 1. Joint Angles
Computed at joint vertex $B$ using vectors $BA$ and $BC$:
$$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{\|\vec{BA}\| \|\vec{BC}\|}\right)$$

- **Knees**: `hip` → `knee` → `ankle`
- **Hips**: `shoulder` → `hip` → `knee`
- **Ankles**: `knee` → `ankle` → `foot_offset`
- **Elbows**: `shoulder` → `elbow` → `wrist`
- **Shoulders**: `elbow` → `shoulder` → `hip`
- **Trunk Lean**: Angle of mid-shoulder to mid-hip relative to vertical axis
- **Shoulder & Hip Alignment**: Angle of shoulder and hip segments relative to horizontal

### 2. Kinematics
- **Angular Velocity**: $\omega = \frac{\Delta \theta}{\Delta t}$ ($\text{deg/s}$)
- **Angular Acceleration**: $\alpha = \frac{\Delta \omega}{\Delta t}$ ($\text{deg/s}^2$)
- **Relative Movement Velocity**: $\text{norm\_units/s}$

### 3. Left/Right Symmetry
- Absolute angle differences: $| \text{Angle}_{\text{left}} - \text{Angle}_{\text{right}} |$
- Lower limb asymmetry index

---

## 🌐 API Endpoints Summary

- `POST /api/analysis/videos/{video_id}/analyse`: Queues background task.
- `GET /api/analysis/{analysis_id}/status`: Job status and progress.
- `GET /api/analysis/{analysis_id}`: Full job metadata.
- `GET /api/analysis/{analysis_id}/keypoints`: Frame-by-frame 17-keypoint trajectory sequences.
- `GET /api/analysis/{analysis_id}/biomechanics`: Frame-by-frame joint angles and symmetry metrics.
- `GET /api/analysis/{analysis_id}/skeleton-video`: Serves rendered skeleton MP4 video.
- `GET /api/analysis/{analysis_id}/download/keypoints`: Downloads keypoints in JSON or CSV.
- `GET /api/analysis/{analysis_id}/download/biomechanics`: Downloads biomechanics CSV.

*All endpoints enforce strict user ownership (`analysis.user_id == current_user.user_id`).*
