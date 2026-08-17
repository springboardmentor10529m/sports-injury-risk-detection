import uuid
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    sport = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    training_load = Column(Float, nullable=True)
    flexibility = Column(Float, nullable=True)
    strength = Column(Float, nullable=True)
    balance = Column(Float, nullable=True)
    endurance = Column(Float, nullable=True)
    coach_notes = Column(Text, nullable=True)
