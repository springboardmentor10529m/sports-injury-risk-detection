"""
Unit and Integration Tests for Sports Injury AI Engine
"""

import os
import sys
import unittest
import numpy as np

# Ensure ai-service root is in sys.path for test discovery
AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from services.biomechanics import BiomechanicsAnalyzer
from services.feature_extractor import FeatureExtractor
from services.ml_engine import MLEngine
from services.anomaly_detector import AnomalyDetector
from services.risk_scorer import RiskScorer
from services.recommendation_engine import RecommendationEngine

class TestBiomechanics(unittest.TestCase):
    def setUp(self):
        self.analyzer = BiomechanicsAnalyzer()

    def test_angle_3d_perpendicular(self):
        p1 = np.array([0.0, 1.0, 0.0])
        p2 = np.array([0.0, 0.0, 0.0])
        p3 = np.array([1.0, 0.0, 0.0])
        angle = self.analyzer._calculate_angle_3d(p1, p2, p3)
        self.assertAlmostEqual(angle, 90.0, places=2)

    def test_angle_3d_straight_line(self):
        p1 = np.array([0.0, 1.0, 0.0])
        p2 = np.array([0.0, 0.0, 0.0])
        p3 = np.array([0.0, -1.0, 0.0])
        angle = self.analyzer._calculate_angle_3d(p1, p2, p3)
        self.assertAlmostEqual(angle, 180.0, places=2)

    def test_valgus_calculation(self):
        hip = np.array([0.5, 0.3, 0.0])
        knee = np.array([0.52, 0.6, 0.0]) # displaced inward
        ankle = np.array([0.5, 0.9, 0.0])
        valgus = self.analyzer._calculate_valgus_angle(hip, knee, ankle, is_left=True)
        self.assertIsInstance(valgus, float)

class TestAnomalyDetector(unittest.TestCase):
    def setUp(self):
        self.detector = AnomalyDetector()

    def test_valgus_anomaly_triggered(self):
        kinematics = {
            "knee_valgus": {"max": 16.5, "mean": 10.0},
            "bilateral_asymmetry": {"mean": 6.0, "max": 9.0},
            "trunk_lean": {"mean": 3.0, "max": 4.5},
            "ankle_flexion": {"mean": 60.0, "min": 35.0},
            "knee_flexion": {"rom": 65.0}
        }
        anomalies = self.detector.detect_anomalies(kinematics)
        anomaly_ids = [a["id"] for a in anomalies]
        self.assertIn("ANOM_VALGUS_SEVERE", anomaly_ids)

    def test_asymmetry_anomaly_triggered(self):
        kinematics = {
            "knee_valgus": {"max": 4.0, "mean": 2.0},
            "bilateral_asymmetry": {"mean": 20.5, "max": 28.0},
            "trunk_lean": {"mean": 2.0, "max": 3.0},
            "ankle_flexion": {"mean": 65.0, "min": 35.0},
            "knee_flexion": {"rom": 70.0}
        }
        anomalies = self.detector.detect_anomalies(kinematics)
        anomaly_ids = [a["id"] for a in anomalies]
        self.assertIn("ANOM_ASYM_HIGH", anomaly_ids)

class TestRiskScorer(unittest.TestCase):
    def setUp(self):
        self.scorer = RiskScorer()

    def test_scoring_weights_sum_to_one(self):
        total_weights = (
            self.scorer.WEIGHT_BIOMECHANICS +
            self.scorer.WEIGHT_HISTORY +
            self.scorer.WEIGHT_ASYMMETRY +
            self.scorer.WEIGHT_LOAD +
            self.scorer.WEIGHT_FATIGUE
        )
        self.assertAlmostEqual(total_weights, 1.0, places=4)

    def test_risk_categories(self):
        # Low risk test
        low_kinematics = {
            "knee_valgus": {"max": 3.0, "mean": 1.5},
            "bilateral_asymmetry": {"mean": 2.0, "max": 3.5},
            "trunk_lean": {"max": 2.0, "mean": 1.0},
            "knee_flexion": {"rom": 60.0}
        }
        low_ml = {
            "severity_probabilities": {"Mild": 0.85, "Moderate": 0.10, "Severe": 0.05}
        }
        result = self.scorer.compute_risk_score(
            low_kinematics,
            low_ml,
            athlete_history={"previous_injuries": 0},
            workload_data={"training_intensity": 0.40, "recovery_time_days": 4.0, "sleep_hours_avg": 8.0}
        )
        self.assertLess(result["overall_risk_score"], 25.0)
        self.assertEqual(result["risk_category"], "LOW")

        # Critical risk test
        high_kinematics = {
            "knee_valgus": {"max": 22.0, "mean": 16.0},
            "bilateral_asymmetry": {"mean": 26.0, "max": 35.0},
            "trunk_lean": {"max": 15.0, "mean": 10.0},
            "knee_flexion": {"rom": 25.0}
        }
        high_ml = {
            "severity_probabilities": {"Mild": 0.05, "Moderate": 0.15, "Severe": 0.80}
        }
        crit_result = self.scorer.compute_risk_score(
            high_kinematics,
            high_ml,
            athlete_history={"previous_injuries": 3, "injury_recurrence": 1},
            workload_data={"training_intensity": 0.95, "recovery_time_days": 1.0, "sleep_hours_avg": 4.5}
        )
        self.assertGreater(crit_result["overall_risk_score"], 75.0)
        self.assertEqual(crit_result["risk_category"], "CRITICAL")

class TestMLEngine(unittest.TestCase):
    def test_ml_predictions_exist(self):
        engine = MLEngine()
        feature_vector = {
            "Age": 26.0,
            "Height_cm": 182.0,
            "Weight_kg": 80.0,
            "Knee_Angle_deg": 65.0,
            "Jump_Height_cm": 55.0,
            "Ankle_Flexion_deg": 60.0,
            "Speed_m_s": 25.0,
            "Reaction_Time_ms": 140.0,
            "Injury_Recurrence": 0
        }
        pred = engine.predict(feature_vector)
        self.assertIn("predicted_severity", pred)
        self.assertIn("severity_probabilities", pred)
        self.assertIn("primary_injury_risk_category", pred)
        self.assertIn("composite_ml_probability", pred)

if __name__ == "__main__":
    unittest.main()
