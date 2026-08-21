"""
Video Processing Pipeline Service.
Coordinates pose extraction, temporal smoothing, kinematics computation,
biomechanical anomaly detection, and database persistence.
"""

import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole
from app.ml.pose.pose_extractor import PoseExtractor
from app.models.analysis import (
    AnomalyAssessment,
    BiomechanicalAnomaly,
    KinematicAssessment,
    PoseSequence,
)
from app.models.athlete import AthleteProfile
from app.models.user import User
from app.models.video import VideoSession, VideoStatus
from app.services.anomaly_detection_service import get_anomaly_service
from app.services.kinematics_engine import KinematicsEngine
from app.services.storage_service import get_storage_service

logger = logging.getLogger("uvicorn.error")


class PipelineService:
    def __init__(self):
        self.storage = get_storage_service()
        self.pose_extractor = PoseExtractor()
        self.kinematics_engine = KinematicsEngine()
        self.anomaly_service = get_anomaly_service()

    async def _verify_video_access(self, video_id: uuid.UUID, current_user: User, db: AsyncSession) -> VideoSession:
        """Verify video exists and current user has authorization."""
        stmt = select(VideoSession).where(VideoSession.id == video_id)
        result = await db.execute(stmt)
        video = result.scalar_one_or_none()

        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video session '{video_id}' not found.",
            )

        if current_user.role == UserRole.ATHLETE:
            prof_stmt = select(AthleteProfile).where(AthleteProfile.user_id == current_user.id)
            prof_result = await db.execute(prof_stmt)
            athlete_profile = prof_result.scalar_one_or_none()

            if not athlete_profile or (video.athlete_id != athlete_profile.id and video.uploaded_by != current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not have permission to access this video session.",
                )

        return video

    async def process_video_session(
        self,
        video_id: uuid.UUID,
        current_user: User,
        db: AsyncSession,
        reprocess: bool = False,
        smoothing_method: str = "SAVITZKY_GOLAY",
    ) -> dict[str, Any]:
        """
        Execute full pipeline on video session:
        1. Extract 15-keypoint pose timeseries via MediaPipe Pose with temporal smoothing.
        2. Compute joint angles, velocities, accelerations, and bilateral asymmetry metrics.
        3. Perform statistical anomaly detection comparing features to developmental baselines.
        4. Persist PoseSequence, KinematicAssessment, AnomalyAssessment, and BiomechanicalAnomaly records.
        5. Update VideoSession status to ANALYZED.
        """
        video = await self._verify_video_access(video_id, current_user, db)

        # Duplicate processing prevention
        if video.status == VideoStatus.ANALYZED and not reprocess:
            return {
                "id": video.id,
                "status": video.status,
                "processed_at": video.processed_at,
                "message": "Video session is already analyzed. Pass reprocess=true to rerun.",
            }

        # 1. Transition: PREPROCESSING
        video.status = VideoStatus.PREPROCESSING
        await db.commit()

        try:
            # 2. Retrieve video file path
            file_path = self.storage.get_video_file_path(video.filename)
            if not file_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stored video binary '{video.filename}' is missing from filesystem.",
                )

            # 3. Transition: PROCESSING
            video.status = VideoStatus.PROCESSING
            await db.commit()

            # 4. Extract Pose Landmarks
            pose_result = self.pose_extractor.extract_from_video(
                video_path=str(file_path), smoothing_method=smoothing_method
            )

            # 5. Compute Kinematics
            kinematics_result = self.kinematics_engine.process_frames(pose_result)

            # 6. Perform Biomechanical Anomaly Detection against Developmental Baselines
            anomaly_result = self.anomaly_service.analyze_session(
                timestamps=kinematics_result["timestamps"],
                joint_angles=kinematics_result["joint_angle_curves"],
                angular_velocities=kinematics_result["angular_velocities"],
                angular_accelerations=kinematics_result["angular_accelerations"],
                asymmetry_metrics=kinematics_result["asymmetry_metrics"],
            )

            # 7. Clean up existing records if reprocessing
            await db.execute(delete(PoseSequence).where(PoseSequence.video_session_id == video.id))
            await db.execute(delete(KinematicAssessment).where(KinematicAssessment.video_session_id == video.id))
            await db.execute(delete(AnomalyAssessment).where(AnomalyAssessment.video_session_id == video.id))
            await db.execute(delete(BiomechanicalAnomaly).where(BiomechanicalAnomaly.video_session_id == video.id))

            # 8. Save Pose Sequence
            pose_record = PoseSequence(
                id=uuid.uuid4(),
                video_session_id=video.id,
                fps=pose_result["fps"],
                duration_seconds=pose_result["duration_seconds"],
                frame_count=pose_result["frame_count"],
                smoothing_method=pose_result["smoothing_method"],
                frames=pose_result["frames"],
            )
            db.add(pose_record)

            # 9. Save Kinematic Assessment
            kinematics_record = KinematicAssessment(
                id=uuid.uuid4(),
                video_session_id=video.id,
                athlete_id=video.athlete_id,
                timestamps=kinematics_result["timestamps"],
                joint_angles=kinematics_result["joint_angle_curves"],
                angular_velocities=kinematics_result["angular_velocities"],
                angular_accelerations=kinematics_result["angular_accelerations"],
                asymmetry_metrics=kinematics_result["asymmetry_metrics"],
                summary_metrics=kinematics_result["summary_metrics"],
            )
            db.add(kinematics_record)

            # 10. Save Full Anomaly Assessment
            assessment_record = AnomalyAssessment(
                id=uuid.uuid4(),
                video_session_id=video.id,
                athlete_id=video.athlete_id,
                overall_status=anomaly_result["overall_status"],
                feature_summary=anomaly_result["feature_summary"],
                metric_deviations=anomaly_result["metric_deviations"],
                anomalies=anomaly_result["anomalies"],
                baseline_metadata=anomaly_result["baseline_metadata"],
            )
            db.add(assessment_record)

            # 11. Save Individual Anomaly Events
            for anom in anomaly_result["anomalies"]:
                db.add(
                    BiomechanicalAnomaly(
                        id=uuid.uuid4(),
                        video_session_id=video.id,
                        athlete_id=video.athlete_id,
                        metric_name=anom["metric_name"],
                        timestamp_seconds=anom["timestamp_seconds"],
                        observed_value=anom["observed_value"],
                        baseline_value=anom["baseline_value"],
                        deviation=anom["deviation"],
                        z_score=anom["z_score"],
                        severity=anom["severity"],
                        baseline_type=anom["baseline_type"],
                        description=anom["description"],
                    )
                )

            # 12. Transition: ANALYZED
            video.status = VideoStatus.ANALYZED
            video.processed_at = datetime.utcnow()
            video.fps = pose_result["fps"]
            video.duration_seconds = pose_result["duration_seconds"]

            await db.commit()
            await db.refresh(video)

            return {
                "id": video.id,
                "status": video.status,
                "message": (
                    f"Successfully processed {pose_result['frame_count']} frames "
                    f"with {len(anomaly_result['anomalies'])} movement deviations identified."
                ),
            }

        except Exception as e:
            logger.error(f"Video processing failed for session {video_id}: {e}", exc_info=True)
            video.status = VideoStatus.FAILED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Video processing failed: {str(e)}",
            )

    async def get_keypoints(self, video_id: uuid.UUID, current_user: User, db: AsyncSession) -> dict[str, Any]:
        """Retrieve extracted landmark keypoints timeseries."""
        video = await self._verify_video_access(video_id, current_user, db)

        stmt = select(PoseSequence).where(PoseSequence.video_session_id == video.id)
        result = await db.execute(stmt)
        pose_seq = result.scalar_one_or_none()

        if not pose_seq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pose landmark sequence not found for video '{video_id}'. Please run process endpoint first.",
            )

        return {
            "video_id": video.id,
            "fps": pose_seq.fps,
            "duration": pose_seq.duration_seconds,
            "processed_fps": pose_seq.fps,
            "frame_count": pose_seq.frame_count,
            "smoothing_method": pose_seq.smoothing_method,
            "frames": pose_seq.frames,
        }

    async def get_kinematics(self, video_id: uuid.UUID, current_user: User, db: AsyncSession) -> dict[str, Any]:
        """Retrieve computed kinematics curves and metrics."""
        video = await self._verify_video_access(video_id, current_user, db)

        stmt = select(KinematicAssessment).where(KinematicAssessment.video_session_id == video.id)
        result = await db.execute(stmt)
        kin_record = result.scalar_one_or_none()

        if not kin_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kinematic assessment not found for video '{video_id}'. Please run process endpoint first.",
            )

        return {
            "video_id": kin_record.video_session_id,
            "athlete_id": kin_record.athlete_id,
            "timestamps": kin_record.timestamps,
            "joint_angle_curves": kin_record.joint_angles,
            "angular_velocities": kin_record.angular_velocities,
            "angular_accelerations": kin_record.angular_accelerations,
            "asymmetry_metrics": kin_record.asymmetry_metrics,
            "summary_metrics": kin_record.summary_metrics,
            "created_at": kin_record.created_at,
        }

    async def get_anomalies(self, video_id: uuid.UUID, current_user: User, db: AsyncSession) -> dict[str, Any]:
        """Retrieve biomechanical anomaly assessment and detected deviations."""
        video = await self._verify_video_access(video_id, current_user, db)

        stmt = select(AnomalyAssessment).where(AnomalyAssessment.video_session_id == video.id)
        result = await db.execute(stmt)
        assessment = result.scalar_one_or_none()

        if not assessment:
            # Fallback: Check if kinematics exist to compute dynamically
            kin_stmt = select(KinematicAssessment).where(KinematicAssessment.video_session_id == video.id)
            kin_res = await db.execute(kin_stmt)
            kin = kin_res.scalar_one_or_none()

            if not kin:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Biomechanical anomaly assessment not found for video '{video_id}'. "
                        f"Please run process endpoint first."
                    ),
                )

            # Compute dynamically
            anomaly_data = self.anomaly_service.analyze_session(
                timestamps=kin.timestamps,
                joint_angles=kin.joint_angles,
                angular_velocities=kin.angular_velocities,
                angular_accelerations=kin.angular_accelerations,
                asymmetry_metrics=kin.asymmetry_metrics,
            )
            return {
                "video_id": video.id,
                "athlete_id": video.athlete_id,
                "overall_status": anomaly_data["overall_status"],
                "feature_summary": anomaly_data["feature_summary"],
                "metric_deviations": anomaly_data["metric_deviations"],
                "temporal_peaks": anomaly_data["temporal_peaks"],
                "anomalies": anomaly_data["anomalies"],
                "baseline_metadata": anomaly_data["baseline_metadata"],
                "created_at": datetime.utcnow(),
            }

        return {
            "video_id": assessment.video_session_id,
            "athlete_id": assessment.athlete_id,
            "overall_status": assessment.overall_status,
            "feature_summary": assessment.feature_summary,
            "metric_deviations": assessment.metric_deviations,
            "temporal_peaks": assessment.metric_deviations.get("temporal_peaks", {}),
            "anomalies": assessment.anomalies,
            "baseline_metadata": assessment.baseline_metadata,
            "created_at": assessment.created_at,
        }


_pipeline_service_instance: PipelineService | None = None


def get_pipeline_service() -> PipelineService:
    global _pipeline_service_instance
    if _pipeline_service_instance is None:
        _pipeline_service_instance = PipelineService()
    return _pipeline_service_instance
