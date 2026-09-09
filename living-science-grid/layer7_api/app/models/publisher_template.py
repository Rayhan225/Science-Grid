import uuid
import datetime
from typing import Optional

from sqlalchemy import String, Integer, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class PublisherTemplate(Base):
    __tablename__ = "publisher_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    name: Mapped[Optional[str]] = mapped_column(String(255))
    publisher: Mapped[Optional[str]] = mapped_column(String(255))
    journal_name: Mapped[Optional[str]] = mapped_column(String(255))
    page_width: Mapped[Optional[float]] = mapped_column(DECIMAL)
    page_height: Mapped[Optional[float]] = mapped_column(DECIMAL)
    margin_top: Mapped[Optional[float]] = mapped_column(DECIMAL)
    margin_bottom: Mapped[Optional[float]] = mapped_column(DECIMAL)
    margin_left: Mapped[Optional[float]] = mapped_column(DECIMAL)
    margin_right: Mapped[Optional[float]] = mapped_column(DECIMAL)
    font_name: Mapped[Optional[str]] = mapped_column(String(255))
    font_size: Mapped[Optional[float]] = mapped_column(DECIMAL)
    max_words: Mapped[Optional[int]] = mapped_column(Integer)
    max_pages: Mapped[Optional[int]] = mapped_column(Integer)
    min_image_dpi: Mapped[Optional[int]] = mapped_column(Integer)
    columns: Mapped[Optional[int]] = mapped_column(Integer)
    rules: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    compliance_checks = relationship("ComplianceCheck", back_populates="template")
