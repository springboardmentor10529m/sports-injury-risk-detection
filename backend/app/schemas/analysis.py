"""Analysis, Kinematics, and Biomechanical Anomaly Schemas."""
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class KinematicsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: UUID
    athlete_id: UUID
    timestamps: List[float]
    joint_angle_curves: Dict[str, List[Optional[float]]]
    angular_velocities: Dict[str, List[Optional[float]]]
    angular_accelerations: Dict[str, List[Optional[float]]]
    asymmetry_metrics: Dict[str, Any]
    summary_metrics: Dict[str, Any]
    created_at: Optional[datetime] = None


class AnomalyEventItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metric: str
    metric_name: str
    timestamp_seconds: Optional[float] = None
    observed: Optional[float] = None
    observed_value: Optional[float] = None
    baseline_mean: float
    baseline_value: float
    baseline_std: float
    z_score: Optional[float] = None
    percent_deviation: Optional[float] = None
    percentage_deviation: Optional[float] = None
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
    observed: Optional[float] = None
    baseline_mean: float
    baseline_std: float
    baseline_range: List[float]
    absolute_deviation: Optional[float] = None
    percent_deviation: Optional[float] = None
    z_score: Optional[float] = None
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
    feature_summary: Dict[str, Dict[str, Optional[float]]]
    metric_deviations: Dict[str, MetricDeviationDetail]
    temporal_peaks: Dict[str, Dict[str, Optional[float]]]
    anomalies: List[AnomalyEventItem]
    baseline_metadata: Dict[str, Any]
    created_at: Optional[datetime] = None


class BiomechanicalAssessmentResponse(BaseModel):
    joint_angles: Dict[str, float]
    rom_values: Dict[str, float]
    symmetry_index: float
    timestamp: float


class MovementAnalysisResponse(BaseModel):
    session_id: str
    assessments: List[BiomechanicalAssessmentResponse]
    summary: Dict[str, Any]


class AnomalyEventResponse(BaseModel):
    timestamp_start: float
    timestamp_end: float
    deviation_type: str
    severity: str
    confidence: float
