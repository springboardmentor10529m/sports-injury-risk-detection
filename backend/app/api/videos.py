"""
app/api/videos.py
-----------------
Video upload endpoint.

POST /videos
    - Requires a valid JWT (Bearer token).
    - Derives athlete_id from the authenticated user's linked Athlete record.
    - Validates MIME type and file size before reading bytes.
    - Persists the raw video binary in the PostgreSQL `videos` table (BYTEA).
    - Returns metadata only — never echoes the binary back to the caller.
"""

from typing import Annotated

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.athlete import Athlete
from app.models.video import Video
from app.models.user import RoleEnum, User
from app.schemas.video import VideoUploadResponse
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)

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

# 500 MB ceiling — stored as bytes in PostgreSQL BYTEA.
MAX_FILE_SIZE_BYTES: int = 500 * 1024 * 1024


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
        "stores the binary in PostgreSQL BYTEA, and returns upload metadata. "
        "The athlete is identified exclusively from the JWT — the client "
        "cannot supply or override athlete_id."
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
    Upload a video and persist it in the database.

    Steps
    -----
    1. Resolve the athlete record from the JWT user (server-side only).
    2. Validate MIME content type against the allow-list.
    3. Read the full file into memory and enforce the 500 MB size limit.
    4. Persist a Video row with the binary payload and metadata.
    5. Return a metadata-only response (no binary data).
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

    # 4. Persist the Video record.
    original_filename = file.filename or "upload"

    video = Video(
        athlete_id=athlete.athlete_id,
        original_filename=original_filename,
        content_type=content_type,
        file_size=file_size,
        file_data=file_bytes,
        processing_status="uploaded",
    )

    db.add(video)

    try:
        db.commit()
        db.refresh(video)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the video. Please try again.",
        )

    # 5. Return metadata (Pydantic schema excludes file_data).
    return video
