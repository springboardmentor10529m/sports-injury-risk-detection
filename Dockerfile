# Production Dockerfile for AI Sports Injury Risk Detection Platform
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

# Install system dependencies for OpenCV (headless) and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application backend and frontend
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Copy root-level ML inference engine and model artifacts
COPY ml_inference.py /app/ml_inference.py
COPY models/ /app/models/
COPY scaler.joblib /app/scaler.joblib

# Copy MediaPipe pose landmarker model (embedded to avoid runtime download)
COPY pose_landmarker_full.task /app/pose_landmarker_full.task

# Copy example env file for reference
COPY .env.example /app/.env.example

# Create runtime storage directories for uploads and processed videos
RUN mkdir -p /app/uploads/raw /app/uploads/processed /app/frontend/static

EXPOSE 8000

# Start FastAPI with Uvicorn using PORT environment variable (defaults to 8000)
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}
