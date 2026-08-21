"""
Dataset Validation Module for SafeMove ML Pipeline.
Performs integrity, label completeness, corruption, format, duplicate,
and class balance audits across Video, Motion Capture, and Biomechanical tabular modalities.
"""
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import hashlib
import cv2
from pydantic import BaseModel, Field

from app.ml.datasets.schema import DatasetManifest, DatasetSample, DataModality


class ValidationReport(BaseModel):
    """Structured report produced by dataset validation audits."""
    is_valid: bool = True
    total_samples: int = 0
    valid_samples: int = 0
    modalities_present: Dict[str, int] = Field(default_factory=dict)
    missing_labels: List[str] = Field(default_factory=list, description="Sample IDs lacking ground-truth labels")
    duplicate_records: List[Dict[str, Any]] = Field(default_factory=list, description="Detected duplicate file checksums or IDs")
    corrupt_files: List[Dict[str, Any]] = Field(default_factory=list, description="Unreadable or corrupt video/data files")
    unsupported_formats: List[Dict[str, Any]] = Field(default_factory=list, description="Disallowed file extensions")
    missing_metadata: List[Dict[str, Any]] = Field(default_factory=list, description="Samples lacking key attributes")
    class_distribution: Dict[str, int] = Field(default_factory=dict, description="Counts per label category")
    class_imbalance_ratio: Optional[float] = Field(default=None, description="Ratio between majority and minority class")
    athlete_distribution: Dict[str, int] = Field(default_factory=dict, description="Sample counts grouped by athlete_id")
    unique_athletes_count: int = 0
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)

    @property
    def duplicate_videos(self) -> List[Dict[str, Any]]:
        return self.duplicate_records

    @property
    def corrupt_videos(self) -> List[Dict[str, Any]]:
        return self.corrupt_files


