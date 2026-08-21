"""SafeMove Dataset Adapters Package."""

from app.ml.datasets.adapters.calgary_adapter import (
    CALGARY_FIELD_MAPPINGS,
    SAFEMOVE_COMPATIBILITY_SPEC,
    CalgaryDatasetAdapter,
)

__all__ = [
    "CalgaryDatasetAdapter",
    "CALGARY_FIELD_MAPPINGS",
    "SAFEMOVE_COMPATIBILITY_SPEC",
]
