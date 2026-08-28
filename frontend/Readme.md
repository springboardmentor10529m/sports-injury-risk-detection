# Sports Injury Risk Detection App

This frontend powers a sports injury monitoring platform for athletes, coaches, physiotherapists, sports scientists, and administrators. It connects to the FastAPI backend to show athlete profiles, risk scores, analysis history, recommendations, and role-based dashboards.

## About the project

The application helps teams monitor athlete movement and detect injury risk using uploaded video analysis, biomechanics data, and role-specific reporting. Users can:

- register and log in with different roles
- upload athlete videos for analysis
- review injury-risk results and recommendations
- track athlete history and health trends
- manage team and patient access by role
- view platform-level insights as an admin

## Key features

- Role-based dashboards for athlete, coach, physiotherapist, scientist, and admin
- Video upload and analysis workflow linked to the backend pipeline
- Injury-risk summary cards and trend visualization
- Athlete detail pages with biomechanics and recommendation insights
- Access control for linked athletes and staff assignments
- Clean React + Vite interface for fast local development

## Tech stack

- React 19
- Vite
- React Router
- Axios for API calls
- Recharts for graphs and trend views
- Lucide icons for UI elements

## Project structure

```bash
frontend/
  src/
    components/
    context/
    pages/
    api/
    App.jsx
    main.jsx
  package.json
  vite.config.js
```

## Local setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create your environment file if needed:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

4. Open the app in the browser:

```text
http://localhost:5173
```

## Backend connection

This frontend expects the backend API to be running, typically at:

```text
http://localhost:8000
```

Make sure the backend is started before testing the login, upload, and analysis flows.

## Useful scripts

```bash
npm run dev      # start Vite dev server
npm run build    # create production build
npm run preview  # preview the production build
npm run lint     # run project linting
```

## Notes

This repo is designed as a full-stack product. The frontend is only one part of the system; the backend handles authentication, role-based authorization, video processing, risk calculations, and analytics.
