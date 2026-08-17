import uuid

from sqlalchemy import Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    prediction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("injury_predictions.prediction_id"),
        nullable=False
    )

    exercise: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    mobility: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    strengthening: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    recovery: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    training_modification: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )