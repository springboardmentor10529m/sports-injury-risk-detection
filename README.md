# MotionGuard AI — Sports Injury Risk Platform

MotionGuard AI analyzes athlete movement videos with MediaPipe pose estimation and produces biomechanical injury-risk guidance for athletes and coaches.

## Current project layout

- `dist/` — preserved production frontend build
- `src/` — surviving React application source
- `backend/main.py` — FastAPI API
- `backend/video_processor.py` — OpenCV and MediaPipe processing pipeline
- `backend/annotated_videos/` — generated skeleton videos
- `backend/motionguard.db` — local persistence fallback

## Run the preserved frontend

From this folder:

```powershell
python -m http.server 5175 --directory dist
```

Open http://127.0.0.1:5175.

## Run the backend

Install the Python dependencies:

```powershell
python -m pip install -r backend/requirements.txt
```

Start FastAPI:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The API documentation is available at http://127.0.0.1:8000/docs.

## MediaPipe pipeline

The frontend uploads a video to `/skeleton-stream-upload`. The backend saves it temporarily and exposes an MJPEG skeleton stream at `/skeleton-stream/{token}`. The prediction endpoint is `/predict`.

The restored processor uses OpenCV and MediaPipe Pose to calculate knee angles, hip and ankle movement, range of motion, cadence-related metrics, and pose-detection rate. It also creates an annotated video for reports.

## Model files

The original trained model archive was not present in the recovered OneDrive copy. To reproduce the original ensemble scores exactly, restore the archive at:

```text
C:\Users\sreen\OneDrive\Documents\sports\sports_injury_camera_model.zip
```

The archive must contain the saved feature names, imputer, scaler, ensemble models, metadata, and training dataset used by `backend/main.py`.

## Important

The compiled `dist` build is retained so the original visual output remains available even though some original editable frontend files were lost during the OneDrive sync failure.
