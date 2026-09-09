import uuid
import datetime
from typing import Optional, List

from sqlalchemy import String, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(500))
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_path: Mapped[Optional[str]] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, server_default="1")
    content_hash: Mapped[Optional[str]] = mapped_column(String(128))
    is_blind: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    project = relationship("ResearchProject", back_populates="manuscripts")
    formulas = relationship("Formula", back_populates="manuscript", cascade="all,delete-orphan")
    versions = relationship("ManuscriptVersion", back_populates="manuscript", cascade="all,delete-orphan")
    references = relationship("Reference", back_populates="manuscript", cascade="all,delete-orphan")
    citations = relationship("Citation", back_populates="manuscript", cascade="all,delete-orphan")
    diffs = relationship("ManuscriptDiff", back_populates="manuscript", cascade="all,delete-orphan")
    compliance_checks = relationship("ComplianceCheck", back_populates="manuscript", cascade="all,delete-orphan")
