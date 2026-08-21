"""Standardized Dataset Schemas and Provenance Models for SafeMove ML Pipeline."""
from enum import Enum
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field, ConfigDict


class DataModality(str, Enum):
    VIDEO = "VIDEO"
    MOTION_CAPTURE = "MOTION_CAPTURE"
    BIOMECHANICAL_TABLE = "BIOMECHANICAL_TABLE"
    MULTIMODAL = "MULTIMODAL"


class Laterality(str, Enum):
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    BILATERAL = "BILATERAL"
    UNSPECIFIED = "UNSPECIFIED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class SportType(str, Enum):
    SOCCER = "Soccer"
    BASKETBALL = "Basketball"
    VOLLEYBALL = "Volleyball"
    RUNNING = "Running"
    JUMP_LANDING = "Jump Landing"
    TENNIS = "Tennis"
    GENERAL = "General"


class DatasetProvenance(BaseModel):
    """Provenance tracking for dataset origin, versioning, and ethics."""
    model_config = ConfigDict(from_attributes=True)

    source_name: str = Field(..., description="Canonical name of external dataset or collection")
    version: str = Field(default="1.0.0", description="Dataset semantic version")
    license: str = Field(default="Research / Non-Commercial", description="Data license type")
    citation: Optional[str] = Field(default=None, description="Academic DOI or publication citation")
    imported_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_samples: int = Field(default=0, description="Total number of annotated samples in dataset")
    annotation_protocol: str = Field(
        default="Standard Clinical / Biomechanical Ground Truth",
        description="Description of how ground-truth labels were generated and validated"
    )
    checksum_manifest: Optional[str] = Field(default=None, description="SHA256 checksum of raw dataset archive")
    notes: Optional[str] = Field(
        default="Provisional research dataset. Baselines and labels are domain-specific.",
        description="Governance and usage constraints"
    )


class DatasetSample(BaseModel):
    """
    Standardized single sample entry in a SafeMove training dataset.
    Supports video, 3D motion-capture, tabular biomechanics, and multimodal research records.
    """
    model_config = ConfigDict(from_attributes=True)

    sample_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    video_id: str = Field(..., description="Unique record/sample identifier within dataset")
    athlete_id: Optional[str] = Field(
        default=None,
        description="De-identified athlete/subject ID (e.g. 'CALGARY_SUBJ_0042') for group-level data leakage prevention"
    )
    modality: DataModality = Field(
        default=DataModality.VIDEO,
        description="Data modality: VIDEO, MOTION_CAPTURE, BIOMECHANICAL_TABLE, MULTIMODAL"
    )
    video_path: Optional[str] = Field(
        default=None,
        description="Relative or absolute path to video file if modality is VIDEO or MULTIMODAL. None for motion capture/tabular."
    )
    raw_file_path: Optional[str] = Field(
        default=None,
        description="Path to raw source file (CSV, C3D, MAT, TXT) for motion-capture or tabular records."
    )
    sport: str = Field(default=SportType.GENERAL.value)
    movement_type: str = Field(default="Running", description="Drill / movement categorization")
    injury_label: Optional[Union[int, float, str]] = Field(
        default=None,
        description="Ground-truth injury/risk label from dataset annotations. DO NOT INVENT LABELS."
    )
    injury_type: Optional[str] = Field(
        default=None,
        description="Specific injury classification (e.g., 'PATELLOFEMORAL_PAIN', 'IT_BAND_SYNDROME', 'HEALTHY_CONTROL')"
    )
    laterality: Laterality = Field(
        default=Laterality.UNSPECIFIED,
        description="Anatomical laterality of affected limb or movement drill"
    )
    timestamp_onset_seconds: Optional[float] = Field(
        default=None,
        description="Exact video timestamp (seconds) of peak impact or injury event where available"
    )
    source_dataset: str = Field(..., description="Name of source dataset corresponding to Provenance")
    license: str = Field(default="Research / Non-Commercial")
    checksum_sha256: Optional[str] = Field(default=None, description="SHA256 checksum of raw source file")
    biomechanical_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw motion-capture / biomechanical measurement variables from source data"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional domain-specific metadata")


class DatasetManifest(BaseModel):
    """Full dataset manifest combining provenance metadata with sample list."""
    model_config = ConfigDict(from_attributes=True)

    dataset_name: str
    provenance: DatasetProvenance
    samples: List[DatasetSample]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
