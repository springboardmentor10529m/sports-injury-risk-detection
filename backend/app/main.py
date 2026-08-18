from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
import shutil


# =====================================================
# KINETIQ APPLICATION
# =====================================================

app = FastAPI(
    title="KINETIQ Sports Intelligence API",
    description="Backend API for the KINETIQ Sports Injury Risk Detection Platform",
    version="1.0.0"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# UPLOAD DIRECTORY
# =====================================================

UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():

    return {
        "message": "KINETIQ API is running",
        "status": "ok"
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/api/health")
def health_check():

    return {
        "status": "healthy",
        "service": "KINETIQ Backend"
    }


# =====================================================
# DASHBOARD
# =====================================================

@app.get("/api/dashboard")
def dashboard():

    return {

        "status": "success",

        "message": "Dashboard data retrieved successfully",

        "stats": {

            "injury_risk": "low",

            "movement_score": 87,

            "fatigue_level": 23,

            "training_load": 76,

            "athletes": 24,

            "high_risk": 3,

            "recovery": 82,

            "assessments": 7,

            "athletes_analyzed": 142,

            "risk_detections": 12,

            "total_users": 284,

            "active_users": 241,

            "analyses": "1,842",

            "system_status": 99.8
        }
    }


# =====================================================
# VIDEO UPLOAD
# =====================================================

@app.post("/api/upload")
async def upload_video(
    file: UploadFile = File(...)
):

    try:

        # -------------------------------------------------
        # CHECK FILE
        # -------------------------------------------------

        if not file.filename:

            return {
                "status": "error",
                "message": "No file selected"
            }


        # -------------------------------------------------
        # ALLOWED EXTENSIONS
        # -------------------------------------------------

        allowed_extensions = {
            ".mp4",
            ".mov",
            ".avi",
            ".mkv",
            ".webm"
        }


        original_filename = Path(
            file.filename
        ).name


        file_extension = Path(
            original_filename
        ).suffix.lower()


        if file_extension not in allowed_extensions:

            return {

                "status": "error",

                "message": "Unsupported video format",

                "allowed_formats": sorted(
                    list(allowed_extensions)
                )
            }


        # -------------------------------------------------
        # CREATE UNIQUE FILENAME
        # -------------------------------------------------

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S_%f"
        )


        safe_filename = (
            f"{timestamp}_{original_filename}"
        )


        file_path = UPLOAD_DIR / safe_filename


        # -------------------------------------------------
        # SAVE FILE
        # -------------------------------------------------

        with file_path.open("wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


        # -------------------------------------------------
        # FILE SIZE
        # -------------------------------------------------

        file_size = file_path.stat().st_size


        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return {

            "status": "success",

            "message": "Video uploaded successfully",

            "filename": safe_filename,

            "original_filename": original_filename,

            "file_path": str(file_path),

            "file_size": file_size,

            "analysis_status": "pending",

            "ai_analysis": False
        }


    except Exception as e:

        return {

            "status": "error",

            "message": "Video upload failed",

            "error": str(e)
        }


    finally:

        await file.close()