from app.services.pose_estimation import _enforce_monotonic_timestamp

from types import SimpleNamespace

import numpy as np

from app.services import pipeline, pose_estimation
from app.video_processing.frame_extractor import ExtractedFrame


def test_enforce_monotonic_timestamp_keeps_values_strictly_increasing():
    assert _enforce_monotonic_timestamp(100, 100) == 101
    assert _enforce_monotonic_timestamp(100, 90) == 101
    assert _enforce_monotonic_timestamp(100, 150) == 150
    assert _enforce_monotonic_timestamp(150, 151) == 151


def test_consecutive_uploads_have_independent_tracking_and_timestamps(monkeypatch, tmp_path):
    model_path = tmp_path / "pose.task"
    model_path.write_bytes(b"test model placeholder")
    monkeypatch.setattr(pose_estimation.settings, "POSE_MODEL_PATH", str(model_path))
    trackers = []

    class Tracker:
        def __init__(self):
            self.timestamps = []
            self.closed = False

        def detect_for_video(self, image, timestamp):
            assert not self.timestamps or timestamp > self.timestamps[-1]
            self.timestamps.append(timestamp)
            return SimpleNamespace(pose_landmarks=[], pose_world_landmarks=[])

        def close(self):
            self.closed = True

    def create(options):
        tracker = Tracker()
        trackers.append(tracker)
        return tracker

    monkeypatch.setattr(pose_estimation.mp_vision.PoseLandmarker, "create_from_options", create)
    for timestamps in ([0, 500, 1000], [0, 100, 200]):
        estimator = pipeline.get_pose_estimator()
        try:
            frames = [ExtractedFrame(np.zeros((8, 8, 3), dtype=np.uint8), ts, i)
                      for i, ts in enumerate(timestamps)]
            result = estimator.process(frames)
            assert [frame.timestamp_ms for frame in result] == timestamps
        finally:
            estimator.close()

    assert len(trackers) == 2
    assert trackers[0] is not trackers[1]
    assert trackers[0].timestamps == [0, 500, 1000]
    assert trackers[1].timestamps == [0, 100, 200]
    assert all(tracker.closed for tracker in trackers)
