import uuid
import datetime
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from sqlalchemy import Integer
from ..database.database import Base

class CitationValidationReport(Base):
    __tablename__ = "citation_validation_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    manuscript_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    total_citations: Mapped[Optional[int]] = mapped_column(Integer)
    valid_citations: Mapped[Optional[int]] = mapped_column(Integer)
    missing_references: Mapped[Optional[int]] = mapped_column(Integer)
    missing_doi: Mapped[Optional[int]] = mapped_column(Integer)
    format_errors: Mapped[Optional[int]] = mapped_column(Integer)
    score: Mapped[Optional[float]] = mapped_column(Integer)
    report: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    # relationship not strictly necessary here
