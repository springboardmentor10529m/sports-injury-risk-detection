"""
app/api/videos.py
-----------------
Video upload and analysis endpoints.

POST /videos
    - Requires a valid JWT (Bearer token).
    - Derives athlete_id from the authenticated user's linked Athlete record.
    - Validates MIME type and file size before reading bytes.
    - Writes the video file to the /app/uploads volume on the backend container.
    - Sets video_url to /uploads/<uuid>_<safe_filename>.
    - file_data (BYTEA) is preserved in the schema but left NULL for new uploads.
    - Returns metadata only — never echoes the binary back to the caller.

POST /videos/{video_id}/analyze
    - Triggers background analysis for a previously uploaded video.
    - Creates an AnalysisResult row with status=PENDING.
    - Spawns a FastAPI BackgroundTask that runs OpenCV + MediaPipe.
    - Returns {analysis_id, status} immediately (202 Accepted).

GET /videos/{video_id}/analysis
    - Returns the most recent AnalysisResult for the given video.
    - Used by the frontend to poll status: PENDING → PROCESSING → COMPLETED/FAILED.
"""

import os
import re
import uuid as uuid_module
from pathlib import Path
from typing import Annotated

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, SessionLocal
from app.models.athlete import Athlete
from app.models.video import Video
from app.models.analysis_result import (
    AnalysisResult,
    ANALYSIS_STATUS_PENDING,
)
from app.models.analysis_feature import AnalysisFeature
from app.models.user import RoleEnum, User
from app.schemas.video import VideoUploadResponse
from app.schemas.analysis import AnalysisTriggerResponse, AnalysisStatusResponse
from app.schemas.feature import AnalysisFeatureResponse
from app.core.dependencies import get_current_user
from app.services.analysis_pipeline import run_analysis_pipeline


router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)

# ── Upload directory ─────────────────────────────────────────────────────────

# Absolute path inside the container.
# The Docker named volume `uploads_data` is mounted here, so files survive
# container recreation and rebuilds.
UPLOAD_DIR = Path("/app/uploads")

# ── Validation constants ────────────────────────────────────────────────────

# Allowed MIME types.  Browser normalises "video/quicktime" for .mov files.
ALLOWED_CONTENT_TYPES: frozenset[str] = frozenset({
    "video/mp4",
    "video/quicktime",    # .mov
    "video/x-msvideo",   # .avi
    "video/avi",
    "video/webm",
    "video/x-matroska",  # .mkv
})

# 500 MB ceiling
MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024

# ── Filename sanitizer ───────────────────────────────────────────────────────

# Allow only word characters (a-z A-Z 0-9 _), dots, and hyphens.
# Everything else is replaced with an underscore.
_SAFE_CHAR_RE = re.compile(r"[^\w.\-]")


