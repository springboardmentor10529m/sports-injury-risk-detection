import os

import cv2

from django.conf import settings


def validate_video(video_path):
    """
    Validate the uploaded video's basic technical properties.
    """

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {
            "valid": False,
            "error": "Unable to open the video."
        }

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(
        cap.get(cv2.CAP_PROP_FRAME_COUNT)
    )
    width = int(
        cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    )
    height = int(
        cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    )

    cap.release()

    if fps <= 0:
        return {
            "valid": False,
            "error": "Invalid video frame rate."
        }

    duration = frame_count / fps

    if width < 320 or height < 240:
        return {
            "valid": False,
            "error": (
                "Video resolution is too low. "
                "Minimum required is 320x240."
            )
        }

    if duration < 1:
        return {
            "valid": False,
            "error": (
                "Video is too short. "
                "Minimum duration is 1 second."
            )
        }

    return {
        "valid": True,
        "fps": round(fps, 2),
        "frame_count": frame_count,
        "width": width,
        "height": height,
        "duration": round(duration, 2),
    }


def extract_frames(video_path, video_id):
    """
    Extract approximately 5 frames per second.

    The extracted frames are stored under:
    MEDIA_ROOT/processed_frames/<video_id>/
    """

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(
            "Unable to open video for frame extraction."
        )

    output_directory = os.path.join(
        settings.MEDIA_ROOT,
        "processed_frames",
        str(video_id)
    )

    os.makedirs(
        output_directory,
        exist_ok=True
    )

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30

    frame_interval = max(
        int(fps / 5),
        1
    )

    frame_number = 0
    saved_frames = []

    while True:

        success, frame = cap.read()

        if not success:
            break

        if frame_number % frame_interval == 0:

            frame_height, frame_width = frame.shape[:2]

            max_width = 1280

            if frame_width > max_width:

                scale = max_width / frame_width

                new_width = int(
                    frame_width * scale
                )

                new_height = int(
                    frame_height * scale
                )

                frame = cv2.resize(
                    frame,
                    (new_width, new_height),
                    interpolation=cv2.INTER_AREA
                )

            # Basic image enhancement.
            frame = cv2.convertScaleAbs(
                frame,
                alpha=1.1,
                beta=5
            )

            frame_filename = os.path.join(
                output_directory,
                f"frame_{len(saved_frames):05d}.jpg"
            )

            saved = cv2.imwrite(
                frame_filename,
                frame
            )

            if saved:
                saved_frames.append(
                    frame_filename
                )

        frame_number += 1

    cap.release()

    return {
        "frame_count": len(saved_frames),
        "frames_directory": output_directory,
        "frames": saved_frames,
    }


def process_video(video_path, video_id, athlete_profile=None):
    """
    Run the complete video-processing and risk-assessment pipeline.
    """

    validation = validate_video(
        video_path
    )

    if not validation["valid"]:
        return {
            "success": False,
            "error": validation["error"],
        }

    extraction = extract_frames(
        video_path,
        video_id
    )

    # Run pose estimation on the extracted frames.
    from .pose_estimation import process_pose_frames

    pose_result = process_pose_frames(
        extraction["frames_directory"],
        video_id
    )

    if not pose_result["success"]:
        return {
            "success": False,
            "error": pose_result["error"],
            "video_info": validation,
            "processing": {
                "frames_extracted": extraction["frame_count"],
                "frames_directory": extraction[
                    "frames_directory"
                ],
            },
            "pose_estimation": pose_result,
        }

    # Run biomechanical analysis on the pose results.
    from .biomechanical_analysis import (
        analyze_pose_file,
        summarize_analysis
    )

    analysis_results = analyze_pose_file(
        pose_result["output_file"]
    )

    biomechanical_summary = summarize_analysis(
        analysis_results
    )

    # Run rule-based injury-risk assessment.
    from .rule_based_risk import assess_injury_risk

    risk_assessment = assess_injury_risk(
        biomechanical_summary, athlete_profile=athlete_profile

    )

    return {
        "success": True,
        "video_info": validation,
        "processing": {
            "frames_extracted": extraction["frame_count"],
            "frames_directory": extraction[
                "frames_directory"
            ],
        },
        "pose_estimation": pose_result,
        "biomechanical_analysis": biomechanical_summary,
        "risk_assessment": risk_assessment,
    }