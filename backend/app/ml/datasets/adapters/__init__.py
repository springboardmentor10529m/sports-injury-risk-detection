"""SafeMove Dataset Adapters Package."""
from app.ml.datasets.adapters.calgary_adapter import (
    CalgaryDatasetAdapter,
    CALGARY_FIELD_MAPPINGS,
    SAFEMOVE_COMPATIBILITY_SPEC,
)

__all__ = [
    "CalgaryDatasetAdapter",
    "CALGARY_FIELD_MAPPINGS",
    "SAFEMOVE_COMPATIBILITY_SPEC",
]
