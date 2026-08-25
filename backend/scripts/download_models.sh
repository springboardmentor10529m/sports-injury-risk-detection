#!/usr/bin/env bash
# Downloads the real MediaPipe BlazePose model bundle used by
# app/services/pose_estimation.py. Must be run once before starting the API
# (mediapipe 0.10.x ships no bundled pose model - it must be fetched).
set -e

MODEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/app/ml_models"
mkdir -p "$MODEL_DIR"

MODEL_URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
MODEL_PATH="$MODEL_DIR/pose_landmarker_full.task"

if [ -f "$MODEL_PATH" ]; then
  echo "Model already present at $MODEL_PATH"
  exit 0
fi

echo "Downloading MediaPipe Pose Landmarker (full) model bundle..."
curl -L --fail -o "$MODEL_PATH" "$MODEL_URL"
echo "Saved to $MODEL_PATH"
