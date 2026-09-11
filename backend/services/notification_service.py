"""
AthleteGuard - Notification Service
Manages automated athlete and clinical notifications for analysis completion,
high risk alerts, and movement anomaly flags without duplicate spam.
"""

import logging
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "INFO"
    ) -> Optional[models.Notification]:
        """
        Creates a notification if an identical unread notification does not already exist.
        """
        try:
            existing = db.query(models.Notification).filter(
                models.Notification.user_id == user_id,
                models.Notification.title == title,
                models.Notification.is_read == False
            ).first()

            if existing:
                return existing

            notif = models.Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            return notif
        except Exception as e:
            logger.error(f"[NOTIFICATION] Error creating notification: {e}")
            db.rollback()
            return None

    @staticmethod
    def trigger_analysis_notifications(
        db: Session,
        user_id: str,
        analysis_id: str,
        risk_level: str,
        overall_score: float,
        critical_anomalies_count: int = 0
    ):
        """
        Dispatches contextual notifications following analysis job completion.
        """
        short_id = analysis_id[:8]
        # 1. Base completion notification
        NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title=f"Analysis Complete ({short_id})",
            message=f"Biomechanical screening completed. Risk Level: {risk_level} (Score: {overall_score}/100).",
            notification_type="SYSTEM" if risk_level == "LOW" else "INFO"
        )

        # 2. High or Critical Risk Alert
        if risk_level in ["HIGH", "CRITICAL"]:
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title=f"{risk_level} Risk Detected",
                message=f"Elevated movement risk score of {overall_score}/100 detected in recent movement screening. Review personalized recommendations and clinical guidance.",
                notification_type="ALERT" if risk_level == "CRITICAL" else "WARNING"
            )

        # 3. Critical Anomalies Flag
        if critical_anomalies_count > 0:
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Critical Movement Anomalies Identified",
                message=f"{critical_anomalies_count} critical kinematic anomaly events detected during landing or dynamic loading.",
                notification_type="WARNING"
            )
