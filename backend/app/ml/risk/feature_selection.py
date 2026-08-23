"""
SafeMove Phase 5B — Biomechanical Feature Selection Module.

Defines candidate feature sets for controlled experiments (A, B, C),
and enforces strict exclusion of identifiers, metadata, and target-leaking attributes.
"""

from typing import Any

# Strictly excluded columns to prevent data leakage and identity confounding
EXCLUDED_COLUMNS: list[str] = [
    "sample_id",
    "video_id",
    "athlete_id",
    "source_dataset",
    "modality",
    "sport",
    "movement_type",
    "laterality",
    "injury_type",  # Excluded because it directly reveals the specific pathology/injury status
    "injury_label",  # Target variable
]

# Experiment A: Core Biomechanical Kinematic and Kinetic Features
EXPERIMENT_A_FEATURES: list[str] = [
    "knee_flexion_rom_left",
    "peak_knee_flexion_left",
    "hip_flexion_rom_left",
    "ankle_dorsiflexion_rom_left",
    "trunk_lean_max",
    "hip_adduction_max",
    "hip_internal_rotation_max",
    "peak_vertical_grf",
    "vertical_loading_rate",
]

# Experiment B: Core Biomechanics + Asymmetry / Frontal-plane Proxy Features
EXPERIMENT_B_FEATURES: list[str] = EXPERIMENT_A_FEATURES + [
    "knee_valgus_proxy_left_max",
]

# Experiment C: Core Biomechanics + Asymmetry + Developmental Deviation Proxies
EXPERIMENT_C_FEATURES: list[str] = EXPERIMENT_B_FEATURES + [
    "knee_flexion_deviation_proxy",
    "hip_flexion_deviation_proxy",
]


class FeatureSelector:
    """Selects and filters features for specific baseline experiments."""

    @staticmethod
    def get_feature_names(experiment_name: str) -> list[str]:
        """
        Return the list of candidate feature column names for an experiment.

        Args:
            experiment_name: One of 'A' (Core), 'B' (Core + Asymmetry), or 'C' (Core + Asym + Deviations)
        """
        exp = experiment_name.upper().strip()
        if exp == "A":
            return list(EXPERIMENT_A_FEATURES)
        elif exp == "B":
            return list(EXPERIMENT_B_FEATURES)
        elif exp == "C":
            return list(EXPERIMENT_C_FEATURES)
        else:
            raise ValueError(
                f"Unknown experiment name '{experiment_name}'. Choose from 'A', 'B', 'C'."
            )

    @staticmethod
    def filter_dataframe(df: Any, feature_names: list[str]) -> tuple[Any, Any, Any]:
        """
        Filter a pandas DataFrame into feature matrix x_mat, target vector y, and group series groups.

        Args:
            df: Input pandas DataFrame containing raw feature table
            feature_names: List of feature column names to select

        Returns:
            Tuple of (x_mat, y, groups)
        """
        import pandas as pd

        # Assert no excluded columns are accidentally requested in feature_names
        leaking = [f for f in feature_names if f in EXCLUDED_COLUMNS]
        if leaking:
            raise ValueError(
                f"Target leakage / identifier error: Requested features contain excluded columns: {leaking}"
            )

        # Check required columns
        if "injury_label" not in df.columns:
            raise KeyError("Target column 'injury_label' not found in DataFrame.")
        if "athlete_id" not in df.columns:
            raise KeyError("Grouping column 'athlete_id' not found in DataFrame.")

        # Ensure all requested features exist or can be synthesized safely (for Experiment C deviation proxies)
        df_copy = df.copy()
        if (
            "knee_flexion_deviation_proxy" in feature_names
            and "knee_flexion_deviation_proxy" not in df_copy.columns
        ):
            # Synthetic deviation from developmental normative mean (45.0 deg in stance)
            df_copy["knee_flexion_deviation_proxy"] = (
                df_copy["knee_flexion_rom_left"] - 45.0
            ).abs()

        if (
            "hip_flexion_deviation_proxy" in feature_names
            and "hip_flexion_deviation_proxy" not in df_copy.columns
        ):
            # Synthetic deviation from developmental normative mean (40.0 deg in stance)
            df_copy["hip_flexion_deviation_proxy"] = (
                df_copy["hip_flexion_rom_left"] - 40.0
            ).abs()

        available_features = [f for f in feature_names if f in df_copy.columns]
        missing_features = [f for f in feature_names if f not in df_copy.columns]
        if missing_features:
            raise KeyError(
                f"Requested features not found in dataset: {missing_features}"
            )

        x_mat = df_copy[available_features].copy()
        y = pd.to_numeric(df_copy["injury_label"], errors="coerce").astype(int)
        groups = df_copy["athlete_id"].astype(str)

        return x_mat, y, groups
