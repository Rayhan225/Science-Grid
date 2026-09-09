import uuid
import datetime
from typing import Optional

from sqlalchemy import String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class Formula(Base):
    __tablename__ = "formulas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    manuscript_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    expression: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    variables: Mapped[Optional[dict]] = mapped_column(JSONB)
    is_validated: Mapped[bool] = mapped_column(Boolean, server_default="false")
    validation_result: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    manuscript = relationship("Manuscript", back_populates="formulas")
    api_node = relationship("APINode", back_populates="formula", uselist=False)
