import uuid
import datetime
from typing import Optional, List

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class ResearchProject(Base):
    __tablename__ = "research_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    owner = relationship("User", back_populates="projects")
    manuscripts = relationship("Manuscript", back_populates="project", cascade="all,delete-orphan")
    git_repositories = relationship("GitRepository", back_populates="project", cascade="all,delete-orphan")