class DatasetValidator:
    """Performs comprehensive validation of a DatasetManifest across all data modalities."""

    ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    ALLOWED_DATA_EXTENSIONS = {".csv", ".tsv", ".json", ".mat", ".c3d", ".txt", ".parquet"}

    @staticmethod
    def calculate_file_hash(file_path: Path) -> str:
        """Compute SHA256 checksum of a file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def validate_manifest(
        self,
        manifest: DatasetManifest,
        check_files_exist: bool = True,
        check_video_integrity: bool = True,
        allow_unlabeled: bool = False
    ) -> ValidationReport:
        """Audit dataset samples, files, metadata, duplicates, modalities, and class balance."""
        report = ValidationReport(total_samples=len(manifest.samples))

        seen_checksums: Dict[str, str] = {}  # checksum -> sample_id
        seen_paths: Dict[str, str] = {}       # normalized path -> sample_id
        seen_sample_ids: Set[str] = set()
        athlete_counts: Dict[str, int] = {}
        class_counts: Dict[str, int] = {}
        modality_counts: Dict[str, int] = {}

        valid_count = 0

        for sample in manifest.samples:
            sample_errors: List[str] = []

            # 0. Duplicate Sample ID check
            if sample.sample_id in seen_sample_ids:
                report.duplicate_records.append({
                    "sample_id": sample.sample_id,
                    "reason": "Duplicate sample_id detected in manifest."
                })
                sample_errors.append(f"Duplicate sample_id: {sample.sample_id}")
            seen_sample_ids.add(sample.sample_id)

            # Track Modality
            mod_str = sample.modality.value
            modality_counts[mod_str] = modality_counts.get(mod_str, 0) + 1

            # 1. Label Check
            if sample.injury_label is None:
                report.missing_labels.append(sample.sample_id)
                if not allow_unlabeled:
                    sample_errors.append(f"Sample {sample.sample_id} lacks required 'injury_label'.")
            else:
                label_str = str(sample.injury_label)
                class_counts[label_str] = class_counts.get(label_str, 0) + 1

            # 2. Metadata Completeness Check
            missing_meta_fields = []
            if not sample.sport:
                missing_meta_fields.append("sport")
            if not sample.movement_type:
                missing_meta_fields.append("movement_type")
            if not sample.source_dataset:
                missing_meta_fields.append("source_dataset")
            if missing_meta_fields:
                report.missing_metadata.append({
                    "sample_id": sample.sample_id,
                    "missing_fields": missing_meta_fields
                })
                report.warnings.append(
                    f"Sample {sample.sample_id} missing detailed metadata: {missing_meta_fields}"
                )

            # 3. Athlete / Subject Tracking
            athlete_key = sample.athlete_id or "ANONYMOUS_UNASSIGNED"
            athlete_counts[athlete_key] = athlete_counts.get(athlete_key, 0) + 1
            if not sample.athlete_id:
                report.warnings.append(
                    f"Sample {sample.sample_id} has no athlete_id. Group split will isolate it by sample."
                )

            # 4. Modality-Specific File and Integrity Checks
            target_path_str = sample.video_path if sample.modality in [DataModality.VIDEO, DataModality.MULTIMODAL] else sample.raw_file_path

            if target_path_str:
                p = Path(target_path_str)
                ext = p.suffix.lower()

                # Validate Extension by Modality
                if sample.modality in [DataModality.VIDEO, DataModality.MULTIMODAL]:
                    if ext not in self.ALLOWED_VIDEO_EXTENSIONS:
                        report.unsupported_formats.append({
                            "sample_id": sample.sample_id,
                            "file_path": target_path_str,
                            "extension": ext,
                            "modality": mod_str
                        })
                        sample_errors.append(f"Unsupported video format '{ext}' for sample {sample.sample_id}.")
                else:
                    if ext and ext not in self.ALLOWED_DATA_EXTENSIONS:
                        report.unsupported_formats.append({
                            "sample_id": sample.sample_id,
                            "file_path": target_path_str,
                            "extension": ext,
                            "modality": mod_str
                        })
                        sample_errors.append(f"Unsupported data format '{ext}' for sample {sample.sample_id}.")

                if check_files_exist:
                    if not p.exists() or not p.is_file():
                        report.corrupt_files.append({
                            "sample_id": sample.sample_id,
                            "file_path": target_path_str,
                            "reason": "File does not exist or is not a regular file."
                        })
                        sample_errors.append(f"File missing at path: {target_path_str}")
                    else:
                        # Check Path Collisions
                        norm_path = str(p.resolve())
                        if norm_path in seen_paths and sample.modality == DataModality.VIDEO:
                            report.duplicate_records.append({
                                "sample_id": sample.sample_id,
                                "duplicate_of_sample_id": seen_paths[norm_path],
                                "file_path": norm_path,
                                "reason": "Identical file path registered under multiple samples."
                            })
                            sample_errors.append(f"Duplicate file path collision with {seen_paths[norm_path]}")
                        else:
                            seen_paths[norm_path] = sample.sample_id

                        # Check Binary Duplicates via Checksum
                        chk = sample.checksum_sha256 or self.calculate_file_hash(p)
                        if chk in seen_checksums and sample.modality == DataModality.VIDEO:
                            report.duplicate_records.append({
                                "sample_id": sample.sample_id,
                                "duplicate_of_sample_id": seen_checksums[chk],
                                "checksum_sha256": chk,
                                "reason": "Identical file SHA256 checksum detected."
                            })
                            sample_errors.append(f"Duplicate binary detected (matches {seen_checksums[chk]}).")
                        else:
                            seen_checksums[chk] = sample.sample_id

                        # Video Decoding Check ONLY for Video Modality
                        if sample.modality == DataModality.VIDEO and check_video_integrity:
                            cap = cv2.VideoCapture(str(p))
                            if not cap.isOpened():
                                report.corrupt_files.append({
                                    "sample_id": sample.sample_id,
                                    "file_path": target_path_str,
                                    "reason": "OpenCV failed to open video stream."
                                })
                                sample_errors.append(f"Corrupt video stream for {sample.sample_id}")
                            else:
                                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                                fps = cap.get(cv2.CAP_PROP_FPS)
                                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                                cap.release()

                                if frame_count < 5:
                                    report.corrupt_files.append({
                                        "sample_id": sample.sample_id,
                                        "file_path": target_path_str,
                                        "reason": f"Insufficient frames: {frame_count} (< 5 frames required for kinematics)."
                                    })
                                    sample_errors.append(f"Too few frames ({frame_count}) for sample {sample.sample_id}")
                                if fps <= 0 or width <= 0 or height <= 0:
                                    report.corrupt_files.append({
                                        "sample_id": sample.sample_id,
                                        "file_path": target_path_str,
                                        "reason": f"Invalid video dimensions or framerate: {width}x{height} @ {fps}fps."
                                    })
                                    sample_errors.append(f"Invalid video metadata for sample {sample.sample_id}")

            elif sample.modality in [DataModality.BIOMECHANICAL_TABLE, DataModality.MOTION_CAPTURE]:
                # Non-file tabular records must have biomechanical data
                if not sample.biomechanical_data and not sample.metadata:
                    report.warnings.append(
                        f"Sample {sample.sample_id} is marked as {sample.modality.value} but has empty biomechanical_data dictionary."
                    )

            if not sample_errors:
                valid_count += 1
            else:
                report.errors.extend(sample_errors)

        report.valid_samples = valid_count
        report.modalities_present = modality_counts
        report.class_distribution = class_counts
        report.athlete_distribution = athlete_counts
        report.unique_athletes_count = len(athlete_counts)

        # 6. Class Imbalance Calculation
        if len(class_counts) > 1:
            counts = sorted(class_counts.values())
            min_c = counts[0]
            max_c = counts[-1]
            if min_c > 0:
                report.class_imbalance_ratio = round(max_c / min_c, 2)
                if report.class_imbalance_ratio > 3.0:
                    report.warnings.append(
                        f"Significant class imbalance detected: ratio {report.class_imbalance_ratio}:1 "
                        f"(Majority: {max_c}, Minority: {min_c}). Stratified splitting recommended."
                    )
        elif len(class_counts) == 1:
            report.warnings.append(
                f"Single class dataset: only class '{list(class_counts.keys())[0]}' present ({list(class_counts.values())[0]} samples)."
            )

        if report.errors or len(report.corrupt_files) > 0 or len(report.duplicate_records) > 0:
            report.is_valid = False

        return report
