# Database Schemas

## PostgreSQL Schema
* **users**: id, email, hashed_password, role, created_at, updated_at
* **athletes**: id, user_id, team_id, date_of_birth, height, weight
* **teams**: id, name, created_at

## TimescaleDB Schema
* **biomechanics_time_series**: time, athlete_id, metric_name, value

## MongoDB Schema
* **videos_metadata**: _id, athlete_id, s3_key, duration, resolution, processing_status
* **analysis_results**: _id, video_id, pose_data, anomalies_detected, computed_metrics

## Redis Key Patterns
* `session:{user_id}`
* `task:{task_id}:status`

## Migration Strategy
Alembic used for schema migrations in PostgreSQL.
