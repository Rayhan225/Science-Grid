import uuid
import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    manuscript_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(50))
    margin_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    font_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    image_dpi_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    word_count_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    page_count_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    column_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    score: Mapped[Optional[float]] = mapped_column(DECIMAL)
    report: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    manuscript = relationship("Manuscript", back_populates="compliance_checks")
    template = relationship("PublisherTemplate", back_populates="compliance_checks")
