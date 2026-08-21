"""Analysis endpoints for kinematics and biomechanical anomaly detection."""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.analysis import KinematicsResponse, AnomalyAssessmentResponse
from app.services.pipeline_service import get_pipeline_service

router = APIRouter()


@router.get(
    "/{video_id}/kinematics",
    response_model=KinematicsResponse,
    summary="Get calculated joint angle curves, velocities, and asymmetries"
)
async def get_kinematics_analysis(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve calculated joint angles (knee flexion, knee valgus, hip, trunk tilt),
    angular velocities, angular accelerations, and bilateral asymmetry indexes.
    """
    pipeline = get_pipeline_service()
    result = await pipeline.get_kinematics(
        video_id=video_id,
        current_user=current_user,
        db=db
    )
    return KinematicsResponse(**result)


@router.get(
    "/{video_id}/anomalies",
    response_model=AnomalyAssessmentResponse,
    summary="Get biomechanical deviations and developmental baseline comparisons"
)
async def get_anomalies_analysis(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve statistical movement feature summary, developmental baseline deviations,
    temporal peak timestamps, and classified biomechanical anomalies.
    """
    pipeline = get_pipeline_service()
    result = await pipeline.get_anomalies(
        video_id=video_id,
        current_user=current_user,
        db=db
    )
    return AnomalyAssessmentResponse(**result)
