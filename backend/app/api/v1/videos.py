"""Video endpoints for upload, listing, streaming, processing, and keypoint retrieval."""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.video import (
    VideoUploadResponse,
    VideoDetailResponse,
    VideoStatusResponse,
    KeypointsResponse,
)
from app.services.video_service import get_video_service
from app.services.pipeline_service import get_pipeline_service

router = APIRouter()


@router.post(
    "/upload",
    response_model=VideoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new movement video for analysis"
)
async def upload_video(
    file: UploadFile = File(...),
    athlete_id: Optional[uuid.UUID] = Form(None),
    sport_type: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a movement recording (MP4, MOV, WebM, AVI up to 100MB).
    Associates the recording with the target athlete and persists it to storage.
    """
    service = get_video_service()
    video_session = await service.upload_video(
        file=file,
        athlete_id=athlete_id,
        sport_type=sport_type,
        current_user=current_user,
        db=db
    )
    return video_session


@router.get(
    "/",
    response_model=List[VideoDetailResponse],
    summary="List movement videos"
)
async def list_videos(
    athlete_id: Optional[uuid.UUID] = Query(None, description="Filter videos by athlete UUID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List uploaded video sessions. Athletes can only see their own videos.
    Staff and coaches can filter by athlete ID or list all authorized videos.
    """
    service = get_video_service()
    return await service.list_videos(
        athlete_id=athlete_id,
        skip=skip,
        limit=limit,
        current_user=current_user,
        db=db
    )


@router.get(
    "/{id}",
    response_model=VideoDetailResponse,
    summary="Get video details and metadata"
)
async def get_video(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get metadata for a specific uploaded video session."""
    service = get_video_service()
    return await service.get_video(
        video_id=id,
        current_user=current_user,
        db=db
    )


@router.get(
    "/{id}/stream",
    summary="Stream raw video binary for playback"
)
async def stream_video(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream or download the stored video file."""
    service = get_video_service()
    file_path = await service.get_video_file_path_for_stream(
        video_id=id,
        current_user=current_user,
        db=db
    )
    video = await service.get_video(id, current_user, db)
    return FileResponse(
        path=str(file_path),
        media_type=video.content_type or "video/mp4",
        filename=video.original_filename or video.filename
    )


@router.post(
    "/{id}/process",
    response_model=VideoStatusResponse,
    summary="Trigger pose estimation & kinematics pipeline"
)
async def process_video(
    id: uuid.UUID,
    reprocess: bool = Query(False, description="Force re-running analysis even if already ANALYZED"),
    smoothing_method: str = Query("SAVITZKY_GOLAY", description="Temporal smoothing algorithm"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute MediaPipe Pose 15-keypoint extraction, Savitzky-Golay temporal smoothing,
    and kinematic angle/velocity calculations on the uploaded video recording.
    """
    pipeline = get_pipeline_service()
    result = await pipeline.process_video_session(
        video_id=id,
        current_user=current_user,
        db=db,
        reprocess=reprocess,
        smoothing_method=smoothing_method
    )
    return VideoStatusResponse(**result)


@router.get(
    "/{id}/keypoints",
    response_model=KeypointsResponse,
    summary="Get extracted 15-keypoint landmark timeseries"
)
async def get_keypoints(
    id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve full 15-keypoint landmark timeseries sequence with raw and smoothed coordinates.
    """
    pipeline = get_pipeline_service()
    result = await pipeline.get_keypoints(
        video_id=id,
        current_user=current_user,
        db=db
    )
    return KeypointsResponse(**result)
