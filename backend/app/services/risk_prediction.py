"""Risk prediction service stub."""

from abc import ABC, abstractmethod


class RiskPredictionBase(ABC):
    @abstractmethod
    def predict_risk(self, athlete_id: str, assessment_data: dict) -> dict:
        """
        Predict injury risks for: ACL, hamstring, ankle_sprain, shoulder, lower_back, overuse.
        Returns a dict mapping injury category to a risk score (0-100).
        Note: Risk scores are decision-support signals, not clinical diagnoses.
        """
        pass


class RiskPredictionService(RiskPredictionBase):
    def predict_risk(self, athlete_id: str, assessment_data: dict) -> dict:
        raise NotImplementedError("Phase 5 implementation")
