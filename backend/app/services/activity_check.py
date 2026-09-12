"""Experimental motion advisory, not a trained or validated activity classifier."""
import numpy as np


def check_activity(metrics, selected):
    result = {"status": "unknown", "method": "experimental_pose_heuristic",
              "message": "Activity has not been verified automatically."}
    if selected not in ("running", "sprinting"):
        return result
    # Use a contiguous segment: missing poses must not fabricate a movement cycle.
    segment = []
    segments = []
    for frame in metrics:
        values = [frame.get("knee_angle_left"), frame.get("knee_angle_right"),
                  frame.get("timestamp_ms")]
        valid = (frame.get("detected") and all(v is not None for v in values)
                 and np.isfinite(values).all())
        if not valid or (segment and not 0 < values[2] - segment[-1][2] <= 250):
            segments.append(segment)
            segment = []
        if valid:
            segment.append(values)
    segments.append(segment)
    for segment in segments:
        if len(segment) < 20 or segment[-1][2] - segment[0][2] < 2000:
            continue
        angles = np.array(segment)[:, :2]
        if np.any(np.std(angles, axis=0) < 15):
            continue
        together = np.corrcoef(angles.T)[0, 1] > 0.85
        similar = np.median(np.abs(angles[:, 0] - angles[:, 1])) < 15
        bent = np.all(angles < 115, axis=1)
        straight = np.all(angles > 155, axis=1)
        # Require extension on both sides of a sustained bilateral bend.
        indices = np.flatnonzero(bent)
        cycle = any(straight[:i].any() and straight[i + 3:].any()
                    for i in indices if bent[i:i + 3].sum() == 3)
        if together and similar and cycle:
            return {**result, "status": "possible_mismatch",
                    "message": "Both knees bend and straighten together in a squat-like pattern. "
                    "Please check your Running/Sprinting selection. This experimental check can "
                    "also flag other movements; it does not identify the activity reliably. "
                    "If the selection is wrong, upload again with the correct activity before using this assessment."}
    return result
