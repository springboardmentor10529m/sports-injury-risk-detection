from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAnomalyDetector(ABC):
    """
    Abstract interface for movement anomaly detection models.
    """

    @abstractmethod
    def fit(self, feature_matrix: Any) -> "BaseAnomalyDetector":
        """Fit or calibrate anomaly detector on movement features."""
        pass

    @abstractmethod
    def detect_anomalies(
        self,
        feature_sequence: List[Dict[str, Any]],
        timestamps: List[float],
        frame_indices: List[int]
    ) -> List[Dict[str, Any]]:
        """Detect and return structured anomalies across frames."""
        pass
