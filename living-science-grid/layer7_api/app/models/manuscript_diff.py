import uuid
import datetime
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, Boolean

from ..database.database import Base

class ManuscriptDiff(Base):
    __tablename__ = "manuscript_diffs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    manuscript_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    old_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    new_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    additions: Mapped[Optional[int]] = mapped_column(Integer)
    deletions: Mapped[Optional[int]] = mapped_column(Integer)
    modifications: Mapped[Optional[int]] = mapped_column(Integer)
    structural_changes: Mapped[Optional[dict]] = mapped_column(JSONB)
    blind_mode: Mapped[bool] = mapped_column(Boolean, server_default="true")
    diff_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    manuscript = relationship("Manuscript", back_populates="diffs")
