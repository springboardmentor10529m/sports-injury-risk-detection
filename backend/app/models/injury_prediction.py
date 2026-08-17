import uuid

from sqlalchemy import Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("analysis_results.analysis_id"),
        nullable=False
    )

    acl_risk: Mapped[float | None] = mapped_column(Float)
    hamstring_risk: Mapped[float | None] = mapped_column(Float)
    ankle_risk: Mapped[float | None] = mapped_column(Float)
    shoulder_risk: Mapped[float | None] = mapped_column(Float)
    lower_back_risk: Mapped[float | None] = mapped_column(Float)
    overuse_risk: Mapped[float | None] = mapped_column(Float)