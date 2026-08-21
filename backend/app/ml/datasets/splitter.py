"""
Train/Validation/Test Splitter with Strict Athlete-Level Leakage Prevention.
Ensures that all video recordings from the same athlete/subject are placed
exclusively in ONE split partition.
"""

import json
import random
from pathlib import Path

from pydantic import BaseModel

from app.ml.datasets.schema import DatasetManifest, DatasetSample


class SplitResult(BaseModel):
    """Container for dataset split partitions and leakage validation audit."""

    train_count: int
    val_count: int
    test_count: int
    train_samples: list[DatasetSample]
    val_samples: list[DatasetSample]
    test_samples: list[DatasetSample]
    train_athletes: list[str]
    val_athletes: list[str]
    test_athletes: list[str]
    class_distribution_per_split: dict[str, dict[str, int]]
    leakage_verified: bool = True
    leakage_notes: str = "Zero athlete-level leakage across partitions verified."


class DatasetSplitter:
    """Partitions dataset samples into Train, Validation, and Test sets by athlete group."""

    def __init__(
        self,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42,
    ):
        total = train_ratio + val_ratio + test_ratio
        if abs(total - 1.0) > 1e-4:
            raise ValueError(f"Split ratios must sum to 1.0 (got {total})")
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.random_seed = random_seed

    def split(self, manifest: DatasetManifest) -> SplitResult:
        """
        Partition samples ensuring strict athlete-level group isolation.
        """
        rng = random.Random(self.random_seed)

        # 1. Group samples by athlete_id (or fallback to unique sample_id for unassigned)
        athlete_groups: dict[str, list[DatasetSample]] = {}
        for sample in manifest.samples:
            group_key = sample.athlete_id if sample.athlete_id else f"ANON_SAMPLE_{sample.sample_id}"
            if group_key not in athlete_groups:
                athlete_groups[group_key] = []
            athlete_groups[group_key].append(sample)

        # 2. Shuffle athlete groups
        all_group_keys = list(athlete_groups.keys())
        rng.shuffle(all_group_keys)

        total_samples = len(manifest.samples)
        target_train_count = int(total_samples * self.train_ratio)
        target_val_count = int(total_samples * self.val_ratio)

        train_samples: list[DatasetSample] = []
        val_samples: list[DatasetSample] = []
        test_samples: list[DatasetSample] = []

        train_athletes: set[str] = set()
        val_athletes: set[str] = set()
        test_athletes: set[str] = set()

        for group_key in all_group_keys:
            group_samples = athlete_groups[group_key]
            current_train_count = len(train_samples)
            current_val_count = len(val_samples)

            if current_train_count + len(group_samples) <= target_train_count or (
                current_train_count < target_train_count
            ):
                train_samples.extend(group_samples)
                train_athletes.add(group_key)
            elif current_val_count + len(group_samples) <= target_val_count or (current_val_count < target_val_count):
                val_samples.extend(group_samples)
                val_athletes.add(group_key)
            else:
                test_samples.extend(group_samples)
                test_athletes.add(group_key)

        # 3. Assert Zero Athlete Leakage
        train_val_overlap = train_athletes.intersection(val_athletes)
        train_test_overlap = train_athletes.intersection(test_athletes)
        val_test_overlap = val_athletes.intersection(test_athletes)

        leakage_detected = bool(train_val_overlap or train_test_overlap or val_test_overlap)
        if leakage_detected:
            raise RuntimeError(
                f"FATAL: Athlete data leakage detected between splits!\n"
                f"Train/Val overlap: {train_val_overlap}\n"
                f"Train/Test overlap: {train_test_overlap}\n"
                f"Val/Test overlap: {val_test_overlap}"
            )

        # 4. Compile Class Distributions per Split
        def count_classes(samples: list[DatasetSample]) -> dict[str, int]:
            dist: dict[str, int] = {}
            for s in samples:
                k = str(s.injury_label) if s.injury_label is not None else "UNLABELED"
                dist[k] = dist.get(k, 0) + 1
            return dist

        class_dist = {
            "train": count_classes(train_samples),
            "val": count_classes(val_samples),
            "test": count_classes(test_samples),
        }

        return SplitResult(
            train_count=len(train_samples),
            val_count=len(val_samples),
            test_count=len(test_samples),
            train_samples=train_samples,
            val_samples=val_samples,
            test_samples=test_samples,
            train_athletes=sorted(list(train_athletes)),
            val_athletes=sorted(list(val_athletes)),
            test_athletes=sorted(list(test_athletes)),
            class_distribution_per_split=class_dist,
            leakage_verified=True,
            leakage_notes="Zero athlete-level leakage: All athlete groups partitioned exclusively into a single split.",
        )

    def save_splits(self, split_result: SplitResult, output_dir: Path) -> dict[str, Path]:
        """Write partitioned split manifests to JSON files."""
        output_dir.mkdir(parents=True, exist_ok=True)

        files = {
            "train": output_dir / "train_manifest.json",
            "val": output_dir / "val_manifest.json",
            "test": output_dir / "test_manifest.json",
            "summary": output_dir / "split_summary.json",
        }

        with open(files["train"], "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in split_result.train_samples], f, indent=2)

        with open(files["val"], "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in split_result.val_samples], f, indent=2)

        with open(files["test"], "w", encoding="utf-8") as f:
            json.dump([s.model_dump() for s in split_result.test_samples], f, indent=2)

        with open(files["summary"], "w", encoding="utf-8") as f:
            json.dump(
                {
                    "train_count": split_result.train_count,
                    "val_count": split_result.val_count,
                    "test_count": split_result.test_count,
                    "train_athletes": split_result.train_athletes,
                    "val_athletes": split_result.val_athletes,
                    "test_athletes": split_result.test_athletes,
                    "class_distribution_per_split": split_result.class_distribution_per_split,
                    "leakage_verified": split_result.leakage_verified,
                },
                f,
                indent=2,
            )

        return files
