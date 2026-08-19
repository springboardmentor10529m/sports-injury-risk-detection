import uuid

# pyrefly: ignore [missing-import]
from sqlalchemy import String, Text, Float, Integer, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Athlete(Base):
    __tablename__ = "athletes"

    athlete_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False
    )

    sport: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    position: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    age: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    height: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    weight: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    training_load: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    flexibility: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    strength: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    balance: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    endurance: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    coach_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )