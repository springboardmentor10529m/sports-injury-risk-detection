import numpy as np
import pytest
from app.services.activity_check import check_activity


def movement(alternating=False):
    left = 135 + 40 * np.cos(np.linspace(0, 2 * np.pi, 41))
    right = 270 - left if alternating else left
    return [dict(detected=True, timestamp_ms=i * 100,
                 knee_angle_left=float(l), knee_angle_right=float(r))
            for i, (l, r) in enumerate(zip(left, right))]


@pytest.mark.parametrize("activity", ["running", "sprinting"])
def test_bilateral_cycle_warns(activity):
    assert check_activity(movement(), activity)["status"] == "possible_mismatch"


def test_alternating_motion_is_not_confirmed_or_rejected():
    assert check_activity(movement(True), "running")["status"] == "unknown"


@pytest.mark.parametrize("case", ["static", "missing", "nan", "short", "gap", "unsupported"])
def test_ambiguous_inputs_abstain(case):
    frames = movement()
    activity = "running"
    if case == "static":
        for f in frames:
            f.update(knee_angle_left=170, knee_angle_right=170)
    elif case in ("missing", "nan"):
        for f in frames[10:31]:
            f["knee_angle_left"] = None if case == "missing" else float("nan")
    elif case == "short":
        frames = frames[:15]
    elif case == "gap":
        for f in frames[20:]:
            f["timestamp_ms"] += 1000
    else:
        activity = "squatting"
    assert check_activity(frames, activity)["status"] == "unknown"
