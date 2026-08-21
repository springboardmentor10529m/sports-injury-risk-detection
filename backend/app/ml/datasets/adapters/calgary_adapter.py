"""
Calgary Biomechanical Dataset Adapter for SafeMove.

Source:
"A Biomechanical Dataset of 1,798 Healthy and Injured Subjects"
Published in Scientific Data (Nature Research).

IMPORTANT SCIENTIFIC CONSTRAINTS:
1. This dataset is a 3D Motion-Capture and Biomechanical Tabular cohort, NOT an MP4 video dataset.
2. Modality is strictly tagged as BIOMECHANICAL_TABLE / MOTION_CAPTURE.
3. MediaPipe video processing is NOT invoked on motion-capture data.
4. SafeMove developmental baselines are NOT treated as ground truth.
5. Original injury diagnoses are preserved verbatim as clinical ground truth.
"""
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import csv
import json
import logging
import pandas as pd
import numpy as np

from app.ml.datasets.schema import (
    DatasetSample,
    DatasetManifest,
    DatasetProvenance,
    DataModality,
    Laterality,
    SportType,
)
from app.ml.datasets.storage_layout import DatasetStorageManager

logger = logging.getLogger("uvicorn.error")


# Standard Field Mapping Specification with Provenance
CALGARY_FIELD_MAPPINGS: List[Dict[str, Any]] = [
    {
        "original_column": "Subject_ID",
        "safemove_field": "athlete_id",
        "unit": "string",
        "transformation": "Prefix with CALGARY_SUBJ_ to standardize de-identified subject IDs",
        "is_ground_truth": True,
        "is_feature": False
    },
    {
        "original_column": "Injury_Status",
        "safemove_field": "injury_label",
        "unit": "binary [0=Healthy/Control, 1=Injured]",
        "transformation": "Map 'Injured'/'Injury' -> 1, 'Healthy'/'Control' -> 0",
        "is_ground_truth": True,
        "is_feature": False
    },
    {
        "original_column": "Injury_Type",
        "safemove_field": "injury_type",
        "unit": "categorical",
        "transformation": "Preserve clinical pathology string (PFPS, ITBS, Plantar Fasciitis, Achilles Tendinopathy, TSS, Healthy Control)",
        "is_ground_truth": True,
        "is_feature": False
    },
    {
        "original_column": "Affected_Side",
        "safemove_field": "laterality",
        "unit": "enum",
        "transformation": "Map 'Left' -> LEFT, 'Right' -> RIGHT, 'Bilateral' -> BILATERAL, 'None'/'NA' -> NOT_APPLICABLE",
        "is_ground_truth": True,
        "is_feature": False
    },
    {
        "original_column": "Knee_Flexion_ROM",
        "safemove_field": "knee_flexion_rom_left",
        "unit": "degrees",
        "transformation": "Direct mapping of 3D motion-capture sagittal knee excursion during stance",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Knee_Flexion",
        "safemove_field": "peak_knee_flexion_left",
        "unit": "degrees",
        "transformation": "Direct mapping of peak knee flexion angle",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Knee_Abduction",
        "safemove_field": "knee_valgus_proxy_left_max",
        "unit": "degrees",
        "transformation": "Direct 3D kinematic equivalent of frontal plane knee valgus",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Hip_Flexion_ROM",
        "safemove_field": "hip_flexion_rom_left",
        "unit": "degrees",
        "transformation": "Direct mapping of hip sagittal excursion",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Hip_Adduction",
        "safemove_field": "hip_adduction_max",
        "unit": "degrees",
        "transformation": "Preserve 3D frontal plane hip adduction peak angle",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Hip_Internal_Rotation",
        "safemove_field": "hip_internal_rotation_max",
        "unit": "degrees",
        "transformation": "Preserve 3D transverse plane hip rotation peak angle",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Ankle_Dorsiflexion_ROM",
        "safemove_field": "ankle_dorsiflexion_rom_left",
        "unit": "degrees",
        "transformation": "Direct mapping of sagittal ankle range of motion",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Trunk_Forward_Lean",
        "safemove_field": "trunk_lean_max",
        "unit": "degrees",
        "transformation": "Direct mapping of maximum trunk forward inclination",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Peak_Vertical_GRF",
        "safemove_field": "peak_vertical_grf",
        "unit": "body_weight (BW)",
        "transformation": "Preserve kinetic ground reaction force peak",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
    {
        "original_column": "Vertical_Loading_Rate",
        "safemove_field": "vertical_loading_rate",
        "unit": "BW/s",
        "transformation": "Preserve kinetic impact loading rate",
        "is_ground_truth": False,
        "is_feature": True,
        "usable_phase5": True
    },
]


# Full Compatibility Matrix: SafeMove Standard Video/Kinematic Features vs Calgary Motion-Capture
SAFEMOVE_COMPATIBILITY_SPEC: List[Dict[str, Any]] = [
    {
        "safemove_feature": "knee_flexion_rom_left",
        "available_in_calgary": True,
        "original_source_field": "Knee_Flexion_ROM",
        "unit": "degrees",
        "transformation": "Direct mapping",
        "usable_for_phase5": True,
        "reason": "Direct 3D kinematic angle excursion measurement"
    },
    {
        "safemove_feature": "peak_knee_flexion_left",
        "available_in_calgary": True,
        "original_source_field": "Peak_Knee_Flexion",
        "unit": "degrees",
        "transformation": "Direct mapping",
        "usable_for_phase5": True,
        "reason": "Direct peak sagittal knee flexion angle"
    },
    {
        "safemove_feature": "knee_valgus_proxy_left_max",
        "available_in_calgary": True,
        "original_source_field": "Peak_Knee_Abduction",
        "unit": "degrees",
        "transformation": "Direct 3D equivalent",
        "usable_for_phase5": True,
        "reason": "3D Knee Abduction angle is the gold-standard reference for 2D knee valgus"
    },
    {
        "safemove_feature": "hip_flexion_rom_left",
        "available_in_calgary": True,
        "original_source_field": "Hip_Flexion_ROM",
        "unit": "degrees",
        "transformation": "Direct mapping",
        "usable_for_phase5": True,
        "reason": "Direct 3D hip sagittal range of motion"
    },
    {
        "safemove_feature": "ankle_dorsiflexion_rom_left",
        "available_in_calgary": True,
        "original_source_field": "Ankle_Dorsiflexion_ROM",
        "unit": "degrees",
        "transformation": "Direct mapping",
        "usable_for_phase5": True,
        "reason": "Direct 3D ankle sagittal range of motion"
    },
    {
        "safemove_feature": "trunk_lean_max",
        "available_in_calgary": True,
        "original_source_field": "Peak_Trunk_Forward_Lean",
        "unit": "degrees",
        "transformation": "Direct mapping",
        "usable_for_phase5": True,
        "reason": "Direct 3D sagittal trunk inclination"
    },
    {
        "safemove_feature": "hip_adduction_max",
        "available_in_calgary": True,
        "original_source_field": "Peak_Hip_Adduction",
        "unit": "degrees",
        "transformation": "Direct 3D mocap feature",
        "usable_for_phase5": True,
        "reason": "High clinical relevance for patellofemoral and ITBS pathology"
    },
    {
        "safemove_feature": "hip_internal_rotation_max",
        "available_in_calgary": True,
        "original_source_field": "Peak_Hip_Internal_Rotation",
        "unit": "degrees",
        "transformation": "Direct 3D mocap feature",
        "usable_for_phase5": True,
        "reason": "Transverse plane biomechanics captured via 3D markers"
    },
    {
        "safemove_feature": "peak_vertical_grf",
        "available_in_calgary": True,
        "original_source_field": "Peak_Vertical_GRF",
        "unit": "BW",
        "transformation": "Force plate kinetic measurement",
        "usable_for_phase5": True,
        "reason": "Ground reaction force impact parameter"
    },
    {
        "safemove_feature": "vertical_loading_rate",
        "available_in_calgary": True,
        "original_source_field": "Vertical_Loading_Rate",
        "unit": "BW/s",
        "transformation": "Force plate kinetic measurement",
        "usable_for_phase5": True,
        "reason": "Rate of force application during initial stance"
    },
    {
        "safemove_feature": "knee_peak_velocity_left",
        "available_in_calgary": False,
        "original_source_field": "N/A",
        "unit": "degrees/s",
        "transformation": "Unavailable in summary table",
        "usable_for_phase5": False,
        "reason": "Angular velocity time series not stored in standard discrete summary table"
    },
    {
        "safemove_feature": "knee_flexion_asymmetry_mean",
        "available_in_calgary": False,
        "original_source_field": "N/A",
        "unit": "%",
        "transformation": "Unavailable in unilateral stance protocol",
        "usable_for_phase5": False,
        "reason": "Calgary running gait trials record affected vs unaffected limb in separate discrete trials"
    },
    {
        "safemove_feature": "trunk_lateral_tilt_max",
        "available_in_calgary": False,
        "original_source_field": "N/A",
        "unit": "degrees",
        "transformation": "Not recorded in primary summary table",
        "usable_for_phase5": False,
        "reason": "Frontal trunk tilt omitted from primary summary feature table"
    },
]


class CalgaryDatasetAdapter:
    """
    Adapter for parsing, validating, and ingesting the Calgary Biomechanical Dataset.
    Enforces strict provenance, metadata preservation, and subject-level isolation.
    """

    def __init__(self, storage_manager: Optional[DatasetStorageManager] = None):
        self.storage = storage_manager or DatasetStorageManager()
        self.dataset_name = "calgary"

    def get_provenance(self) -> DatasetProvenance:
        return DatasetProvenance(
            source_name="Calgary_Running_Injury_Biomechanical_Dataset",
            version="1.0.0",
            license="Creative Commons Attribution 4.0 International (CC-BY 4.0)",
            citation="Fukuchi et al., 'A public dataset of running biomechanics and the effects of running speed on lower extremity kinematics and kinetics', Nature Scientific Data (2017/2020) & Calgary Running Injury Clinic cohort.",
            annotation_protocol="Clinical Orthopedic Examination and 3D Motion Analysis (Vicon 8-camera optical system with Bertec force plates)",
            notes="Motion-capture 3D kinematics and ground reaction forces of healthy controls and injured runners. Modality: BIOMECHANICAL_TABLE."
        )

    def parse_records(self, csv_file_path: Path) -> List[DatasetSample]:
        """
        Parse raw Calgary CSV metadata records into standardized SafeMove DatasetSample objects.
        Preserves original values, avoids fabricating videos, and records missing values explicitly.
        """
        csv_file_path = Path(csv_file_path).resolve()
        if not csv_file_path.exists():
            raise FileNotFoundError(f"Calgary raw dataset file not found: {csv_file_path}")

        samples: List[DatasetSample] = []

        with open(csv_file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                # 1. Subject Identifier
                raw_subj_id = row.get("Subject_ID", f"SUBJ_{idx+1:04d}").strip()
                deidentified_athlete_id = f"CALGARY_{raw_subj_id}"
                sample_id = f"CALGARY_REC_{raw_subj_id}_{idx+1:04d}"

                # 2. Injury Status & Label
                raw_status = row.get("Injury_Status", "").strip().lower()
                if raw_status in ["injured", "injury", "1", "case", "patient"]:
                    injury_label = 1
                elif raw_status in ["healthy", "uninjured", "control", "0", "asymptomatic"]:
                    injury_label = 0
                else:
                    injury_label = None  # Explicit missing label

                # 3. Injury Type
                injury_type = row.get("Injury_Type", "HEALTHY_CONTROL" if injury_label == 0 else "UNSPECIFIED").strip()

                # 4. Affected Side / Laterality
                raw_side = row.get("Affected_Side", "").strip().lower()
                if "left" in raw_side:
                    laterality = Laterality.LEFT
                elif "right" in raw_side:
                    laterality = Laterality.RIGHT
                elif "bilateral" in raw_side or "both" in raw_side:
                    laterality = Laterality.BILATERAL
                elif injury_label == 0:
                    laterality = Laterality.NOT_APPLICABLE
                else:
                    laterality = Laterality.UNSPECIFIED

                # 5. Extract Biomechanical Measurements
                bio_data: Dict[str, Optional[float]] = {}
                for map_item in CALGARY_FIELD_MAPPINGS:
                    if map_item["is_feature"]:
                        orig_col = map_item["original_column"]
                        val_str = row.get(orig_col)
                        if val_str is not None and val_str.strip() != "":
                            try:
                                bio_data[map_item["safemove_field"]] = round(float(val_str.strip()), 2)
                            except ValueError:
                                bio_data[map_item["safemove_field"]] = None
                        else:
                            bio_data[map_item["safemove_field"]] = None

                # 6. Demographics / Metadata
                metadata: Dict[str, Any] = {
                    "original_subject_id": raw_subj_id,
                    "age": float(row.get("Age")) if row.get("Age") and row.get("Age").replace('.', '', 1).isdigit() else None,
                    "gender": row.get("Gender", "Unspecified").strip(),
                    "running_speed_ms": float(row.get("Speed_ms")) if row.get("Speed_ms") and row.get("Speed_ms").replace('.', '', 1).isdigit() else None,
                    "running_experience_years": float(row.get("Experience_Years")) if row.get("Experience_Years") and row.get("Experience_Years").replace('.', '', 1).isdigit() else None,
                    "weekly_mileage_km": float(row.get("Weekly_Mileage_km")) if row.get("Weekly_Mileage_km") and row.get("Weekly_Mileage_km").replace('.', '', 1).isdigit() else None,
                    "raw_source_record": dict(row)
                }

                sample = DatasetSample(
                    sample_id=sample_id,
                    video_id=f"CALGARY_TRIAL_{raw_subj_id}",
                    athlete_id=deidentified_athlete_id,
                    modality=DataModality.BIOMECHANICAL_TABLE,
                    video_path=None,  # No fabricated video
                    raw_file_path=str(csv_file_path),
                    sport=SportType.RUNNING.value,
                    movement_type="Running Gait Stance Phase",
                    injury_label=injury_label,
                    injury_type=injury_type,
                    laterality=laterality,
                    timestamp_onset_seconds=None,
                    source_dataset=self.dataset_name,
                    biomechanical_data=bio_data,
                    metadata=metadata
                )
                samples.append(sample)

        return samples

    def ingest_and_generate_artifacts(self, raw_csv_path: Path) -> Tuple[DatasetManifest, pd.DataFrame, Dict[str, Any]]:
        """
        Execute complete integration:
        1. Initialize directory layout under data/
        2. Parse raw records
        3. Generate mapping report and compatibility report
        4. Save manifest.json
        5. Generate features.csv (Feature Table)
        6. Compute comprehensive dataset statistics
        """
        dirs = self.storage.initialize_dataset_directories(self.dataset_name)
        provenance = self.get_provenance()

        # Parse Samples
        samples = self.parse_records(raw_csv_path)
        provenance.total_samples = len(samples)

        manifest = DatasetManifest(
            dataset_name=self.dataset_name,
            provenance=provenance,
            samples=samples
        )

        # 1. Save manifest.json
        manifest_path = dirs["labels"] / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(), f, indent=2)

        # 2. Save mapping_report.json
        mapping_report_path = dirs["labels"] / "mapping_report.json"
        with open(mapping_report_path, "w", encoding="utf-8") as f:
            json.dump({
                "dataset_name": self.dataset_name,
                "modality": DataModality.BIOMECHANICAL_TABLE.value,
                "mappings": CALGARY_FIELD_MAPPINGS,
                "missing_value_policy": "Explicit null/None recording without silent record dropping",
            }, f, indent=2)

        # 3. Save compatibility_report.json
        compatibility_report_path = dirs["labels"] / "compatibility_report.json"
        with open(compatibility_report_path, "w", encoding="utf-8") as f:
            json.dump({
                "dataset_name": self.dataset_name,
                "compatibility_matrix": SAFEMOVE_COMPATIBILITY_SPEC,
                "total_safemove_features_evaluated": len(SAFEMOVE_COMPATIBILITY_SPEC),
                "available_features_count": sum(1 for c in SAFEMOVE_COMPATIBILITY_SPEC if c["available_in_calgary"]),
                "unavailable_features_count": sum(1 for c in SAFEMOVE_COMPATIBILITY_SPEC if not c["available_in_calgary"]),
            }, f, indent=2)

        # 4. Generate Tabular ML Feature Matrix (Direct research feature extraction)
        feature_rows: List[Dict[str, Any]] = []
        for s in samples:
            row: Dict[str, Any] = {
                "sample_id": s.sample_id,
                "athlete_id": s.athlete_id,
                "modality": s.modality.value,
                "sport": s.sport,
                "movement_type": s.movement_type,
                "laterality": s.laterality.value,
                "source_dataset": s.source_dataset,
                "injury_label": s.injury_label,
                "injury_type": s.injury_type,
                **s.biomechanical_data
            }
            feature_rows.append(row)

        df_features = pd.DataFrame(feature_rows)
        csv_features_path = dirs["features"] / "features.csv"
        df_features.to_csv(csv_features_path, index=False)

        # 5. Compile Dataset Statistics
        stats = self.compute_statistics(manifest, df_features)
        stats_path = dirs["labels"] / "dataset_statistics.json"
        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)

        return manifest, df_features, stats

    @staticmethod
    def compute_statistics(manifest: DatasetManifest, df_features: pd.DataFrame) -> Dict[str, Any]:
        """Compute exhaustive dataset statistics on Calgary records."""
        total_samples = len(manifest.samples)
        unique_athletes = len(set(s.athlete_id for s in manifest.samples if s.athlete_id))

        injured_count = sum(1 for s in manifest.samples if s.injury_label == 1)
        healthy_count = sum(1 for s in manifest.samples if s.injury_label == 0)
        missing_labels_count = sum(1 for s in manifest.samples if s.injury_label is None)

        injury_types_dist: Dict[str, int] = {}
        for s in manifest.samples:
            itype = s.injury_type or "UNSPECIFIED"
            injury_types_dist[itype] = injury_types_dist.get(itype, 0) + 1

        laterality_dist: Dict[str, int] = {}
        for s in manifest.samples:
            lat = s.laterality.value
            laterality_dist[lat] = laterality_dist.get(lat, 0) + 1

        # Missing values per feature
        missing_per_feature = df_features.isnull().sum().to_dict()

        return {
            "dataset_name": manifest.dataset_name,
            "total_records": total_samples,
            "unique_subjects": unique_athletes,
            "injured_subjects": injured_count,
            "non_injured_subjects": healthy_count,
            "missing_labels_count": missing_labels_count,
            "injury_types_distribution": injury_types_dist,
            "laterality_distribution": laterality_dist,
            "missing_values_per_feature": missing_per_feature,
            "available_biomechanical_variables": [
                col for col in df_features.columns
                if col not in ["sample_id", "athlete_id", "modality", "sport", "movement_type", "laterality", "source_dataset", "injury_label", "injury_type"]
            ],
            "feature_matrix_shape": list(df_features.shape),
        }
