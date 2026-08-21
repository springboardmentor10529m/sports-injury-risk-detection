"""
SafeMove Calgary Biomechanical Dataset Ingestion & Integration Script.
Ingests raw Calgary motion-capture metadata, generates mapping & compatibility reports,
extracts tabular ML feature matrix, and executes subject-isolated train/val/test splits.
"""
import sys
import os
from pathlib import Path
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.datasets.storage_layout import DatasetStorageManager
from app.ml.datasets.adapters.calgary_adapter import CalgaryDatasetAdapter
from app.ml.datasets.validator import DatasetValidator
from app.ml.datasets.splitter import DatasetSplitter


def main():
    print("=" * 80)
    print("SAFEMOVE PHASE 5A.5 — CALGARY BIOMECHANICAL DATASET INTEGRATION")
    print("=" * 80)

    backend_root = Path(__file__).resolve().parent.parent
    raw_csv = backend_root / "data" / "raw" / "calgary" / "calgary_biomechanics_metadata.csv"

    if not raw_csv.exists():
        print(f"Error: Raw CSV not found at {raw_csv}")
        sys.exit(1)

    storage = DatasetStorageManager(base_data_dir=str(backend_root / "data"))
    adapter = CalgaryDatasetAdapter(storage_manager=storage)

    # 1. Ingest & Generate Manifest, Reports, and Feature Matrix
    print("\n1. [Parsing & Ingestion]")
    manifest, df_features, stats = adapter.ingest_and_generate_artifacts(raw_csv)
    print(f"   -> Successfully ingested {len(manifest.samples)} records from {raw_csv.name}")
    print(f"   -> Modality: {manifest.samples[0].modality.value}")
    print(f"   -> Ground Truth Classes: {stats['injury_types_distribution']}")

    # 2. Validation Checks
    print("\n2. [Dataset Validation Audits]")
    validator = DatasetValidator()
    report = validator.validate_manifest(
        manifest=manifest,
        check_files_exist=True,
        check_video_integrity=False,  # Tabular/Mocap data, NOT video
        allow_unlabeled=False
    )
    print(f"   -> Validation Passed:        {report.is_valid}")
    print(f"   -> Modalities Identified:    {report.modalities_present}")
    print(f"   -> Unique Subjects Tracked:  {report.unique_athletes_count}")
    print(f"   -> Class Distribution:       {report.class_distribution}")
    print(f"   -> Missing Labels Count:     {len(report.missing_labels)}")
    print(f"   -> Duplicate Records:        {len(report.duplicate_records)}")

    # 3. Subject-Level Leakage Prevention Splitting
    print("\n3. [Subject-Level Leakage Prevention Partitioning]")
    splitter = DatasetSplitter(train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_seed=42)
    split_res = splitter.split(manifest)
    split_dir = storage.get_splits_dir("calgary")
    split_files = splitter.save_splits(split_res, split_dir)

    print(f"   -> Train Set: {split_res.train_count} samples (Subjects: {len(split_res.train_athletes)})")
    print(f"   -> Val Set:   {split_res.val_count} samples (Subjects: {len(split_res.val_athletes)})")
    print(f"   -> Test Set:  {split_res.test_count} samples (Subjects: {len(split_res.test_athletes)})")
    print(f"   -> Leakage Check: {split_res.leakage_notes}")

    # 4. Feature Matrix Summary
    print("\n4. [ML Tabular Feature Matrix]")
    print(f"   -> Feature Table Dimensions: {df_features.shape[0]} rows x {df_features.shape[1]} columns")
    print(f"   -> Location: {storage.get_features_dir('calgary') / 'features.csv'}")

    print("\n" + "=" * 80)
    print("CALGARY DATASET INTEGRATION COMPLETED & AUDITED SUCCESSFULLY")
    print("=" * 80)


if __name__ == "__main__":
    main()
