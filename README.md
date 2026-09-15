  # sports Injury Risk Detection 

# Sports Injury Risk Detection - Frontend

## Overview

This folder contains the frontend of the Sports Injury Risk Detection
project. It provides the user interface for registration, login,
athlete information, video upload, and dashboard access.

The frontend is currently focused on building the application workflow.
The AI-based injury prediction module will be integrated in a later phase.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Fetch API
- Django REST API (backend integration)

## Frontend Pages

| File | Purpose |
|------|---------|
| index.html | Home page of the application |
| register.html | User registration |
| login.html | User login |
| athlete-details.html | Collects athlete information |
| Upload.html | Athlete video upload interface |
| dashboard.html | Displays the athlete dashboard |

## Current Workflow

User
↓
Registration / Login
↓
Athlete Details
↓
Video Upload
↓
Dashboard

## Backend Integration

The frontend communicates with the Django backend through API
requests.

The athlete details page sends information to the backend API and
handles validation and server responses.

Example data includes:

- Full name
- Age
- Gender
- Sport
- Height
- Weight
- Position
- Training hours
- Previous injury

## Current Status

Completed:
- Frontend project structure
- Home page
- Registration page
- Login page
- Athlete details page
- Video upload interface
- Dashboard interface
- Frontend-backend API integration

Not started yet:
- AI-based video analysis
- Pose estimation
- Biomechanical feature extraction
- Machine learning injury-risk prediction

## Future Integration

The frontend will later be connected to the AI/ML pipeline for:

1. Athlete video processing
2. Movement and pose analysis
3. Biomechanical feature extraction
4. Injury risk prediction
5. Risk visualization and recommendations

## How to Run

Open the frontend files in a browser or run them through the
project's development environment.

Make sure the Django backend is running when using features that
communicate with the API.



Frontend & backend: 

              YOUR PROJECT
                   │
          ┌────────┴────────┐
          │                 │
      FRONTEND           BACKEND
      HTML/CSS/JS         Django
          │                 │
      :5500              :8000
          │                 │
          └─────── API ────┘
                    │
               PostgreSQL


07-09-2026

     Athlete Login
     ↓
    Athlete Profile
     ↓
    Upload Sports Video
     ↓
    Django Backend
     ↓
    Video Processing
     ├── Video validation
     ├── Frame extraction
     └── Pose estimation
     ↓
    Dashboard
     ├── View uploaded videos 
     ├── Upload new video 
     └── Delete video 
     
> Biomechanical_analysis.py

What this module currently does

It converts the MediaPipe landmarks into actual biomechanical measurements:

Feature	Calculation
Knee angle	Hip → Knee → Ankle
Hip angle	Shoulder → Hip → Knee
Knee symmetry	Difference between left/right knee angles
Trunk lean	Shoulder midpoint vs hip midpoint

And importantly:

Visibility filtering is included.

For example, your frame 24 has:

Left shoulder visibility = 0.985
Left hip visibility      = 0.987
Left knee visibility     = 0.227
Left ankle visibility    = 0.201


we set MIN_VISIBILITY = 0.5

Our planned pipeline needs reliable bilateral measurements:

Pose Landmarks
      ↓
Visibility Filtering
      ↓
Biomechanical Features
      ↓
Symmetry / ROM
      ↓
ML

Range of Motion (ROM)

Instead of looking at just one frame, we need to analyze the entire movement.

For example, if the right knee angles across the video are:

160° → 145° → 120° → 100° → 130° → 155°

then:

Maximum = 160°
Minimum = 100°
ROM     = 60°

That gives us a much more meaningful biomechanical feature than a single-frame angle.

We'll add:

Left knee ROM
Right knee ROM
Left hip ROM
Right hip ROM
Average knee symmetry
Maximum trunk lean

Perfect. ✅ These values look usable for our first biomechanical feature set.

What we have
| Feature            |       Left |      Right |
| ------------------ | ---------: | ---------: |
| Minimum knee angle |    140.10° |    146.02° |
| Maximum knee angle |    178.15° |    178.53° |
| Knee ROM           | **38.05°** | **32.51°** |

The difference in knee ROM is:

5.54°

current biomechanical output is: 
| Feature                          |      Value |
| -------------------------------- | ---------: |
| Frames analyzed                  |     **78** |
| Left knee ROM                    | **38.05°** |
| Right knee ROM                   | **32.51°** |
| Left hip ROM                     | **40.60°** |
| Right hip ROM                    | **41.72°** |
| Average knee symmetry difference |  **7.19°** |
| Maximum trunk lean               | **10.28°** |


Next feature: Knee Valgus / Knee Alignment

This is particularly relevant to your project's injury-risk goal.

We'll use the relationship between:

Hip
 ↓
Knee
 ↓
Ankle


The updated biomechanical summary is working.

Your current feature set is:

| Feature                          |   Value |
| -------------------------------- | ------: |
| Frames analyzed                  |      78 |
| Left knee ROM                    |  38.05° |
| Right knee ROM                   |  32.51° |
| Left hip ROM                     |  40.60° |
| Right hip ROM                    |  41.72° |
| Average knee symmetry difference |   7.19° |
| Maximum trunk lean               |  10.28° |
| Average left knee alignment      | -0.0074 |
| Average right knee alignment     |  0.0002 |


Current pipeline:

      Video
        ↓
    Video Processing
        ↓
    Pose Estimation
        ↓
    33 Landmarks
        ↓
    Visibility Filtering
        ↓
    Biomechanical Analysis
    ├── Knee Angles
    ├── Hip Angles
    ├── Knee ROM
    ├── Hip ROM
    ├── Knee Symmetry
    ├── Knee Alignment
    └── Trunk Lean
      ↓
    Movement-Level Feature Vector
      ↓
    ML Classifier       ← later
      ↓
    Injury Risk


The completed pipeline upto date(07-09-26)



                        ┌─────────────────────┐
                  │   Athlete Profile   │
                  └──────────┬──────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        Previous Injury             Training Load
                │                         │
                └────────────┬────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Risk Factors  │
                    └───────┬────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
   Biomechanical       Movement           Fatigue
     Deviation        Asymmetry           Indicator
          │                 │                  │
          └─────────────────┼──────────────────┘
                            ▼
                    Weighted Risk Score
                            │
                            ▼
                    Low / Medium / High