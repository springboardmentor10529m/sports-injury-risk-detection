import unittest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# pyrefly: ignore [missing-import]
from app.config.risk_config import KINEMATIC_THRESHOLDS, RISK_CATEGORIES, RESEARCH_DISCLAIMER
# pyrefly: ignore [missing-import]
from app.services.risk_feature_service import RiskFeatureExtractor
# pyrefly: ignore [missing-import]
from app.services.risk_prediction_service import RuleBasedRiskPredictor
# pyrefly: ignore [missing-import]
from app.services.explanation_service import RiskExplanationService
# pyrefly: ignore [missing-import]
from app.services.recommendation_service import RecommendationService
# pyrefly: ignore [missing-import]
from app.services.risk_assessment_service import RiskAssessmentService


class TestRiskIntelligenceSystem(unittest.TestCase):

    def setUp(self):
        self.sample_biomechanics = {
            "knee_valgus": 0.78,
            "hip_stability": 18.5,
            "trunk_lean": 22.2,
            "stride_length": 1.1,
            "joint_alignment": 22.0,
            "symmetry_score": 72.0,
            "fatigue_score": 7.5,
            "movement_quality": 64.0,
            "posture_assessment": "Excessive knee valgus angle detected with significant lateral trunk lean."
        }

        self.sample_athlete = {
            "id": "ath_123",
            "age": 22,
            "sport": "Soccer",
            "position": "Midfielder",
            "training_load": 15.5,
            "injury_history": ["ACL tear 2024", "Ankle sprain 2025"]
        }

        self.sample_anomalies = [
            {
                "frame_number": 45,
                "timestamp_seconds": 1.5,
                "anomaly_type": "Knee Valgus Peak",
                "severity": "High",
                "affected_joints": ["Left Knee", "Left Ankle"],
                "description": "High acute knee valgus collapse detected.",
                "confidence_score": 0.92
            },
            {
                "frame_number": 110,
                "timestamp_seconds": 3.6,
                "anomaly_type": "Asymmetric Trunk Lean",
                "severity": "Moderate",
                "affected_joints": ["Spine", "Hip"],
                "description": "Moderate compensatory trunk lean.",
                "confidence_score": 0.85
            }
        ]

    def test_feature_extractor(self):
        extractor = RiskFeatureExtractor()
        features = extractor.extract_features(
            self.sample_biomechanics,
            self.sample_athlete,
            self.sample_anomalies
        )

        self.assertEqual(features["knee_valgus"], 0.78)
        self.assertEqual(features["hip_stability_deg"], 18.5)
        self.assertEqual(features["injury_history"]["total_injuries"], 0)

    def test_risk_predictor(self):
        extractor = RiskFeatureExtractor()
        features = extractor.extract_features(
            self.sample_biomechanics,
            self.sample_athlete,
            self.sample_anomalies
        )

        predictor = RuleBasedRiskPredictor()
        prediction = predictor.predict_risk(features)

        self.assertGreaterEqual(prediction["overall_risk_score"], 0)
        self.assertLessEqual(prediction["overall_risk_score"], 100)
        self.assertIn(prediction["risk_category"], [c for c in RISK_CATEGORIES])
        self.assertGreater(prediction["acl_risk"], 0)

    def test_explanation_service(self):
        extractor = RiskFeatureExtractor()
        features = extractor.extract_features(
            self.sample_biomechanics,
            self.sample_athlete,
            self.sample_anomalies
        )

        predictor = RuleBasedRiskPredictor()
        prediction = predictor.predict_risk(features)

        explainer = RiskExplanationService()
        result = explainer.generate_explanations(prediction, features, self.sample_anomalies)

        self.assertIn("explanations", result)
        self.assertIsInstance(result["explanations"], list)
        self.assertGreater(len(result["explanations"]), 0)

    def test_recommendation_service(self):
        extractor = RiskFeatureExtractor()
        features = extractor.extract_features(
            self.sample_biomechanics,
            self.sample_athlete,
            self.sample_anomalies
        )

        predictor = RuleBasedRiskPredictor()
        prediction = predictor.predict_risk(features)

        recommender = RecommendationService()
        recs = recommender.generate_corrective_program(prediction, features, self.sample_anomalies)

        self.assertIn("exercise_recommendations", recs)
        self.assertIn("mobility_suggestions", recs)
        self.assertIn("strengthening_suggestions", recs)
        self.assertIn("training_modification", recs)
        self.assertIn("recovery_plan", recs)

    def test_risk_assessment_orchestrator(self):
        service = RiskAssessmentService()
        assessment = service.evaluate_movement_risk(
            self.sample_biomechanics,
            self.sample_athlete,
            self.sample_anomalies
        )

        self.assertIn("risk_results", assessment)
        self.assertIn("overall_risk_score", assessment["risk_results"])
        self.assertIn("risk_category", assessment["risk_results"])
        self.assertIn("explanations", assessment)
        self.assertIn("recommendations", assessment)
        self.assertEqual(assessment["risk_results"]["disclaimer"], RESEARCH_DISCLAIMER)


if __name__ == "__main__":
    unittest.main()

