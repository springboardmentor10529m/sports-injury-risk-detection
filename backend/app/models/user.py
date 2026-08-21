"""User model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.rbac import UserRole
from app.db.postgresql import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.ATHLETE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False)
