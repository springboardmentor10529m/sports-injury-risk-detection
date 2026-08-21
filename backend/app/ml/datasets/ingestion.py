"""
Dataset Ingestion Module for SafeMove ML Pipeline.
Imports raw video files and external annotations into standardized, provenance-tracked manifests.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import shutil
import hashlib
import csv

from app.ml.datasets.schema import (
    DatasetSample,
    DatasetManifest,
    DatasetProvenance,
    Laterality,
    SportType,
)
from app.ml.datasets.storage_layout import DatasetStorageManager


class DatasetIngestor:
    """Ingests raw video directories or annotation tables into the SafeMove dataset repository."""

    def __init__(self, storage_manager: Optional[DatasetStorageManager] = None):
        self.storage = storage_manager or DatasetStorageManager()

    @staticmethod
    def calculate_file_hash(file_path: Path) -> str:
        """Calculate SHA256 checksum of a file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def ingest_from_csv(
        self,
        csv_path: Path,
        dataset_name: str,
        provenance: DatasetProvenance,
        copy_to_raw_storage: bool = True
    ) -> DatasetManifest:
        """
        Ingest dataset from a CSV annotation file.
        Expected CSV columns:
        video_id, video_path, [athlete_id], [sport], [movement_type], [injury_label],
        [injury_type], [laterality], [timestamp_onset_seconds]
        """
        csv_path = Path(csv_path).resolve()
        if not csv_path.exists():
            raise FileNotFoundError(f"Annotation CSV not found: {csv_path}")

        dirs = self.storage.initialize_dataset_directories(dataset_name)
        raw_dir = dirs["raw"]

        samples: List[DatasetSample] = []

        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                v_path_raw = row.get("video_path", "").strip()
                source_video_path = Path(v_path_raw)
                if not source_video_path.is_absolute():
                    source_video_path = (csv_path.parent / source_video_path).resolve()

                stored_path = source_video_path
                checksum = None

                if source_video_path.exists() and source_video_path.is_file():
                    checksum = self.calculate_file_hash(source_video_path)
                    if copy_to_raw_storage:
                        dest_file = raw_dir / source_video_path.name
                        if not dest_file.exists():
                            shutil.copy2(source_video_path, dest_file)
                        stored_path = dest_file

                # Parse Laterality
                lat_str = row.get("laterality", "UNSPECIFIED").strip().upper()
                try:
                    laterality_enum = Laterality(lat_str)
                except ValueError:
                    laterality_enum = Laterality.UNSPECIFIED

                # Parse timestamp onset
                ts_onset = None
                if row.get("timestamp_onset_seconds"):
                    try:
                        ts_onset = float(row.get("timestamp_onset_seconds"))
                    except (ValueError, TypeError):
                        pass

                # Parse Injury Label (DO NOT INVENT LABELS)
                raw_label = row.get("injury_label")
                parsed_label = None
                if raw_label is not None and str(raw_label).strip() != "":
                    label_str = str(raw_label).strip()
                    if label_str.isdigit():
                        parsed_label = int(label_str)
                    else:
                        try:
                            parsed_label = float(label_str)
                        except ValueError:
                            parsed_label = label_str

                sample = DatasetSample(
                    video_id=row.get("video_id", source_video_path.stem),
                    athlete_id=row.get("athlete_id", None),
                    video_path=str(stored_path),
                    sport=row.get("sport", SportType.GENERAL.value),
                    movement_type=row.get("movement_type", "Drop Jump"),
                    injury_label=parsed_label,
                    injury_type=row.get("injury_type", None),
                    laterality=laterality_enum,
                    timestamp_onset_seconds=ts_onset,
                    source_dataset=provenance.source_name,
                    license=provenance.license,
                    checksum_sha256=checksum,
                )
                samples.append(sample)

        provenance.total_samples = len(samples)
        manifest = DatasetManifest(
            dataset_name=dataset_name,
            provenance=provenance,
            samples=samples
        )

        # Save manifest
        manifest_path = dirs["labels"] / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(), f, indent=2)

        return manifest
