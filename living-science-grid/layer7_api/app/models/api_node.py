import uuid
import datetime
from typing import Optional

from sqlalchemy import String, Integer
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.database import Base

class APINode(Base):
    __tablename__ = "api_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="uuid_generate_v4()")
    formula_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    slug: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    endpoint_path: Mapped[Optional[str]] = mapped_column(String(500), unique=True)
    http_method: Mapped[Optional[str]] = mapped_column(String(20), server_default="POST")
    status: Mapped[Optional[str]] = mapped_column(String(50))
    execution_count: Mapped[int] = mapped_column(Integer, server_default="0")
    last_executed_at: Mapped[Optional[datetime.datetime]] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True))

    formula = relationship("Formula", back_populates="api_node")
    owner = relationship("User", back_populates="api_nodes")
    executions = relationship("APIExecution", back_populates="api_node", cascade="all,delete-orphan")
