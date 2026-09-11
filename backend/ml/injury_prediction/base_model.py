"""
AthleteGuard - Base Injury Risk Prediction Model Interface
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseInjuryRiskModel(ABC):
    """
    Standard interface for all injury risk prediction models in AthleteGuard.
    """

    MODEL_VERSION = "1.0.0-research"
    TARGET_CATEGORIES = ["acl", "hamstring", "ankle", "shoulder", "lower_back", "overuse"]

    @abstractmethod
    def predict_proba(self, aggregated_features: Dict[str, Any], athlete_profile: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
        """
        Returns estimated risk probabilities in [0.0, 1.0] for target anatomical risk categories.
        """
        pass

    @abstractmethod
    def predict(self, aggregated_features: Dict[str, Any], threshold: float = 0.5) -> Dict[str, int]:
        """
        Binary classification based on probability threshold.
        """
        pass

    @abstractmethod
    def explain(self, aggregated_features: Dict[str, Any], athlete_profile: Optional[Dict[str, Any]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns feature contributions / attribution ranking for each risk category.
        """
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """
        Returns model metadata, versioning, and validation disclaimers.
        """
        pass
