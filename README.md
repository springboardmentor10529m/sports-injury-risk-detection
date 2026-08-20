# sports-injury-risk-detection

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

┌──────────────────────┐
│        USER          │
├──────────────────────┤
│ PK: user_id          │
│ username             │
│ email                │
│ password             │
└──────────┬───────────┘
           │
           │ 1
           │
           │ 1
┌──────────▼───────────┐
│       ATHLETE        │
├──────────────────────┤
│ PK: athlete_id       │
│ FK: user_id          │
│ full_name            │
│ age                  │
│ gender               │
│ sport                │
│ height               │
│ weight               │
│ position             │
│ training_hours       │
│ previous_injury      │
└──────────┬───────────┘
           │
           │ 1
           │
           │ M
┌──────────▼───────────┐
│    VIDEO / UPLOAD    │
├──────────────────────┤
│ PK: video_id         │
│ FK: athlete_id       │
│ video_file           │
│ upload_date          │
└──────────────────────┘

## Frontend Pages

| File | Purpose |
|------|---------|
| index.html | Home page of the application |
| register.html | User registration |
| login.html | User login |
| athlete-details.html | Collects athlete information |
| Upload.html | Athlete video upload interface |
| dashboard.html | Displays the athlete dashboard |

     
 ## Frontend page flow                  
                   Home
 │
 ├──► Register
 │       │
 │       ▼
 │     Login
 │       │
 │       ▼
 │  Athlete Details
 │       │
 │       ▼
 │  Video Upload
 │       │
 │       ▼
 │   Dashboard
 │
 └──► Login ────────────────► Athlete Details
 

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
