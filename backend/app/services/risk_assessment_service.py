"""
Risk Assessment Orchestrator Service.
Coordinates feature extraction, anomaly detection, risk prediction, human-readable explanations,
and corrective recommendation generation into a single Movement Risk Intelligence pipeline.
"""
from typing import Dict, Any, List
from app.services.risk_feature_service import risk_feature_extractor
from app.services.movement_anomaly_service import movement_anomaly_service
from app.services.risk_prediction_service import risk_prediction_service
from app.services.explanation_service import risk_explanation_service
from app.services.recommendation_service import recommendation_service

class RiskAssessmentService:
    def evaluate_movement_risk(
        self,
        kinematics: Dict[str, Any],
        athlete_profile: Dict[str, Any] = None,
        injury_history: List[Dict[str, Any]] = None,
        fps: float = 30.0
    ) -> Dict[str, Any]:
        """
        Executes the complete Movement Risk Intelligence System workflow.
        """
        athlete_profile = athlete_profile or {}
        injury_history = injury_history or []

        # 1. Detect Frame & Kinematic Anomalies
        anomalies = movement_anomaly_service.detect_anomalies(kinematics, fps=fps)

        # 2. Extract Feature Vector
        feature_vector = risk_feature_extractor.extract_features(
            kinematics=kinematics,
            athlete_profile=athlete_profile,
            anomalies=anomalies,
            injury_history=injury_history
        )

        # 3. Predict Injury Risks (Modular RiskPredictor interface)
        risk_results = risk_prediction_service.predictor.predict_risk(feature_vector)

        # 4. Generate Explanations & Contributing Factors
        explanations_data = risk_explanation_service.generate_explanations(
            risk_results=risk_results,
            feature_vector=feature_vector,
            anomalies=anomalies
        )

        # 5. Generate Dynamic Corrective Recommendations
        recommendation_data = recommendation_service.generate_corrective_program(
            risk_profile=risk_results,
            feature_vector=feature_vector,
            anomalies=anomalies
        )

        return {
            "risk_results": risk_results,
            "feature_vector": feature_vector,
            "anomalies": anomalies,
            "explanations": explanations_data,
            "recommendations": recommendation_data,
        }

risk_assessment_service = RiskAssessmentService()
