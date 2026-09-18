import unittest
from unittest.mock import MagicMock, patch
import os
import json
# pyrefly: ignore [missing-import]
import numpy as np

# Set dummy DATABASE_URL and JWT_SECRET before importing app configurations
os.environ["DATABASE_URL"] = "sqlite:///./test_sports_injury.db"
os.environ["JWT_SECRET"] = "testsecret8c12a76f2d93ee8a49c9ad64fa3bfe7e8e5"

from app.database import engine, Base, SessionLocal
from app import models
from app.services.pose_engine import process_video_pose_estimation, calculate_angle

class TestPoseEstimation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_sports_injury.db"):
            os.remove("./test_sports_injury.db")

    def setUp(self):
        # Create a mock user, athlete, and video
        self.user = models.User(
            name="Test Athlete",
            email="test.athlete@example.com",
            password="hashed_pw",
            role="athlete"
        )
        self.db.add(self.user)
        self.db.commit()

        self.athlete = models.Athlete(
            user_id=self.user.user_id,
            sport="Squats"
        )
        self.db.add(self.athlete)
        self.db.commit()

        self.video = models.Video(
            athlete_id=self.athlete.athlete_id,
            activity="Squat",
            video_url="/uploads/mock_video.mp4",
            processing_status="Uploaded"
        )
        self.db.add(self.video)
        self.db.commit()

    def tearDown(self):
        # Clean up database
        self.db.query(models.BiomechanicsAnalysis).delete()
        self.db.query(models.Video).delete()
        self.db.query(models.Athlete).delete()
        self.db.query(models.User).delete()
        self.db.commit()

    def test_calculate_angle(self):
        # Straight line should be 180 degrees
        a = [0, 0, 0]
        b = [0, 1, 0]
        c = [0, 2, 0]
        self.assertAlmostEqual(calculate_angle(a, b, c), 180.0, delta=0.5)

        # Right angle should be 90 degrees
        a = [1, 0, 0]
        b = [0, 0, 0]
        c = [0, 1, 0]
        self.assertAlmostEqual(calculate_angle(a, b, c), 90.0, delta=0.5)

    @patch("app.services.pose_engine.cv2.VideoCapture")
    @patch("app.services.pose_engine.cv2.VideoWriter")
    @patch("app.services.pose_engine.os.path.getsize", return_value=5000)
    @patch("app.services.pose_engine.os.path.exists")
    def test_process_video_pose_estimation(self, mock_exists, mock_getsize, mock_writer, mock_capture):
        # Configure fallback flags
        import app.services.pose_engine as pose_engine
        pose_engine.HAS_MEDIAPIPE_SOLUTIONS = True
        pose_engine.mp_pose = MagicMock()
        pose_engine.mp_drawing = MagicMock()
        pose_engine.mp_drawing_styles = MagicMock()

        # Mock file system existence (source exists, annotated output does not exist prior to creation, isolate to solutions mock)
        mock_exists.side_effect = lambda path: False if ("_annotated" in str(path) or "pose_landmarker.task" in str(path)) else True

        # Mock VideoCapture
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        # Read 3 frames, then stop
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_cap.read.side_effect = [
            (True, dummy_frame),
            (True, dummy_frame),
            (True, dummy_frame),
            (False, None)
        ]
        mock_cap.get.side_effect = lambda prop: {
            0: 0, # CAP_PROP_POS_MSEC
            3: 640.0, # CAP_PROP_FRAME_WIDTH
            4: 480.0, # CAP_PROP_FRAME_HEIGHT
            5: 30.0, # CAP_PROP_FPS
            7: 3.0 # CAP_PROP_FRAME_COUNT
        }.get(prop, 0.0)
        mock_capture.return_value = mock_cap

        # Mock VideoWriter
        mock_out = MagicMock()
        mock_out.isOpened.return_value = True
        mock_writer.return_value = mock_out

        # Mock MediaPipe Pose Landmarks
        mock_pose = MagicMock()
        pose_engine.mp_pose.Pose.return_value = mock_pose

        # Create mock landmarks returned for processing
        mock_landmarks = MagicMock()
        
        # We need 33 landmarks, let's create simple mocks for key landmarks:
        # 11: left shoulder, 12: right shoulder, 23: left hip, 24: right hip
        # 25: left knee, 26: right knee, 27: left ankle, 28: right ankle
        landmark_list = []
        for i in range(33):
            lm = MagicMock()
            if i == 11: # left shoulder
                lm.x, lm.y, lm.z = 0.4, 0.2, 0.0
            elif i == 12: # right shoulder
                lm.x, lm.y, lm.z = 0.6, 0.2, 0.0
            elif i == 23: # left hip
                lm.x, lm.y, lm.z = 0.4, 0.5, 0.0
            elif i == 24: # right hip
                lm.x, lm.y, lm.z = 0.6, 0.5, 0.0
            elif i == 25: # left knee
                lm.x, lm.y, lm.z = 0.4, 0.7, 0.0
            elif i == 26: # right knee
                lm.x, lm.y, lm.z = 0.6, 0.7, 0.0
            elif i == 27: # left ankle
                lm.x, lm.y, lm.z = 0.4, 0.9, 0.0
            elif i == 28: # right ankle
                lm.x, lm.y, lm.z = 0.6, 0.9, 0.0
            else:
                lm.x, lm.y, lm.z = 0.5, 0.5, 0.0
            landmark_list.append(lm)
            
        mock_landmarks.landmark = landmark_list

        mock_results = MagicMock()
        mock_results.pose_landmarks = mock_landmarks
        mock_pose.process.return_value = mock_results

        # Run pose processing
        process_video_pose_estimation(self.video.video_id, self.db)

        # Refresh video record from db
        self.db.refresh(self.video)
        
        # Assertions
        self.assertEqual(self.video.processing_status, "Completed")
        self.assertEqual(self.video.resolution, "640x480")
        self.assertEqual(self.video.fps, 30)
        self.assertEqual(self.video.duration, 0.1) # 3 frames / 30 fps
        
        # Verify BiomechanicsAnalysis entry was created
        analysis = self.db.query(models.BiomechanicsAnalysis).filter(
            models.BiomechanicsAnalysis.video_id == self.video.video_id
        ).first()
        
        self.assertIsNotNone(analysis)
        assert analysis is not None
        self.assertIn(analysis.knee_valgus_detected, ["No", "Borderline"])
        assert analysis.symmetry_score is not None
        self.assertGreater(analysis.symmetry_score, 90.0)
        assert analysis.movement_quality_score is not None
        self.assertGreater(analysis.movement_quality_score, 5.0)
        
        # Parse and verify joint angles and ROM
        assert analysis.joint_angles is not None
        joint_angles = json.loads(analysis.joint_angles)
        self.assertIn("left_knee_max_flexion", joint_angles)
        self.assertAlmostEqual(joint_angles["left_knee_max_flexion"], 180.0, places=0) # straight vertical path

if __name__ == "__main__":
    unittest.main()
