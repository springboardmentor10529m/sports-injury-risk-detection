"""Recommendation service stub."""

from abc import ABC, abstractmethod


class RecommendationServiceBase(ABC):
    @abstractmethod
    def generate_recommendations(self, risk_report: dict) -> list[dict]:
        """Generate targeted recommendations based on a risk report."""
        pass

    @abstractmethod
    def get_exercises_for_risk(self, risk_type: str, body_region: str) -> list[dict]:
        """Fetch preventative exercises mapped to a specific risk type and region."""
        pass


class RecommendationService(RecommendationServiceBase):
    def generate_recommendations(self, risk_report: dict) -> list[dict]:
        raise NotImplementedError("Phase 6 implementation")

    def get_exercises_for_risk(self, risk_type: str, body_region: str) -> list[dict]:
        raise NotImplementedError("Phase 6 implementation")
