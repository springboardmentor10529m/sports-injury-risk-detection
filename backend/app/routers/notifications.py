from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications & Alerts"]
)

@router.get("", response_model=List[schemas.NotificationResponse])
def get_user_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch notifications for the authenticated user."""
    notifications = db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.user_id)\
        .order_by(models.Notification.created_at.desc())\
        .all()

    # If no notifications exist yet, generate initial contextual notifications
    if not notifications:
        seed_notifications = []
        if current_user.role == "athlete":
            seed_notifications.append(
                models.Notification(
                    user_id=current_user.user_id,
                    title="Biomechanics Baseline Ready",
                    message="Your reference movement model is calibrated against SportsPose & Human3.6M standards.",
                    type="system",
                    severity="info"
                )
            )
            seed_notifications.append(
                models.Notification(
                    user_id=current_user.user_id,
                    title="Training Load Alert",
                    message="Weekly training volume logged. Ensure active recovery protocols are followed.",
                    type="training_load",
                    severity="warning"
                )
            )
        else:
            seed_notifications.append(
                models.Notification(
                    user_id=current_user.user_id,
                    title="Squad Risk Monitoring Active",
                    message=f"Logged in as {current_user.role}. Team injury risk radar is currently active.",
                    type="system",
                    severity="info"
                )
            )
        for n in seed_notifications:
            db.add(n)
        db.commit()
        for n in seed_notifications:
            db.refresh(n)
        return seed_notifications

    return notifications

@router.put("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(
    notification_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read."""
    notification = db.query(models.Notification)\
        .filter(
            models.Notification.notification_id == notification_id,
            models.Notification.user_id == current_user.user_id
        ).first()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.put("/read-all")
def mark_all_notifications_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.user_id)\
        .update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/send", response_model=schemas.NotificationResponse)
def send_notification(
    payload: schemas.NotificationCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Allow coaches, physios, and admins to dispatch custom alerts to an athlete."""
    if current_user.role not in ["coach", "physiotherapist", "sports_scientist", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    notif = models.Notification(
        user_id=payload.user_id,
        title=payload.title,
        message=payload.message,
        type=payload.type or "system",
        severity=payload.severity or "info"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
