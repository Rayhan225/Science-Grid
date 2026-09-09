import uuid
import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class CodeLink(Base):
    __tablename__ = "code_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    manuscript_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(Text)
    start_line: Mapped[Optional[int]] = mapped_column(Integer)
    end_line: Mapped[Optional[int]] = mapped_column(Integer)
    commit_hash: Mapped[Optional[str]] = mapped_column(String(255))
    target_type: Mapped[Optional[str]] = mapped_column(String(50))
    target_reference: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    repository = relationship("GitRepository", back_populates="code_links")
    manuscript = relationship("Manuscript")
    creator = relationship("User")
