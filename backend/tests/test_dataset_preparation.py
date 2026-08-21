"""Tests for SafeMove Phase 5A Dataset Integration, Schemas, Provenance, Splits, and Feature Pipeline."""

import csv
from pathlib import Path

import cv2
import numpy as np

from app.ml.datasets.feature_pipeline import MLFeatureGenerator
from app.ml.datasets.ingestion import DatasetIngestor
from app.ml.datasets.schema import (
    DatasetManifest,
    DatasetProvenance,
    DatasetSample,
    Laterality,
    SportType,
)
from app.ml.datasets.splitter import DatasetSplitter
from app.ml.datasets.storage_layout import DatasetStorageManager
from app.ml.datasets.validator import DatasetValidator


def create_temp_video_file(output_path: Path, num_frames=10) -> Path:
    """Create a temporary MP4 video file on disk."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_path), fourcc, 10.0, (320, 240))
    for _ in range(num_frames):
        frame = np.zeros((240, 320, 3), dtype=np.uint8)
        cv2.circle(frame, (160, 60), 15, (255, 255, 255), -1)
        cv2.line(frame, (160, 75), (160, 140), (255, 255, 255), 3)
        cv2.line(frame, (160, 140), (130, 200), (255, 255, 255), 2)
        cv2.line(frame, (160, 140), (190, 200), (255, 255, 255), 2)
        out.write(frame)
    out.release()
    return output_path


# --- 1. Schema & Provenance Tests ---


def test_dataset_schema_and_provenance():
    """Verify standardized dataset schemas, laterality enums, and provenance tracking."""
    provenance = DatasetProvenance(
        source_name="Clinical_ACL_DropJump_2025",
        version="2.1.0",
        license="CC-BY-NC-4.0",
        citation="doi:10.1016/j.biomech.2025.01.001",
        total_samples=150,
        annotation_protocol="Orthopedic Surgeon Clinical Chart Review",
    )

    sample = DatasetSample(
        video_id="VID_001",
        athlete_id="ATH_042",
        video_path="/data/raw/drill_001.mp4",
        sport=SportType.BASKETBALL.value,
        movement_type="Drop Jump",
        injury_label=1,
        injury_type="ACL_TEAR",
        laterality=Laterality.LEFT,
        timestamp_onset_seconds=1.35,
        source_dataset=provenance.source_name,
    )

    manifest = DatasetManifest(dataset_name="ACL_Cohort_v2", provenance=provenance, samples=[sample])

    assert manifest.dataset_name == "ACL_Cohort_v2"
    assert manifest.samples[0].athlete_id == "ATH_042"
    assert manifest.samples[0].injury_label == 1
    assert manifest.samples[0].laterality == Laterality.LEFT
    assert manifest.provenance.source_name == "Clinical_ACL_DropJump_2025"


# --- 2. Storage Separation Tests ---


def test_storage_layout_separation(tmp_path: Path):
    """Verify strict filesystem separation of raw, processed, pose, kinematics, labels, and features."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path))
    dirs = storage.initialize_dataset_directories("test_cohort")

    assert dirs["raw"].name == "test_cohort"
    assert "raw" in str(dirs["raw"])
    assert "processed" in str(dirs["processed"])
    assert "pose" in str(dirs["pose"])
    assert "kinematics" in str(dirs["kinematics"])
    assert "labels" in str(dirs["labels"])
    assert "features" in str(dirs["features"])
    assert "splits" in str(dirs["splits"])

    for d in dirs.values():
        assert d.exists()
        assert d.is_dir()


# --- 3. Validation Tests ---


