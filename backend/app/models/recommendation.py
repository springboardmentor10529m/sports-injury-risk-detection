"""Recommendation and notification models."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, Uuid
from sqlalchemy import Enum as SAEnum

from app.db.postgresql import Base


class RecCategory(StrEnum):
    EXERCISE = "EXERCISE"
    MOBILITY = "MOBILITY"
    TRAINING_MODIFICATION = "TRAINING_MODIFICATION"
    REST = "REST"
    REFERRAL = "REFERRAL"


class RecPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class RecStatus(StrEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DISMISSED = "DISMISSED"


class NotificationType(StrEnum):
    RISK_ALERT = "RISK_ALERT"
    RECOMMENDATION = "RECOMMENDATION"
    SYSTEM = "SYSTEM"
    REPORT_READY = "REPORT_READY"


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    risk_report_id = Column(Uuid, ForeignKey("risk_reports.id"))
    category = Column(SAEnum(RecCategory))
    priority = Column(SAEnum(RecPriority))
    title = Column(String(255), nullable=False)
    description = Column(String)
    exercises = Column(JSON)  # List of exercises
    status = Column(SAEnum(RecStatus), default=RecStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"))
    type = Column(SAEnum(NotificationType))
    title = Column(String(255))
    body = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