def _safe_filename(name: str) -> str:
    """
    Sanitise *name* for safe filesystem use, preventing path traversal.

    Steps
    -----
    1. ``os.path.basename`` strips any directory component (covers both
       forward-slash and back-slash path separators).
    2. All characters that are not alphanumeric, dot, dash, or underscore
       are replaced with underscores.
    3. Consecutive underscores are collapsed to one for readability.
    4. Result is capped at 200 characters so the full stored name
       (UUID prefix + underscore + name) stays within OS path limits.
    5. Falls back to ``"upload"`` if the result would be empty.
    """
    # 1. Strip path components — the primary path-traversal defence
    name = os.path.basename(name.replace("\\", "/"))
    # 2. Replace unsafe characters
    name = _SAFE_CHAR_RE.sub("_", name)
    # 3. Collapse repeated underscores
    name = re.sub(r"_+", "_", name).strip("_")
    # 4. Cap length
    name = name[:200]
    # 5. Fallback
    return name or "upload"


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_athlete_for_user(user: User, db: Session) -> Athlete:
    """
    Resolve the Athlete record linked to *user*.

    Raises HTTP 403 if the caller is not an Athlete-role user,
    or HTTP 404 if the athlete profile has not been created yet.
    """
    if user.role != RoleEnum.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Athlete users can upload videos.",
        )

    athlete = (
        db.query(Athlete)
        .filter(Athlete.user_id == user.user_id)
        .first()
    )

    if athlete is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Athlete profile not found. "
                "Please complete your profile before uploading a video."
            ),
        )

    return athlete


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=VideoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a video for the authenticated athlete",
    description=(
        "Accepts a multipart/form-data video file, validates its type and size, "
        "writes the file to the backend uploads volume under /app/uploads, and "
        "returns upload metadata. The athlete is identified exclusively from the "
        "JWT — the client cannot supply or override athlete_id."
    ),
)
async def upload_video(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    file: UploadFile = File(
        ...,
        description="Video file (MP4, MOV, AVI, WebM — max 500 MB)",
    ),
) -> Video:
    """
    Upload a video and persist it on the backend filesystem volume.

    Steps
    -----
    1. Resolve the athlete record from the JWT user (server-side only).
    2. Validate MIME content type against the allow-list.
    3. Read the full file into memory and enforce the 500 MB size limit.
    4. Sanitise the original filename to prevent path traversal.
    5. Write the bytes to /app/uploads/<uuid4>_<safe_filename>.
    6. Persist a Video row:
       - video_url = "/uploads/<uuid4>_<safe_filename>"
       - file_data  = None  (BYTEA column kept in schema but unused for new uploads)
    7. On DB commit failure, delete the orphaned file before raising 500.
    8. Return a metadata-only response (no binary data).
    """

    # 1. Resolve athlete from authenticated user.
    athlete = _get_athlete_for_user(current_user, db)

    # 2. Validate MIME type.
    # UploadFile.content_type may be None for unusual clients — treat as bad.
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type: '{content_type}'. "
                "Allowed types: MP4, MOV, AVI, WebM."
            ),
        )

    # 3. Read binary content and check size.
    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file. Please try again.",
        )

    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File too large: {file_size / (1024 * 1024):.1f} MB. "
                "Maximum allowed size is 500 MB."
            ),
        )

    # 4. Build a safe, unique filename.
    original_filename = file.filename or "upload"
    safe_name = _safe_filename(original_filename)
    file_uuid = uuid_module.uuid4()
    stored_filename = f"{file_uuid}_{safe_name}"

    # 5. Write the file to the uploads volume.
    # Ensure the directory exists — idempotent, safe to call every request.
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / stored_filename

    try:
        stored_path.write_bytes(file_bytes)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to write video to storage. Please try again.",
        ) from exc

    # 6. Persist the Video record.
    #    video_url  — URL path served by the /uploads StaticFiles mount.
    #    file_data  — intentionally NULL.  The BYTEA column is preserved in the
    #                 schema for stability but is not used for new uploads.
    video_url = f"/uploads/{stored_filename}"

    video = Video(
        athlete_id=athlete.athlete_id,
        original_filename=original_filename,
        content_type=content_type,
        file_size=file_size,
        file_data=None,
        video_url=video_url,
        processing_status="uploaded",
    )

    db.add(video)

    try:
        db.commit()
        db.refresh(video)

    except Exception as exc:
        db.rollback()
        # 7. Remove the orphaned file so disk and DB stay in sync.
        try:
            stored_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the video record. Please try again.",
        ) from exc

    # 8. Return metadata (Pydantic schema excludes file_data).
    return video


# ── Analysis endpoints ────────────────────────────────────────────────────────

def _get_video_for_athlete(
    video_id: uuid_module.UUID,
    athlete: Athlete,
    db: Session,
) -> Video:
    """
    Fetch video by ID and verify it belongs to the authenticated athlete.

    Raises HTTP 404 if the video does not exist.
    Raises HTTP 403 if the video belongs to another athlete.
    """
    video = db.query(Video).filter(Video.video_id == video_id).first()
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found.",
        )
    if video.athlete_id != athlete.athlete_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this video.",
        )
    return video


def _background_analyze(
    analysis_id: uuid_module.UUID,
    video_url: str,
    frame_sample_rate: int,
    max_processed_frames: int,
) -> None:
    """
    Background task wrapper.

    Creates its own SQLAlchemy session (the request session will be closed
    by the time this runs) and calls the pipeline orchestrator.
    """
    db = SessionLocal()
    try:
        run_analysis_pipeline(
            analysis_id=analysis_id,
            video_url=video_url,
            db=db,
            frame_sample_rate=frame_sample_rate,
            max_processed_frames=max_processed_frames,
        )
    finally:
        db.close()


@router.post(
    "/{video_id}/analyze",
    response_model=AnalysisTriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger pose estimation analysis for a video",
    description=(
        "Creates an AnalysisResult record (status=PENDING) and schedules "
        "OpenCV frame extraction + MediaPipe pose estimation as a background task. "
        "Returns immediately with the analysis_id for status polling."
    ),
)
async def trigger_analysis(
    video_id: uuid_module.UUID,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AnalysisTriggerResponse:
    """
    Trigger background analysis for the specified video.

    Steps
    -----
    1. Verify the caller is an ATHLETE role user.
    2. Resolve the athlete record.
    3. Verify video ownership.
    4. Create AnalysisResult row (status=PENDING).
    5. Enqueue background pipeline.
    6. Return 202 with analysis_id.
    """
    # 1. Role check
    if current_user.role != RoleEnum.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Athlete users can trigger video analysis.",
        )

    # 2. Resolve athlete
    athlete = _get_athlete_for_user(current_user, db)

    # 3. Verify video ownership
    video = _get_video_for_athlete(video_id, athlete, db)

    # 4. Create analysis record
    analysis = AnalysisResult(
        video_id=video.video_id,
        athlete_id=athlete.athlete_id,
        status=ANALYSIS_STATUS_PENDING,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Update the video's processing_status so the upload card reflects it
    video.processing_status = "analyzing"
    db.commit()

    # 5. Enqueue background task (uses its own DB session)
    background_tasks.add_task(
        _background_analyze,
        analysis_id=analysis.analysis_id,
        video_url=video.video_url,
        frame_sample_rate=settings.FRAME_SAMPLE_RATE,
        max_processed_frames=settings.MAX_PROCESSED_FRAMES,
    )

    # 6. Return immediately
    return AnalysisTriggerResponse(
        analysis_id=analysis.analysis_id,
        video_id=video.video_id,
        status=analysis.status,
        message=(
            f"Analysis queued. Poll GET /videos/{video_id}/analysis "
            "for status updates."
        ),
    )


@router.get(
    "/{video_id}/analysis",
    response_model=AnalysisStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the most recent analysis result for a video",
    description=(
        "Returns the latest AnalysisResult for the given video_id. "
        "Poll this endpoint to track analysis progress. "
        "Returns 404 if no analysis has been triggered yet."
    ),
)
def get_analysis_status(
    video_id: uuid_module.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AnalysisStatusResponse:
    """
    Return the most recent analysis result for the video.

    Enforces video ownership: the requesting athlete must own the video.
    Returns HTTP 404 if no analysis record exists yet.
    """
    # Role check (athletes only — coaches/physios can be added later)
    if current_user.role != RoleEnum.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Athlete users can view analysis results.",
        )

    athlete = _get_athlete_for_user(current_user, db)
    _get_video_for_athlete(video_id, athlete, db)  # ownership check

    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.video_id == video_id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this video. Trigger one via POST /analyze.",
        )

    return analysis


@router.get(
    "/{video_id}/features",
    response_model=AnalysisFeatureResponse,
    status_code=status.HTTP_200_OK,
    summary="Get extracted biomechanical features for a video",
    description=(
        "Returns the extracted biomechanical feature dictionary for the given video_id. "
        "Enforces video ownership and returns 404 if features have not been extracted yet."
    ),
)
def get_analysis_features(
    video_id: uuid_module.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AnalysisFeatureResponse:
    """
    Return the extracted biomechanical feature vector for the video.
    """
    if current_user.role != RoleEnum.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Athlete users can view biomechanical features.",
        )

    athlete = _get_athlete_for_user(current_user, db)
    _get_video_for_athlete(video_id, athlete, db)  # ownership check

    analysis = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.video_id == video_id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this video.",
        )

    feature_record = (
        db.query(AnalysisFeature)
        .filter(AnalysisFeature.analysis_id == analysis.analysis_id)
        .first()
    )

    if feature_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Biomechanical features not found for this analysis. Processing may still be in progress.",
        )

    return feature_record
