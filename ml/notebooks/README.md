# ML Exploration Notebooks

This directory contains Jupyter notebooks for model exploration and prototyping.

## Organization

- `pose_estimation/` — Pose model evaluation and comparison
- `biomechanics/` — Joint angle and ROM analysis experiments
- `anomaly_detection/` — Autoencoder and deviation detection
- `risk_prediction/` — Injury risk model training
- `fatigue/` — Fatigue prediction time-series models

## Data Sources

> **Note:** SportsPose/FIFA Injury datasets are reference/training data only, 
> not production data sources (Section 8, Q6).

## Guidelines

- All risk outputs must be framed as decision-support signals, not clinical diagnoses
- No fabricated accuracy/performance thresholds — mark proposals as `PROPOSAL_PENDING_STAKEHOLDER`