def test_dataset_validator_missing_labels_and_corrupt(tmp_path: Path):
    """Verify validation detects missing labels, corrupt video files, and invalid formats."""
    # Create 1 valid video file
    valid_vid = tmp_path / "valid.mp4"
    create_temp_video_file(valid_vid, num_frames=10)

    # Create 1 corrupt 0-byte file
    corrupt_vid = tmp_path / "corrupt.mp4"
    corrupt_vid.write_bytes(b"")

    provenance = DatasetProvenance(source_name="Test_Source")

    samples = [
        DatasetSample(
            video_id="V1",
            video_path=str(valid_vid),
            injury_label=None,  # Missing label
            source_dataset="Test_Source",
        ),
        DatasetSample(
            video_id="V2",
            video_path=str(corrupt_vid),  # Corrupt video
            injury_label=0,
            source_dataset="Test_Source",
        ),
        DatasetSample(
            video_id="V3",
            video_path=str(tmp_path / "non_existent.mp4"),  # Missing file
            injury_label=1,
            source_dataset="Test_Source",
        ),
    ]

    manifest = DatasetManifest(dataset_name="Audit_Test", provenance=provenance, samples=samples)
    validator = DatasetValidator()
    report = validator.validate_manifest(
        manifest,
        check_files_exist=True,
        check_video_integrity=True,
        allow_unlabeled=False,
    )

    assert report.is_valid is False
    assert len(report.missing_labels) == 1
    assert len(report.corrupt_videos) >= 1
    assert len(report.errors) >= 3


def test_dataset_validator_duplicate_detection(tmp_path: Path):
    """Verify detection of duplicate videos via checksums and paths."""
    vid_file = tmp_path / "sample_drill.mp4"
    create_temp_video_file(vid_file, num_frames=10)

    # Identical copy with different filename
    dup_file = tmp_path / "sample_drill_copy.mp4"
    dup_file.write_bytes(vid_file.read_bytes())

    provenance = DatasetProvenance(source_name="Dup_Test")
    samples = [
        DatasetSample(
            video_id="V1",
            video_path=str(vid_file),
            injury_label=0,
            source_dataset="Dup_Test",
        ),
        DatasetSample(
            video_id="V2",
            video_path=str(dup_file),
            injury_label=0,
            source_dataset="Dup_Test",
        ),
    ]
    manifest = DatasetManifest(dataset_name="Dup_Audit", provenance=provenance, samples=samples)
    validator = DatasetValidator()
    report = validator.validate_manifest(manifest, check_files_exist=True, check_video_integrity=False)

    assert report.is_valid is False
    assert len(report.duplicate_videos) == 1


def test_dataset_validator_class_imbalance(tmp_path: Path):
    """Verify accurate class balance calculation and high-ratio alert."""
    provenance = DatasetProvenance(source_name="Imbalance_Test")
    # 90 class 0, 10 class 1 -> 9:1 imbalance
    samples = [
        DatasetSample(
            video_id=f"V{i}",
            video_path=f"/path/vid_{i}.mp4",
            injury_label=0 if i < 90 else 1,
            source_dataset="Imbalance_Test",
        )
        for i in range(100)
    ]
    manifest = DatasetManifest(dataset_name="Imbalance_Audit", provenance=provenance, samples=samples)
    validator = DatasetValidator()
    report = validator.validate_manifest(manifest, check_files_exist=False, allow_unlabeled=False)

    assert report.class_distribution == {"0": 90, "1": 10}
    assert report.class_imbalance_ratio == 9.0
    assert any("class imbalance" in w.lower() for w in report.warnings)


# --- 4. Athlete-Level Leakage Prevention Tests ---


def test_athlete_level_leakage_prevention():
    """Verify that all videos from the same athlete are strictly contained in ONE split partition."""
    # 10 Athletes with 4 videos each = 40 samples total
    samples = []
    for ath_idx in range(10):
        athlete_id = f"ATH_{ath_idx:02d}"
        for vid_idx in range(4):
            samples.append(
                DatasetSample(
                    video_id=f"{athlete_id}_V{vid_idx}",
                    athlete_id=athlete_id,
                    video_path=f"/data/{athlete_id}_V{vid_idx}.mp4",
                    sport="Soccer",
                    movement_type="Cutting Drill",
                    injury_label=1 if ath_idx % 3 == 0 else 0,
                    source_dataset="Leakage_Test",
                )
            )

    manifest = DatasetManifest(
        dataset_name="Leakage_Audit_Cohort",
        provenance=DatasetProvenance(source_name="Leakage_Test"),
        samples=samples,
    )

    splitter = DatasetSplitter(train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_seed=42)
    split_res = splitter.split(manifest)

    # 1. Assert leakage verified
    assert split_res.leakage_verified is True

    # 2. Assert zero overlap between athlete sets
    train_set = set(split_res.train_athletes)
    val_set = set(split_res.val_athletes)
    test_set = set(split_res.test_athletes)

    assert len(train_set.intersection(val_set)) == 0
    assert len(train_set.intersection(test_set)) == 0
    assert len(val_set.intersection(test_set)) == 0

    # 3. Assert all samples in a partition belong strictly to that partition's athletes
    for s in split_res.train_samples:
        assert s.athlete_id in train_set
        assert s.athlete_id not in val_set
        assert s.athlete_id not in test_set

    for s in split_res.val_samples:
        assert s.athlete_id in val_set
        assert s.athlete_id not in train_set
        assert s.athlete_id not in test_set

    for s in split_res.test_samples:
        assert s.athlete_id in test_set
        assert s.athlete_id not in train_set
        assert s.athlete_id not in val_set


# --- 5. Ingestion Pipeline & Feature Generation Tests ---


def test_dataset_ingestion_and_feature_pipeline(tmp_path: Path):
    """Verify CSV ingestion and end-to-end ML feature table extraction from real test videos."""
    storage = DatasetStorageManager(base_data_dir=str(tmp_path / "data"))

    # Create 2 real video drills
    v1_path = tmp_path / "drill_athlete1.mp4"
    v2_path = tmp_path / "drill_athlete2.mp4"
    create_temp_video_file(v1_path, num_frames=12)
    create_temp_video_file(v2_path, num_frames=12)

    # Create annotation CSV
    csv_file = tmp_path / "annotations.csv"
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "video_id",
                "athlete_id",
                "video_path",
                "sport",
                "movement_type",
                "injury_label",
                "injury_type",
                "laterality",
                "timestamp_onset_seconds",
            ]
        )
        writer.writerow(
            [
                "V_01",
                "ATH_10",
                str(v1_path),
                "Soccer",
                "Drop Jump",
                "0",
                "NONE",
                "BILATERAL",
                "0.5",
            ]
        )
        writer.writerow(
            [
                "V_02",
                "ATH_20",
                str(v2_path),
                "Basketball",
                "Drop Jump",
                "1",
                "ACL_TEAR",
                "LEFT",
                "0.8",
            ]
        )

    # 1. Ingest Dataset
    ingestor = DatasetIngestor(storage_manager=storage)
    provenance = DatasetProvenance(source_name="Integration_Test_Cohort", version="1.0.0", license="MIT")
    manifest = ingestor.ingest_from_csv(
        csv_path=csv_file,
        dataset_name="integration_cohort",
        provenance=provenance,
        copy_to_raw_storage=True,
    )

    assert len(manifest.samples) == 2
    assert manifest.samples[0].athlete_id == "ATH_10"
    assert manifest.samples[0].injury_label == 0
    assert manifest.samples[1].injury_label == 1

    # 2. Run Feature Generation Pipeline
    feature_generator = MLFeatureGenerator(storage_manager=storage)
    df = feature_generator.generate_feature_table(manifest)

    assert len(df) == 2
    assert "knee_flexion_rom_left" in df.columns
    assert "trunk_lean_max" in df.columns
    assert "knee_flexion_asymmetry_mean" in df.columns
    assert "z_score_knee_flexion_rom_left" in df.columns
    assert "injury_label" in df.columns

    # Verify labels are preserved and not altered
    assert df.iloc[0]["injury_label"] == 0
    assert df.iloc[1]["injury_label"] == 1
    assert df.iloc[1]["injury_type"] == "ACL_TEAR"
