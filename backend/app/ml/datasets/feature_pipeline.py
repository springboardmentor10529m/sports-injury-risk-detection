"""
ML Feature Generation Pipeline for SafeMove.
Orchestrates: Video -> Pose Extraction -> Kinematics -> Phase 4 Statistical Features -> Tabular ML Matrix.
Strictly generates feature tables without training models or inventing injury labels.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import logging
import pandas as pd
import numpy as np

from app.ml.datasets.schema import DatasetManifest, DatasetSample
from app.ml.datasets.storage_layout import DatasetStorageManager
from app.ml.pose.pose_extractor import get_pose_extractor, PoseExtractor
from app.services.kinematics_engine import get_kinematics_engine, KinematicsEngine
from app.services.anomaly_detection_service import get_anomaly_service, AnomalyDetectionService

logger = logging.getLogger("uvicorn.error")


class MLFeatureGenerator:
    """Extracts end-to-end biomechanical feature tables from dataset video samples."""

    def __init__(
        self,
        storage_manager: Optional[DatasetStorageManager] = None,
        pose_extractor: Optional[PoseExtractor] = None,
        kinematics_engine: Optional[KinematicsEngine] = None,
        anomaly_service: Optional[AnomalyDetectionService] = None,
    ):
        self.storage = storage_manager or DatasetStorageManager()
        self.pose_extractor = pose_extractor or get_pose_extractor()
        self.kinematics_engine = kinematics_engine or get_kinematics_engine()
        self.anomaly_service = anomaly_service or get_anomaly_service()

    def process_sample(
        self,
        sample: DatasetSample,
        dataset_name: str,
        save_intermediate: bool = True
    ) -> Dict[str, Any]:
        """
        Execute feature extraction for a single dataset sample:
        1. Pose Landmarking (15 points)
        2. Joint Kinematics (angles, velocities, asymmetries)
        3. Statistical Deviation Summaries
        4. Assemble Numerical Feature Row
        """
        video_path = Path(sample.video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video file missing: {video_path}")

        # 1. Pose Landmark Extraction
        pose_result = self.pose_extractor.extract_from_video(
            video_path=str(video_path),
            smoothing_method="SAVITZKY_GOLAY"
        )

        dirs = self.storage.initialize_dataset_directories(dataset_name)

        if save_intermediate:
            pose_file = dirs["pose"] / f"{sample.sample_id}_pose.json"
            with open(pose_file, "w", encoding="utf-8") as f:
                json.dump(pose_result, f)

        # 2. Kinematics Computation
        kinematics_result = self.kinematics_engine.process_frames(pose_result)

        if save_intermediate:
            kin_file = dirs["kinematics"] / f"{sample.sample_id}_kinematics.json"
            with open(kin_file, "w", encoding="utf-8") as f:
                json.dump(kinematics_result, f)

        # 3. Statistical Features & Deviation Analysis
        anomaly_result = self.anomaly_service.analyze_session(
            timestamps=kinematics_result["timestamps"],
            joint_angles=kinematics_result["joint_angle_curves"],
            angular_velocities=kinematics_result["angular_velocities"],
            angular_accelerations=kinematics_result["angular_accelerations"],
            asymmetry_metrics=kinematics_result["asymmetry_metrics"],
        )

        feat_sum = anomaly_result["feature_summary"]
        deviations = anomaly_result["metric_deviations"]

        # Helper getters
        def get_stat(metric: str, prop: str) -> Optional[float]:
            return feat_sum.get(metric, {}).get(prop)

        def get_dev(dev_key: str, prop: str) -> Optional[float]:
            return deviations.get(dev_key, {}).get(prop)

        # 4. Construct Feature Row
        row: Dict[str, Any] = {
            # Provenance & Identifiers
            "sample_id": sample.sample_id,
            "video_id": sample.video_id,
            "athlete_id": sample.athlete_id or "ANONYMOUS",
            "sport": sample.sport,
            "movement_type": sample.movement_type,
            "laterality": sample.laterality.value,
            "source_dataset": sample.source_dataset,
            "frame_count": pose_result.get("frame_count", 0),
            "fps": pose_result.get("fps", 0.0),

            # Lower Limb Range of Motion (ROM)
            "knee_flexion_rom_left": get_stat("left_knee_angle", "range"),
            "knee_flexion_rom_right": get_stat("right_knee_angle", "range"),
            "knee_flexion_rom_diff": (
                abs((get_stat("left_knee_angle", "range") or 0.0) - (get_stat("right_knee_angle", "range") or 0.0))
                if get_stat("left_knee_angle", "range") is not None and get_stat("right_knee_angle", "range") is not None
                else None
            ),
            "peak_knee_flexion_left": get_stat("left_knee_angle", "max"),
            "peak_knee_flexion_right": get_stat("right_knee_angle", "max"),
            "hip_flexion_rom_left": get_stat("left_hip_angle", "range"),
            "hip_flexion_rom_right": get_stat("right_hip_angle", "range"),
            "ankle_dorsiflexion_rom_left": get_stat("left_ankle_angle", "range"),
            "ankle_dorsiflexion_rom_right": get_stat("right_ankle_angle", "range"),

            # Trunk Planar Kinematics
            "trunk_lean_max": get_stat("trunk_lean", "max"),
            "trunk_lean_mean": get_stat("trunk_lean", "mean"),
            "trunk_lean_std": get_stat("trunk_lean", "std_dev"),
            "trunk_lateral_tilt_max": get_stat("trunk_lateral_tilt", "max"),
            "trunk_lateral_tilt_mean": get_stat("trunk_lateral_tilt", "mean"),

            # Frontal Plane Knee Valgus Proxy
            "knee_valgus_proxy_left_max": get_stat("left_knee_valgus", "max"),
            "knee_valgus_proxy_right_max": get_stat("right_knee_valgus", "max"),
            "knee_valgus_proxy_max_diff": (
                abs((get_stat("left_knee_valgus", "max") or 0.0) - (get_stat("right_knee_valgus", "max") or 0.0))
                if get_stat("left_knee_valgus", "max") is not None and get_stat("right_knee_valgus", "max") is not None
                else None
            ),

            # Bilateral Asymmetry Indices (%)
            "knee_flexion_asymmetry_mean": get_stat("knee_flexion_asymmetry", "mean"),
            "knee_flexion_asymmetry_peak": get_stat("knee_flexion_asymmetry", "max"),
            "hip_flexion_asymmetry_mean": get_stat("hip_flexion_asymmetry", "mean"),
            "knee_valgus_asymmetry_mean": get_stat("knee_valgus_asymmetry", "mean"),

            # Dynamic Velocity Features (°/s)
            "knee_peak_velocity_left": get_stat("left_knee_angle", "peak_velocity"),
            "knee_peak_velocity_right": get_stat("right_knee_angle", "peak_velocity"),

            # Developmental Statistical Distances (Z-scores)
            "z_score_knee_flexion_rom_left": get_dev("left_knee_angle_range", "z_score"),
            "z_score_knee_flexion_rom_right": get_dev("right_knee_angle_range", "z_score"),
            "z_score_trunk_lean_max": get_dev("trunk_lean_max", "z_score"),
            "z_score_trunk_lateral_tilt_max": get_dev("trunk_lateral_tilt_max", "z_score"),
            "z_score_knee_valgus_left_max": get_dev("left_knee_valgus_max", "z_score"),
            "z_score_knee_valgus_right_max": get_dev("right_knee_valgus_max", "z_score"),
            "z_score_knee_flexion_asymmetry": get_dev("knee_flexion_asymmetry_mean", "z_score"),

            # Range Violations (Distance outside reference bounds)
            "range_viol_knee_flexion_rom_left": get_dev("left_knee_angle_range", "range_deviation"),
            "range_viol_trunk_lean_max": get_dev("trunk_lean_max", "range_deviation"),
            "range_viol_knee_valgus_left_max": get_dev("left_knee_valgus_max", "range_deviation"),

            # Target Ground Truth Label (DO NOT INVENT LABELS)
            "injury_label": sample.injury_label,
            "injury_type": sample.injury_type,
        }

        return row

    def generate_feature_table(
        self,
        manifest: DatasetManifest,
        output_format: str = "csv"
    ) -> pd.DataFrame:
        """
        Process all dataset samples and generate the tabular ML feature matrix.
        Exports features.csv / features.parquet.
        """
        rows: List[Dict[str, Any]] = []
        dataset_name = manifest.dataset_name
        dirs = self.storage.initialize_dataset_directories(dataset_name)

        logger.info(f"Starting feature matrix generation for dataset '{dataset_name}' ({len(manifest.samples)} samples)")

        for idx, sample in enumerate(manifest.samples):
            try:
                row = self.process_sample(sample=sample, dataset_name=dataset_name)
                rows.append(row)
            except Exception as e:
                logger.error(f"Failed processing sample {sample.sample_id} ({sample.video_path}): {e}")
                # Append empty row with error note to preserve sample alignment
                rows.append({
                    "sample_id": sample.sample_id,
                    "video_id": sample.video_id,
                    "athlete_id": sample.athlete_id or "ANONYMOUS",
                    "sport": sample.sport,
                    "movement_type": sample.movement_type,
                    "laterality": sample.laterality.value,
                    "source_dataset": sample.source_dataset,
                    "injury_label": sample.injury_label,
                    "injury_type": sample.injury_type,
                    "processing_error": str(e),
                })

        df = pd.DataFrame(rows)

        # Save tabular matrix
        csv_out = dirs["features"] / "features.csv"
        df.to_csv(csv_out, index=False)
        logger.info(f"Exported ML feature table to {csv_out} ({len(df)} rows, {len(df.columns)} columns)")

        try:
            parquet_out = dirs["features"] / "features.parquet"
            df.to_parquet(parquet_out, index=False)
            logger.info(f"Exported Parquet feature table to {parquet_out}")
        except Exception:
            # Parquet engine might not be installed in minimal environment, CSV is primary
            pass

        return df


def get_ml_feature_generator() -> MLFeatureGenerator:
    """Dependency helper to instantiate MLFeatureGenerator."""
    return MLFeatureGenerator()
