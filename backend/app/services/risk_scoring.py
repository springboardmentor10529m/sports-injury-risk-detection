"""Risk scoring service stub."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models.analysis import RiskCategory


@dataclass
class CompositeRiskScore:
    score: float
    category: RiskCategory


class RiskScoringBase(ABC):
    """
    Risk scoring service.
    Note: Risk scores are decision-support signals, not clinical diagnoses.
    """

    @abstractmethod
    def calculate_composite_score(self, components: dict) -> CompositeRiskScore:
        """
        Calculate composite risk score.
        Fixed Weights:
        - Biomechanical Deviations: 35%
        - Historical Injury Factors: 20%
        - Movement Asymmetry: 20%
        - Training Load Indicators: 15%
        - Fatigue Indicators: 10%

        Risk Categories (PROPOSAL_PENDING_STAKEHOLDER):
        - 0-25: Low
        - 25-50: Moderate
        - 50-75: High
        - 75-100: Critical
        """
        pass


class RiskScoringService(RiskScoringBase):
    def calculate_composite_score(self, components: dict) -> CompositeRiskScore:
        raise NotImplementedError("Phase 5 implementation")
