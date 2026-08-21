"""
Tests for SafeMove Phase 5A.5: Calgary Biomechanical Dataset Adapter,
Provenance, Feature Mapping, Modality Detection, and Leakage Prevention.
"""
from pathlib import Path
import csv
import json
import pytest
import pandas as pd

from app.ml.datasets.schema import DataModality, Laterality, DatasetManifest
from app.ml.datasets.storage_layout import DatasetStorageManager
from app.ml.datasets.adapters.calgary_adapter import (
    CalgaryDatasetAdapter,
    CALGARY_FIELD_MAPPINGS,
    SAFEMOVE_COMPATIBILITY_SPEC,
)
from app.ml.datasets.validator import DatasetValidator
from app.ml.datasets.splitter import DatasetSplitter


@pytest.fixture
def sample_calgary_csv(tmp_path: Path) -> Path:
    """Create a temporary Calgary metadata CSV file for unit tests."""
    csv_file = tmp_path / "test_calgary_meta.csv"
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Subject_ID", "Gender", "Age", "Height_cm", "Mass_kg", "Speed_ms",
            "Experience_Years", "Weekly_Mileage_km", "Injury_Status", "Injury_Type",
            "Affected_Side", "Knee_Flexion_ROM", "Peak_Knee_Flexion", "Peak_Knee_Abduction",
            "Hip_Flexion_ROM", "Peak_Hip_Adduction", "Peak_Hip_Internal_Rotation",
            "Ankle_Dorsiflexion_ROM", "Peak_Trunk_Forward_Lean", "Peak_Vertical_GRF",
            "Vertical_Loading_Rate"
        ])
        writer.writerow([
            "SUBJ_0101", "Female", "27.5", "165.0", "58.0", "3.5", "4.0", "30.0",
            "Injured", "PATELLOFEMORAL_PAIN", "Left", "42.0", "48.0", "9.5",
            "38.0", "18.0", "12.0", "24.0", "12.5", "2.40", "68.0"
        ])
        writer.writerow([
            "SUBJ_0102", "Male", "32.0", "178.0", "72.0", "3.5", "6.0", "45.0",
            "Healthy", "HEALTHY_CONTROL", "None", "45.5", "51.5", "4.0",
            "40.5", "13.0", "7.0", "27.0", "8.0", "2.30", "54.0"
        ])
        writer.writerow([
            "SUBJ_0103", "Male", "40.0", "175.0", "70.0", "3.5", "10.0", "50.0",
            "Injured", "IT_BAND_SYNDROME", "Right", "39.0", "44.5", "6.5",
            "35.0", "20.0", "14.0", "", "11.0", "2.60", "75.0"  # Missing Ankle ROM
        ])
    return csv_file


def test_calgary_metadata_parsing(sample_calgary_csv: Path, tmp_path: Path):
    """Verify parsing of Calgary records into SafeMove DatasetSample objects."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    samples = adapter.parse_records(sample_calgary_csv)

    assert len(samples) == 3
    s1 = samples[0]
    assert s1.athlete_id == "CALGARY_SUBJ_0101"
    assert s1.modality == DataModality.BIOMECHANICAL_TABLE
    assert s1.video_path is None  # Ensures no fabricated video paths
    assert s1.raw_file_path == str(sample_calgary_csv.resolve())
    assert s1.metadata["age"] == 27.5
    assert s1.metadata["gender"] == "Female"


def test_calgary_injury_label_and_pathology_preservation(sample_calgary_csv: Path, tmp_path: Path):
    """Verify ground-truth injury labels and clinical pathology preservation."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    samples = adapter.parse_records(sample_calgary_csv)

    # Injured Subject 1
    assert samples[0].injury_label == 1
    assert samples[0].injury_type == "PATELLOFEMORAL_PAIN"

    # Healthy Control Subject 2
    assert samples[1].injury_label == 0
    assert samples[1].injury_type == "HEALTHY_CONTROL"

    # Injured Subject 3
    assert samples[2].injury_label == 1
    assert samples[2].injury_type == "IT_BAND_SYNDROME"


