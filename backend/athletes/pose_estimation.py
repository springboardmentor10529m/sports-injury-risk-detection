import json
import os

import cv2
import mediapipe as mp

from django.conf import settings


BaseOptions = mp.tasks.BaseOptions
VisionRunningMode = mp.tasks.vision.RunningMode

PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions


# MediaPipe's 33 pose landmark names
LANDMARK_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]


def create_pose_landmarker():
    """
    Create a MediaPipe Pose Landmarker.
    """

    model_path = os.path.join(
        settings.BASE_DIR,
        "athletes",
        "models",
        "pose_landmarker_lite.task"
    )

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Pose model not found: {model_path}"
        )

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(
            model_asset_path=model_path
        ),
        running_mode=VisionRunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    return PoseLandmarker.create_from_options(
        options
    )


def extract_landmarks(result):
    """
    Convert MediaPipe pose landmarks into
    a simple JSON-compatible structure.
    """

    if not result.pose_landmarks:
        return None

    landmarks = result.pose_landmarks[0]

    pose_data = {}

    for index, landmark in enumerate(landmarks):

        name = LANDMARK_NAMES[index]

        pose_data[name] = {
            "x": round(landmark.x, 6),
            "y": round(landmark.y, 6),
            "z": round(landmark.z, 6),
            "visibility": round(
                landmark.visibility,
                6
            ),
        }

    return pose_data


def process_pose_frames(
    frames_directory,
    video_id
):
    """
    Run pose estimation on all processed frames.
    """

    if not os.path.isdir(frames_directory):

        return {
            "success": False,
            "error": "Processed frames directory not found."
        }

    frame_files = sorted(
        [
            os.path.join(
                frames_directory,
                filename
            )
            for filename in os.listdir(
                frames_directory
            )
            if filename.lower().endswith(
                (".jpg", ".jpeg", ".png")
            )
        ]
    )

    if not frame_files:

        return {
            "success": False,
            "error": "No processed frames found."
        }

    output_directory = os.path.join(
        settings.MEDIA_ROOT,
        "pose_results",
        str(video_id)
    )

    os.makedirs(
        output_directory,
        exist_ok=True
    )

    pose_results = []

    landmarker = create_pose_landmarker()

    try:

        for frame_index, frame_path in enumerate(
            frame_files
        ):

            image = mp.Image.create_from_file(
                frame_path
            )

            result = landmarker.detect(
                image
            )

            landmarks = extract_landmarks(
                result
            )

            pose_results.append(
                {
                    "frame_index": frame_index,
                    "frame_file": os.path.basename(
                        frame_path
                    ),
                    "pose_detected": landmarks is not None,
                    "landmarks": landmarks,
                }
            )

    finally:

        landmarker.close()

    output_file = os.path.join(
        output_directory,
        "pose_landmarks.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            pose_results,
            file,
            indent=2
        )

    detected_frames = sum(
        1
        for result in pose_results
        if result["pose_detected"]
    )

    return {
        "success": True,
        "frames_processed": len(
            pose_results
        ),
        "frames_with_pose": detected_frames,
        "output_file": output_file,
    }