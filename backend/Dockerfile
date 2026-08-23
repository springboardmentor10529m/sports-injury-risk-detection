# SafeMove Backend Dockerfile
# Multi-stage production and development container configuration

# -------------------------------------------------------------
# Base Image: Python 3.11 Slim
# -------------------------------------------------------------
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install native OS dependencies required for OpenCV, MediaPipe, video decoding, and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Create application directory structure
RUN mkdir -p \
    /app/data/raw \
    /app/data/processed \
    /app/data/pose \
    /app/data/kinematics \
    /app/data/labels \
    /app/data/features \
    /app/data/splits \
    /app/data/models \
    /app/storage/videos \
    /app/uploads \
    /app/models

# -------------------------------------------------------------
# Development Stage
# -------------------------------------------------------------
FROM base AS dev

COPY . /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# -------------------------------------------------------------
# Production Stage
# -------------------------------------------------------------
FROM base AS prod

# Copy application source code
COPY . /app

# Ensure pose model asset is available at standard locations
RUN if [ -f "/app/app/ml/pose/pose_landmarker_lite.task" ]; then \
        cp /app/app/ml/pose/pose_landmarker_lite.task /app/models/pose_landmarker_lite.task ; \
    fi

# Create non-root system user for security compliance
RUN groupadd -g 1001 safemove && \
    useradd -u 1001 -g safemove -m -s /bin/bash safemove && \
    chown -R safemove:safemove /app

USER safemove

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
