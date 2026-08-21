"""Video service implementation for SafeMove Platform."""
import os
import uuid
from pathlib import Path
from typing import Optional, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.video import VideoSession, VideoStatus
from app.models.athlete import AthleteProfile
from app.models.user import User
from app.core.rbac import UserRole
from app.services.storage_service import get_storage_service


class VideoService:
    def __init__(self):
        self.settings = get_settings()
        self.storage = get_storage_service()

    def validate_video_file(self, filename: str, content_type: Optional[str], file_content: bytes) -> None:
        """
        Validate file size, extension, MIME type, and magic bytes for corruption/tampering.
        """
        # 1. Empty file validation
        if not file_content or len(file_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded video file is empty (0 bytes)."
            )

        # 2. Maximum file size validation (100MB)
        max_bytes = self.settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed limit of {self.settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # 3. File extension validation
        _, ext = os.path.splitext(filename or "")
        ext = ext.lower().strip()
        if ext not in self.settings.ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported video file extension '{ext}'. Allowed formats: {self.settings.ALLOWED_VIDEO_EXTENSIONS}"
            )

        # 4. MIME type validation (if present)
        if content_type:
            normalized_mime = content_type.lower().split(";")[0].strip()
            if normalized_mime not in self.settings.ALLOWED_VIDEO_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Invalid MIME content-type '{content_type}'."
                )

        # 5. Magic header & binary signature validation
        header = file_content[:64]
        is_valid_header = False

        # MP4 / QuickTime MOV signatures
        if ext in [".mp4", ".mov"]:
            if (
                b"ftyp" in header or
                b"moov" in header or
                b"mdat" in header or
                header.startswith(b"\x00\x00\x00")
            ):
                is_valid_header = True
        # WebM signature (EBML ID \x1a\x45\xdf\xa3)
        elif ext == ".webm":
            if header.startswith(b"\x1a\x45\xdf\xa3") or b"webm" in header.lower():
                is_valid_header = True
        # AVI signature (RIFF ... AVI )
        elif ext == ".avi":
            if header.startswith(b"RIFF") and b"AVI " in header:
                is_valid_header = True

        if not is_valid_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupted video file header."
            )

    async def upload_video(
        self,
        file: UploadFile,
        athlete_id: Optional[uuid.UUID],
        sport_type: Optional[str],
        current_user: User,
        db: AsyncSession
    ) -> VideoSession:
        """
        Process video upload, enforce athlete association, validate binary,
        persist to storage, and create database record.
        """
        # Resolve target athlete ID based on user role
        target_athlete_id: uuid.UUID

        if current_user.role == UserRole.ATHLETE:
            # Query athlete profile for current user
            stmt = select(AthleteProfile).where(AthleteProfile.user_id == current_user.id)
            result = await db.execute(stmt)
            athlete_profile = result.scalar_one_or_none()

            if not athlete_profile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Athlete profile not found. Please initialize your athlete profile first."
                )

            # If athlete_id was passed, verify it matches own profile
            if athlete_id and athlete_id != athlete_profile.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Athletes can only upload videos for their own profile."
                )
            target_athlete_id = athlete_profile.id

        else:
            # Staff roles: athlete_id is required
            if not athlete_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="athlete_id is required for coach and staff video uploads."
                )

            # Verify target athlete exists
            stmt = select(AthleteProfile).where(AthleteProfile.id == athlete_id)
            result = await db.execute(stmt)
            target_profile = result.scalar_one_or_none()

            if not target_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Athlete profile with ID '{athlete_id}' not found."
                )
            target_athlete_id = athlete_id

        # Read binary content
        try:
            file_content = await file.read()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read uploaded file: {str(e)}"
            )

        # Sanitize original filename (prevent path traversal)
        safe_original_name = os.path.basename(file.filename or "video.mp4")

        # Validate file
        self.validate_video_file(safe_original_name, file.content_type, file_content)

        # Generate unique video ID
        video_id = uuid.uuid4()

        # Save to filesystem
        safe_filename, storage_path, fps, duration_seconds, resolution = self.storage.save_video_file(
            file_content=file_content,
            original_filename=safe_original_name,
            video_id=video_id
        )

        # Create database record
        video_session = VideoSession(
            id=video_id,
            athlete_id=target_athlete_id,
            uploaded_by=current_user.id,
            filename=safe_filename,
            original_filename=safe_original_name,
            storage_path=storage_path,
            storage_url=f"/api/v1/videos/{video_id}/stream",
            content_type=file.content_type or "video/mp4",
            file_size=len(file_content),
            status=VideoStatus.UPLOADED,
            sport_type=sport_type or "General Movement",
            fps=fps,
            duration_seconds=duration_seconds,
            resolution=resolution
        )

        db.add(video_session)
        await db.commit()
        await db.refresh(video_session)

        return video_session

    async def list_videos(
        self,
        athlete_id: Optional[uuid.UUID],
        skip: int,
        limit: int,
        current_user: User,
        db: AsyncSession
    ) -> List[VideoSession]:
        """
        List videos accessible to the authenticated user.
        """
        stmt = select(VideoSession)

        if current_user.role == UserRole.ATHLETE:
            # Query athlete profile for current user
            prof_stmt = select(AthleteProfile).where(AthleteProfile.user_id == current_user.id)
            prof_result = await db.execute(prof_stmt)
            athlete_profile = prof_result.scalar_one_or_none()

            if not athlete_profile:
                return []

            stmt = stmt.where(
                (VideoSession.athlete_id == athlete_profile.id) |
                (VideoSession.uploaded_by == current_user.id)
            )
        else:
            if athlete_id:
                stmt = stmt.where(VideoSession.athlete_id == athlete_id)

        stmt = stmt.order_by(VideoSession.uploaded_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_video(
        self,
        video_id: uuid.UUID,
        current_user: User,
        db: AsyncSession
    ) -> VideoSession:
        """
        Get video metadata and verify authorization.
        """
        stmt = select(VideoSession).where(VideoSession.id == video_id)
        result = await db.execute(stmt)
        video = result.scalar_one_or_none()

        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video session '{video_id}' not found."
            )

        # Authorization: athletes can only view their own videos
        if current_user.role == UserRole.ATHLETE:
            prof_stmt = select(AthleteProfile).where(AthleteProfile.user_id == current_user.id)
            prof_result = await db.execute(prof_stmt)
            athlete_profile = prof_result.scalar_one_or_none()

            if not athlete_profile or (video.athlete_id != athlete_profile.id and video.uploaded_by != current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not have permission to view this video."
                )

        return video

    async def get_video_file_path_for_stream(
        self,
        video_id: uuid.UUID,
        current_user: User,
        db: AsyncSession
    ) -> Path:
        """
        Verify permissions and return validated file path for video streaming.
        """
        video = await self.get_video(video_id, current_user, db)
        file_path = self.storage.get_video_file_path(video.storage_path or video.filename)

        if not file_path or not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video file not found on storage server."
            )

        return file_path


_video_service_instance: Optional[VideoService] = None


def get_video_service() -> VideoService:
    global _video_service_instance
    if _video_service_instance is None:
        _video_service_instance = VideoService()
    return _video_service_instance
