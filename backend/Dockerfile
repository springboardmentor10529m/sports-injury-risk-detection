FROM python:3.11-slim

# Prevent Python from writing pyc files and buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for OpenCV and PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY . .

# Expose port for FastAPI application
EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
