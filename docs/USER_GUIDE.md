# Sports Injury Risk Detection Platform
## End-to-End User & Clinical Guide

---

### Table of Contents
1. [Introduction](#1-introduction)
2. [Role-Based Access & Personas](#2-role-based-access--personas)
3. [Quick Start & Demo Logins](#3-quick-start--demo-logins)
4. [Athlete Workflow](#4-athlete-workflow)
   - [Profile Setup](#41-profile-setup)
   - [Video Recording Best Practices](#42-video-recording-best-practices)
   - [Uploading Videos](#43-uploading-videos)
   - [Viewing Analysis & Dual-Player Skeleton](#44-viewing-analysis--dual-player-skeleton)
   - [Executing Corrective Drills](#45-executing-corrective-drills)
5. [Coach Workflow](#5-coach-workflow)
   - [Team Roster & Workload Management](#51-team-roster--workload-management)
   - [Team Injury Risk Radar](#52-team-injury-risk-radar)
   - [High-Risk Intervention](#53-high-risk-intervention)
6. [Physiotherapist Workflow](#6-physiotherapist-workflow)
   - [Clinical Joint Range of Motion (ROM)](#61-clinical-joint-range-of-motion-rom)
   - [Bilateral Symmetry & Compensation Analysis](#62-bilateral-symmetry--compensation-analysis)
   - [Prescribing Targeted Corrective Protocols](#63-prescribing-targeted-corrective-protocols)
7. [Sports Scientist Workflow](#7-sports-scientist-workflow)
   - [Kinematic Benchmark Comparisons](#71-kinematic-benchmark-comparisons)
   - [Anomaly Deviation Scores](#72-anomaly-deviation-scores)
   - [Longitudinal Research Cohort Exports](#73-longitudinal-research-cohort-exports)
8. [Administrator Workflow](#8-administrator-workflow)
   - [User Management & Role Assignment](#81-user-management--role-assignment)
   - [System Observability & Model Status](#82-system-observability--model-status)
9. [Notification & Alert Center](#9-notification--alert-center)
10. [Clinical Reporting & CSV Exports](#10-clinical-reporting--csv-exports)

---

## 1. Introduction

The **AI-Powered Sports Injury Risk Detection Platform** is a web-based biomechanical analysis and injury prevention tool. By combining 3D pose estimation (**MediaPipe BlazePose**) with machine learning classifiers and sports medicine heuristics, the system gives practitioners and athletes instant insight into movement vulnerabilities.

---

## 2. Role-Based Access & Personas

The platform provides customized user interfaces tailored to 5 sports medicine personas:

| Role | Primary Objectives | Key Features |
| :--- | :--- | :--- |
| **Athlete** | Self-monitoring, exercise execution | Upload personal videos, view dual-player skeleton, track individual risk scores, complete corrective drills. |
| **Coach** | Team availability, load optimization | Team roster overview, risk matrix, radar charts, athlete workload tracking. |
| **Physiotherapist** | Rehab management, corrective prescription | Joint ROM inspection, valgus collapse tracking, bilateral symmetry evaluation, custom exercise assignment. |
| **Sports Scientist** | Biomechanical research, anomaly detection | SportsPose/Human3.6M normative benchmarks, anomaly scores, cohort research exports. |
| **Administrator** | Governance, system maintenance | Account management, role elevation, service health telemetry. |

---

## 3. Quick Start & Demo Logins

For demonstration and testing purposes, pre-configured accounts are provided:

- **Coach Demo:**
  - **Email:** `coach.k@example.com`
  - **Password:** `password123`
  - **Role:** `Coach`
- **Athlete Demo:**
  - **Email:** `jordan.spieth@example.com`
  - **Password:** `password123`
  - **Role:** `Athlete`

To switch roles, an administrator can update the user's role in the Admin Panel or via the API.

---

## 4. Athlete Workflow

### 4.1 Profile Setup
1. Navigate to **Profile** in the sidebar.
2. Enter your physical metrics:
   - **Demographics:** Age, Gender, Height (cm), Weight (kg).
   - **Sport Details:** Primary sport (e.g. Football, Basketball, Track) and position.
   - **Workload:** Average weekly training hours.
   - **Physical Baseline Scores:** Flexibility, strength, and balance (scale 1–10).
3. Click **Save Changes**. These metrics are factored directly into the ML risk calculation.

### 4.2 Video Recording Best Practices
For highest accuracy in 3D skeletal tracking:
- **Camera Orientation:** Position the camera at hip height, perpendicular to the movement plane (sagittal or frontal view).
- **Framing:** Ensure the athlete's entire body (head to toes) is visible throughout the full range of motion.
- **Lighting:** Avoid high-contrast backlighting; ensure uniform illumination.
- **Clothing:** Form-fitting athletic apparel provides the clearest joint visibility.
- **Video Standard:** 1080p at 30 FPS or 60 FPS in `.mp4`, `.mov`, or `.avi` container.

### 4.3 Uploading Videos
1. Click **Upload Video** in the top navigation or on the Dashboard.
2. Select your video file.
3. Choose the athletic activity:
   - `Squatting`: Deep double-leg or single-leg squats.
   - `Landing`: Drop vertical jump landings.
   - `Cutting`: Lateral change-of-direction cuts.
   - `Running`: Gait analysis.
   - `General`: General movement screening.
4. Click **Start Analysis**. The backend will transcode the clip to H.264, extract 33 landmarks, compute joint angles, and generate predictions.

### 4.4 Viewing Analysis & Dual-Player Skeleton
1. Once processed, select the video in **Video Analysis**.
2. **Dual-View Player:**
   - **Original Video:** Shows the raw captured clip.
   - **Biomechanical Overlay:** Displays the 33-landmark skeleton locked to the body with colored vectors:
     - 🟢 **Green:** Safe, biomechanically sound joint angles.
     - 🟡 **Yellow:** Mild deviation from baseline.
     - 🔴 **Red:** Dangerous valgus collapse, severe asymmetry, or excessive trunk lean.
3. Scrub through individual frames using the video timeline or interactive HTML5 Canvas skeleton visualizer.

### 4.5 Executing Corrective Drills
1. Navigate to **Recommendations**.
2. View exercises prescribed specifically to counter your detected risks (e.g. *Banded Clamshells* for knee valgus).
3. Review target dosage, sets, and frequency.
4. Click the checkmark icon to toggle completion status after your training session.

---

## 5. Coach Workflow

### 5.1 Team Roster & Workload Management
1. Log in with a `Coach` account.
2. The **Dashboard** displays the **Team Roster** summary table.
3. Review each athlete's current status:
   - High-Risk Alerts
   - Training Load (hours/week)
   - Movement Quality Rating
   - Date of last screening

### 5.2 Team Injury Risk Radar
- Inspect the interactive **Multi-Vector Radar Chart** comparing squad averages against individual athletes.
- Identify team-wide vulnerabilities (e.g. elevated hamstring strain risk following high-volume sprint weeks).

### 5.3 High-Risk Intervention
- Filter the team table by `Risk Category: High` or `Critical`.
- Click on an athlete to review their video breakdown and collaborate with the physiotherapist to adjust training volume.

---

## 6. Physiotherapist Workflow

### 6.1 Clinical Joint Range of Motion (ROM)
1. Navigate to **Risk Assessments**.
2. Select an athlete's assessment session.
3. Inspect the **Range of Motion Table**:
   - Left Knee Flexion / Extension ROM
   - Right Knee Flexion / Extension ROM
   - Left Hip Flexion / Extension ROM
   - Right Hip Flexion / Extension ROM

### 6.2 Bilateral Symmetry & Compensation Analysis
- Check the **Symmetry Index**: Scores below $85\%$ indicate significant contralateral compensation.
- Check the **Valgus Collapse Indicator**: Medial knee displacement $> 15^\circ$ is highlighted in red with estimated ACL load factor.

### 6.3 Prescribing Targeted Corrective Protocols
1. Go to **Recommendations** > **Athlete Prescriptions**.
2. Select an athlete.
3. Click **Auto-Generate Recommendations** to instantiate exercises based on the latest AI screening.
4. Customize sets, reps, or notes to match clinical rehabilitation phases (e.g. Phase 1 Isometric, Phase 2 Eccentric).

---

## 7. Sports Scientist Workflow

### 7.1 Kinematic Benchmark Comparisons
- Under **Performance**, compare an athlete's angular trajectories against normative distributions from the **SportsPose** and **Human3.6M** motion-capture datasets.

### 7.2 Anomaly Deviation Scores
- Inspect the **Anomaly Score** ($0.0 - 1.0$) generated by the Isolation Forest model.
- Anomaly scores above $0.35$ represent significant statistical outliers from baseline kinematic distributions.

### 7.3 Longitudinal Research Cohort Exports
1. Navigate to **Reports**.
2. Select **Research Dataset Export**.
3. Download the anonymized cohort dataset including raw joint coordinates, angular velocities, and risk classifications for statistical research in Python, R, or SPSS.

---

## 8. Administrator Workflow

### 8.1 User Management & Role Assignment
1. Log in with an `Admin` account.
2. Navigate to **Settings** > **User Administration**.
3. View all registered users.
4. Modify roles (e.g. elevate an Athlete to Physiotherapist or Coach) via the role dropdown.

### 8.2 System Observability & Model Status
- View backend telemetry metrics:
  - Database connectivity status
  - MediaPipe BlazePose engine health
  - FFMPEG transcode availability
  - Total analyzed videos and high-risk flags

---

## 9. Notification & Alert Center

The bell icon in the top navigation header provides instant notifications:
- 🔴 **Critical Alert:** Athlete scored $> 82\%$ overall risk or demonstrated acute knee valgus collapse.
- 🟡 **Warning:** Workload spike exceeding standard acute-to-chronic training load thresholds.
- 🟢 **Info:** Successful video processing and new recommendations available.

Click **Mark as Read** or **Mark All as Read** to clear alerts.

---

## 10. Clinical Reporting & CSV Exports

The platform supports clinical documentation and sports science data portability:

1. **Individual Athlete PDF/HTML Summary:**
   - Full diagnostic breakdown with athlete details, video snapshots, risk decomposition, and assigned exercises.
2. **Longitudinal Athlete CSV (`GET /api/athlete/{id}/export/csv`):**
   - Historical time-series of every screening session for tracking rehabilitation recovery curves.
3. **Team Risk Matrix CSV (`GET /api/team/export/csv`):**
   - Organization-wide spreadsheet detailing every athlete's ACL, Hamstring, Ankle, Shoulder, and Back risk probabilities.
