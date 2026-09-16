import os
import cv2
import numpy as np
import urllib.request
from typing import Dict, Any, List

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
MODEL_FILENAME = "pose_landmarker.task"

def ensure_pose_landmarker_model() -> str:
    model_path = os.path.join(os.path.dirname(__file__), MODEL_FILENAME)
    if not os.path.exists(model_path):
        print(f"Downloading MediaPipe PoseLandmarker model to {model_path}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, model_path)
            print("Model downloaded successfully!")
        except Exception as err:
            print(f"Error downloading pose landmarker model: {err}")
    return model_path


def extract_pose_landmarks_from_video(video_path: str, max_frames: int = 240) -> Dict[str, Any]:
    """
    Reads a real-life video file frame-by-frame, performs pose estimation using MediaPipe PoseLandmarker,
    and extracts 3D body keypoint trajectories across sampled frames.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
    duration = total_frames / fps if fps > 0 else 0.0

    if total_frames <= 0:
        frame_indices = [0]
    elif total_frames <= max_frames:
        frame_indices = list(range(total_frames))
    else:
        frame_indices = [int(i) for i in np.linspace(0, total_frames - 1, max_frames)]

    sampled_frames_data = []

    # Initialize MediaPipe PoseLandmarker Task Engine
    landmarker = None
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        model_path = ensure_pose_landmarker_model()
        if os.path.exists(model_path):
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.IMAGE
            )
            landmarker = vision.PoseLandmarker.create_from_options(options)
    except Exception as err:
        print(f"MediaPipe PoseLandmarker initialization warning: {err}")
        landmarker = None

    current_frame_idx = 0
    target_set = set(frame_indices)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if current_frame_idx in target_set:
            landmarks_dict = None

            if landmarker:
                try:
                    import mediapipe as mp
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                    res = landmarker.detect(mp_image)
                    if res and res.pose_landmarks and len(res.pose_landmarks) > 0:
                        lms = res.pose_landmarks[0]
                        landmarks_dict = {}
                        for idx, lm in enumerate(lms):
                            landmarks_dict[idx] = {
                                "x": float(lm.x),
                                "y": float(lm.y),
                                "z": float(lm.z) if hasattr(lm, 'z') else 0.0,
                                "visibility": float(lm.visibility) if hasattr(lm, 'visibility') else 0.9
                            }
                except Exception as err:
                    print(f"Frame {current_frame_idx} pose detection error: {err}")
                    landmarks_dict = None

            sampled_frames_data.append({
                "frame_index": current_frame_idx,
                "timestamp": float(np.round(current_frame_idx / fps, 2)),
                "landmarks": landmarks_dict
            })

        current_frame_idx += 1

    cap.release()

    if landmarker:
        try:
            landmarker.close()
        except Exception:
            pass

    return {
        "video_info": {
            "total_frames": total_frames,
            "fps": round(float(fps), 2),
            "resolution": f"{width}x{height}",
            "duration_sec": round(float(duration), 2),
            "sampled_count": len(sampled_frames_data)
        },
        "frames_data": sampled_frames_data
    }


