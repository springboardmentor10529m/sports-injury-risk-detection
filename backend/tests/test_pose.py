import pytest
import numpy as np
from ml.device import get_device
from ml.pose.skeleton import KEYPOINT_NAMES, SKELETON_CONNECTIONS
from ml.pose.pose_model import RTMPoseModel
from ml.pose.tracker import PrimaryAthleteTracker
from ml.pose.smoothing import KeypointSmoother

def test_device_selection():
    device = get_device()
    assert device in ["cuda", "mps", "cpu"]

def test_coco17_topology():
    assert len(KEYPOINT_NAMES) == 17
    assert "nose" in KEYPOINT_NAMES
    assert "left_knee" in KEYPOINT_NAMES
    assert "right_ankle" in KEYPOINT_NAMES
    assert len(SKELETON_CONNECTIONS) == 16

def test_pose_model_inference():
    model = RTMPoseModel()
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    results = model.estimate_pose(dummy_frame)
    assert isinstance(results, list)
    model.close()

def test_tracker_stickiness():
    tracker = PrimaryAthleteTracker(iou_threshold=0.2)
    cand1 = {"bbox": [100, 100, 200, 300], "keypoints": {}, "average_confidence": 0.9}
    cand2 = {"bbox": [400, 100, 500, 300], "keypoints": {}, "average_confidence": 0.8}

    tracked = tracker.track([cand1, cand2])
    assert tracked is not None
    assert tracked["person_id"] == 1
    assert tracked["bbox"] == [100, 100, 200, 300]

def test_keypoint_smoother():
    smoother = KeypointSmoother()
    kps = {
        "left_knee": {"x": 100.0, "y": 200.0, "confidence": 0.9}
    }
    smoothed1 = smoother.smooth_keypoints(kps, timestamp=0.0)
    smoothed2 = smoother.smooth_keypoints({"left_knee": {"x": 105.0, "y": 202.0, "confidence": 0.9}}, timestamp=0.066)

    assert "left_knee" in smoothed2
    assert "x" in smoothed2["left_knee"]
    assert "y" in smoothed2["left_knee"]
