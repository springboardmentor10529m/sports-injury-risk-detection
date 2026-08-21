# SafeMove — AI-Powered Sports Injury Risk Detection Platform

SafeMove is an AI-powered platform analyzing athlete movement video for injury risk detection. 
**Disclaimer**: *SafeMove provides decision-support signals for injury risk assessment and does not provide medical diagnoses or clinical advice.*

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, Pydantic v2, Alembic |
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Databases | PostgreSQL (+ TimescaleDB), MongoDB, Redis, MinIO |
| ML/CV | TensorFlow, PyTorch, scikit-learn, XGBoost, OpenCV, MediaPipe, YOLOv8 |

## Quick Start

1. Clone repo
2. Copy `.env.example` to `.env`
3. Run `docker compose -f infra/docker-compose.yml up -d`
4. Access frontend at [http://localhost:3000](http://localhost:3000)
5. Access API at [http://localhost:8000/docs](http://localhost:8000/docs)

## Architecture Overview

Brief overview of the system architecture. For more details, see [Architecture](docs/architecture.md).

## Roles

1. **Athlete**: Uploads videos, views personal risk reports.
2. **Coach**: Manages team, views aggregate risk reports, assigns training.
3. **Physiotherapist**: Deep dives into biomechanical analysis and risk factors.
4. **Sports Scientist**: Analyzes models, tunes thresholds, researches overall trends.
5. **Admin**: Manages users, system health, configurations.

## Composite Risk Score Components

* Biomechanical Deviations: 35%
* Historical Injury Factors: 20%
* Movement Asymmetry: 20%
* Training Load Indicators: 15%
* Fatigue Indicators: 10%

## Phase Roadmap

* Phase 0 ✅ - Infrastructure setup
* Phase 1 ⬜ - Database and Authentication
* Phase 2 ⬜ - Video Management & Processing
* Phase 3 ⬜ - Pose Estimation & Feature Extraction
* Phase 4 ⬜ - Biomechanical Analysis
* Phase 5 ⬜ - Risk Scoring & Anomaly Detection
* Phase 6 ⬜ - Frontend Core & Dashboards
* Phase 7 ⬜ - Recommendations & Notifications
* Phase 8 ⬜ - Advanced Analytics
* Phase 9 ⬜ - Performance & Polish

## Contributing

Follow standard gitflow practices. All code should be properly typed and documented.

## License

MIT License.