def test_calgary_laterality_preservation(sample_calgary_csv: Path, tmp_path: Path):
    """Verify correct laterality parsing (Left -> LEFT, Right -> RIGHT, None -> NOT_APPLICABLE)."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    samples = adapter.parse_records(sample_calgary_csv)

    assert samples[0].laterality == Laterality.LEFT
    assert samples[1].laterality == Laterality.NOT_APPLICABLE
    assert samples[2].laterality == Laterality.RIGHT


def test_calgary_provenance_preservation(tmp_path: Path):
    """Verify research provenance, citation, and license."""
    adapter = CalgaryDatasetAdapter()
    provenance = adapter.get_provenance()

    assert provenance.source_name == "Calgary_Running_Injury_Biomechanical_Dataset"
    assert "Nature Scientific Data" in provenance.citation
    assert "CC-BY" in provenance.license
    assert "Vicon" in provenance.annotation_protocol


def test_calgary_missing_value_handling(sample_calgary_csv: Path, tmp_path: Path):
    """Verify explicit None recording for missing measurements without dropping records."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    samples = adapter.parse_records(sample_calgary_csv)

    # Subject 3 had empty Ankle_Dorsiflexion_ROM
    s3 = samples[2]
    assert s3.biomechanical_data["ankle_dorsiflexion_rom_left"] is None
    assert s3.biomechanical_data["knee_flexion_rom_left"] == 39.0


def test_calgary_modality_detection(sample_calgary_csv: Path, tmp_path: Path):
    """Verify modality is BIOMECHANICAL_TABLE and validator accepts non-video records."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    manifest, df_features, stats = adapter.ingest_and_generate_artifacts(sample_calgary_csv)

    validator = DatasetValidator()
    report = validator.validate_manifest(manifest, check_files_exist=True, check_video_integrity=False)

    assert report.is_valid is True
    assert report.modalities_present == {"BIOMECHANICAL_TABLE": 3}
    assert len(report.corrupt_files) == 0


def test_calgary_subject_level_split_leakage(sample_calgary_csv: Path, tmp_path: Path):
    """Verify that subjects are partitioned without leakage across splits."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    manifest, _, _ = adapter.ingest_and_generate_artifacts(sample_calgary_csv)

    splitter = DatasetSplitter(train_ratio=0.34, val_ratio=0.33, test_ratio=0.33, random_seed=42)
    split_res = splitter.split(manifest)

    assert split_res.leakage_verified is True
    train_set = set(split_res.train_athletes)
    val_set = set(split_res.val_athletes)
    test_set = set(split_res.test_athletes)

    assert len(train_set.intersection(val_set)) == 0
    assert len(train_set.intersection(test_set)) == 0
    assert len(val_set.intersection(test_set)) == 0


def test_calgary_feature_mapping_correctness(sample_calgary_csv: Path, tmp_path: Path):
    """Verify feature mapping correctness and mapping report generation."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    manifest, df_features, stats = adapter.ingest_and_generate_artifacts(sample_calgary_csv)

    assert df_features.shape[0] == 3
    assert "knee_flexion_rom_left" in df_features.columns
    assert "peak_knee_flexion_left" in df_features.columns
    assert "knee_valgus_proxy_left_max" in df_features.columns
    assert "hip_adduction_max" in df_features.columns
    assert "vertical_loading_rate" in df_features.columns

    # Verify mapping report was written
    mapping_report_path = storage.get_labels_dir("calgary") / "mapping_report.json"
    assert mapping_report_path.exists()
    with open(mapping_report_path, "r", encoding="utf-8") as f:
        mapping_data = json.load(f)
    assert len(mapping_data["mappings"]) == len(CALGARY_FIELD_MAPPINGS)


def test_calgary_compatibility_report(sample_calgary_csv: Path, tmp_path: Path):
    """Verify compatibility report generation and distinguishing of available vs unavailable features."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)
    adapter.ingest_and_generate_artifacts(sample_calgary_csv)

    compat_report_path = storage.get_labels_dir("calgary") / "compatibility_report.json"
    assert compat_report_path.exists()
    with open(compat_report_path, "r", encoding="utf-8") as f:
        compat_data = json.load(f)

    assert compat_data["total_safemove_features_evaluated"] == len(SAFEMOVE_COMPATIBILITY_SPEC)
    assert compat_data["available_features_count"] > 0
    assert compat_data["unavailable_features_count"] > 0
