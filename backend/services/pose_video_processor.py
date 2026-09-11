import os
import sys
import time
import cv2
import logging
import subprocess
import numpy as np
from typing import Dict, Any, Optional

from ml.pose.pose_pipeline import PosePipeline
from ml.pose.visualizer import SkeletonVisualizer
from ml.biomechanics.feature_extractor import BiomechanicsFeatureExtractor

logger = logging.getLogger(__name__)

PROCESSED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "processed"))
os.makedirs(PROCESSED_DIR, exist_ok=True)

def convert_to_browser_mp4(temp_mp4_path: str, final_mp4_path: str) -> bool:
    """
    Converts an OpenCV MP4 video to standard H.264 (yuv420p) with -movflags +faststart using ffmpeg,
    ensuring 100% HTML5 browser video player compatibility and instant playback/seeking across Chrome, Edge, Safari.
    """
    try:
        cmd = [
            "ffmpeg", "-y", "-i", temp_mp4_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "fast", "-crf", "22",
            "-movflags", "+faststart",
            final_mp4_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if result.returncode == 0 and os.path.exists(final_mp4_path) and os.path.getsize(final_mp4_path) > 0:
            logger.info(f"[VIDEO_PROC] Successfully transcoded H.264 browser MP4 (+faststart): {final_mp4_path}")
            return True
        else:
            err_msg = result.stderr.decode('utf-8', errors='ignore') if result.stderr else "Unknown error"
            logger.error(f"[VIDEO_PROC] FFmpeg transcode failed (rc={result.returncode}): {err_msg[:400]}")
    except Exception as e:
        logger.error(f"[VIDEO_PROC] FFmpeg transcode exception: {e}", exc_info=True)
    
    return False


def process_video_with_pose(
    input_path: str,
    output_path: str,
    confidence_threshold: float = 0.35,
    target_sample_fps: int = 15,
    cached_poses: Optional[Dict[int, Any]] = None,
    progress_callback: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Reads EVERY frame of input video, draws 17 COCO keypoints and skeleton
    directly onto original video frames at FULL input resolution and FPS, writes annotated MP4 video,
    and validates output file. Reuses cached_poses from Stage 1 if available to avoid redundant model inference.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input video file not found at {input_path}")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open input video file at {input_path}")

    orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_input_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    duration = total_input_frames / orig_fps if orig_fps > 0 else 0.0

    if orig_width <= 0 or orig_height <= 0 or total_input_frames <= 0:
        cap.release()
        raise ValueError("Corrupted or invalid input video dimensions / frame count.")

    logger.info(f"[VIDEO_PROC] Processing input video: {orig_width}x{orig_height} @ {orig_fps:.1f} FPS, {total_input_frames} frames, {duration:.2f}s")

    # Output directory
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    temp_output_path = output_path.replace(".mp4", "_temp.mp4")

    # Try codecs: mp4v -> avc1
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(temp_output_path, fourcc, orig_fps, (orig_width, orig_height))

    if not writer.isOpened():
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        writer = cv2.VideoWriter(temp_output_path, fourcc, orig_fps, (orig_width, orig_height))

    if not writer.isOpened():
        cap.release()
        raise RuntimeError("Unable to initialize annotated VideoWriter with avc1 or mp4v codec.")

    pipeline = None
    if not cached_poses:
        pipeline = PosePipeline(confidence_threshold=confidence_threshold)
    visualizer = SkeletonVisualizer(confidence_threshold=confidence_threshold)

    sample_step = max(1, int(round(orig_fps / float(target_sample_fps))))

    latest_pose_result = None
    processed_count = 0
    valid_pose_count = 0
    tracked_count = 0
    valid_confidences = []

    frame_idx = 0
    t0 = time.time()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            timestamp = frame_idx / orig_fps

            if cached_poses is not None:
                if frame_idx in cached_poses:
                    latest_pose_result = cached_poses[frame_idx]
                elif latest_pose_result is None and cached_poses:
                    # Initialize with first available pose
                    first_key = sorted(cached_poses.keys())[0]
                    latest_pose_result = cached_poses[first_key]
            else:
                # Sample RTMPose inference every sample_step frames; reuse latest pose for smooth Option A playback
                if frame_idx % sample_step == 0 or latest_pose_result is None:
                    latest_pose_result = pipeline.process_frame(frame, frame_idx, timestamp)

            if latest_pose_result and latest_pose_result.get("keypoints"):
                is_valid = latest_pose_result.get("valid_pose", False)
                if is_valid:
                    valid_pose_count += 1
                    mean_conf = latest_pose_result.get("mean_valid_confidence", 0.0)
                    valid_confidences.append(mean_conf)
                if latest_pose_result.get("person_id") == 1:
                    tracked_count += 1

            # Render skeleton onto ORIGINAL frame at FULL RESOLUTION
            annotated_frame = visualizer.draw_skeleton(frame, latest_pose_result, frame_idx, timestamp, debug_mode=False)

            # Save debug verification frames
            if frame_idx == 0:
                frame_first = annotated_frame.copy()
            if frame_idx == total_input_frames // 2:
                frame_middle = annotated_frame.copy()
            frame_last = annotated_frame.copy()

            # WRITE EVERY FRAME (Option A - Requirement 5 & 17)
            writer.write(annotated_frame)

            processed_count += 1

            if progress_callback and (processed_count % 10 == 0 or processed_count == total_input_frames):
                try:
                    progress_callback(processed_count, total_input_frames)
                except Exception as cb_err:
                    logger.debug(f"[VIDEO_PROC] progress_callback error: {cb_err}")

            frame_idx += 1

    finally:
        cap.release()
        writer.release()
        if pipeline:
            pipeline.close()

    elapsed = max(0.01, time.time() - t0)
    proc_fps = round(processed_count / elapsed, 1)

    # Save 3 debug screenshots (Requirement 29)
    debug_dir = PROCESSED_DIR
    artifact_dir = r"C:\Users\saketh\.gemini\antigravity-ide\brain\fd69b7fa-b0b7-4210-894c-ee286256bc48"
    debug_paths = {}

    debug_frames_to_save = [
        ("processed_frame_0000.jpg", frame_first if 'frame_first' in locals() else None),
        ("processed_frame_middle.jpg", frame_middle if 'frame_middle' in locals() else None),
        ("processed_frame_last.jpg", frame_last if 'frame_last' in locals() else None),
    ]

    for fname, img in debug_frames_to_save:
        if img is not None:
            p1 = os.path.join(debug_dir, fname)
            cv2.imwrite(p1, img)
            debug_paths[fname] = p1
            if os.path.exists(artifact_dir):
                p2 = os.path.join(artifact_dir, fname)
                cv2.imwrite(p2, img)

    # Attempt H.264 browser transcode if ffmpeg is available
    if convert_to_browser_mp4(temp_output_path, output_path):
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
    else:
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(temp_output_path, output_path)

    # VIDEO VALIDATION (Requirement 16)
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Generated annotated MP4 video file is missing or 0 bytes.")

    check_cap = cv2.VideoCapture(output_path)
    if not check_cap.isOpened():
        raise RuntimeError("OpenCV VideoCapture failed to reopen generated annotated MP4 video.")

    out_frames = int(check_cap.get(cv2.CAP_PROP_FRAME_COUNT))
    out_w = int(check_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    out_h = int(check_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out_fps = check_cap.get(cv2.CAP_PROP_FPS)
    check_cap.release()

    if out_frames <= 0 or out_w <= 0 or out_h <= 0:
        raise RuntimeError(f"Generated annotated MP4 contains invalid metadata: {out_w}x{out_h}, frames={out_frames}")

    mean_conf = float(np.mean(valid_confidences)) if valid_confidences else 0.0

    logger.info(
        f"[VIDEO_PROC] Successfully generated annotated MP4 video: {out_w}x{out_h} @ {out_fps:.1f} FPS, "
        f"frames={out_frames}/{processed_count}, valid_poses={valid_pose_count}, file_size={os.path.getsize(output_path)} bytes"
    )

    return {
        "output_path": output_path,
        "output_resolution": f"{out_w}x{out_h}",
        "output_fps": round(out_fps, 1),
        "output_frame_count": out_frames,
        "processed_frames": processed_count,
        "valid_pose_frames": valid_pose_count,
        "tracked_frames": tracked_count,
        "mean_confidence": round(mean_conf, 3),
        "analysis_fps": proc_fps,
        "file_size_bytes": os.path.getsize(output_path),
        "debug_frames": debug_paths
    }
