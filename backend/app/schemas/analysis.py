"""Analysis, Kinematics, and Biomechanical Anomaly Schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class KinematicsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: UUID
    athlete_id: UUID
    timestamps: list[float]
    joint_angle_curves: dict[str, list[float | None]]
    angular_velocities: dict[str, list[float | None]]
    angular_accelerations: dict[str, list[float | None]]
    asymmetry_metrics: dict[str, Any]
    summary_metrics: dict[str, Any]
    created_at: datetime | None = None


class AnomalyEventItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metric: str
    metric_name: str
    timestamp_seconds: float | None = None
    observed: float | None = None
    observed_value: float | None = None
    baseline_mean: float
    baseline_value: float
    baseline_std: float
    z_score: float | None = None
    percent_deviation: float | None = None
    percentage_deviation: float | None = None
    range_deviation: float = 0.0
    severity: str
    severity_derivation_rule: str
    baseline_type: str = "DEVELOPMENTAL"
    description: str


class MetricDeviationDetail(BaseModel):
    label: str
    category: str
    unit: str
    metric: str
    observed: float | None = None
    baseline_mean: float
    baseline_std: float
    baseline_range: list[float]
    absolute_deviation: float | None = None
    percent_deviation: float | None = None
    z_score: float | None = None
    range_deviation: float = 0.0
    is_out_of_range: bool = False
    severity: str
    severity_derivation_rule: str
    baseline_type: str = "DEVELOPMENTAL"


class AnomalyAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: UUID
    athlete_id: UUID
    overall_status: str
    feature_summary: dict[str, dict[str, float | None]]
    metric_deviations: dict[str, MetricDeviationDetail]
    temporal_peaks: dict[str, dict[str, float | None]]
    anomalies: list[AnomalyEventItem]
    baseline_metadata: dict[str, Any]
    created_at: datetime | None = None


class BiomechanicalAssessmentResponse(BaseModel):
    joint_angles: dict[str, float]
    rom_values: dict[str, float]
    symmetry_index: float
    timestamp: float


class MovementAnalysisResponse(BaseModel):
    session_id: str
    assessments: list[BiomechanicalAssessmentResponse]
    summary: dict[str, Any]


class AnomalyEventResponse(BaseModel):
    timestamp_start: float
    timestamp_end: float
    deviation_type: str
    severity: str
    confidence: float
