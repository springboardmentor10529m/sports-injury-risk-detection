FROM python:3.11-slim

# Prevent Python from writing pyc files, buffer output, and configure cache directory
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TORCH_HOME=/app/models_cache

WORKDIR /app

# Install system dependencies required for OpenCV, PostgreSQL client, and FFmpeg video processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build argument allowing CPU (lightweight ~200MB) or CUDA wheels (e.g., https://download.pytorch.org/whl/cu121)
ARG PYTORCH_EXTRA_INDEX_URL="https://download.pytorch.org/whl/cpu"

# Install PyTorch and TorchVision first in an isolated layer for optimal build caching
RUN pip install --no-cache-dir torch torchvision --index-url ${PYTORCH_EXTRA_INDEX_URL}

# Install remaining Python dependencies ensuring CPU PyTorch wheels are preserved
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url ${PYTORCH_EXTRA_INDEX_URL}

# Create necessary runtime directories
RUN mkdir -p /app/uploads/processed /app/pose_results /app/data /app/models_cache

# Copy backend application files
COPY . .

# Expose port for FastAPI application
EXPOSE 8000

# Container healthcheck using the API root status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
