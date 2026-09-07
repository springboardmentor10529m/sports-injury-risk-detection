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
