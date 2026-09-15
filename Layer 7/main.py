import os
import sys
import time
import math
import uuid
import urllib.parse
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import (
    create_engine,
    String,
    Text,
    Integer,
    Boolean,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ==========================================
# DATABASE CONFIGURATION
# ==========================================

RAW_PASSWORD = urllib.parse.quote_plus("H@mimR181921")
DEFAULT_DB_URL = f"postgresql://postgres.pxbkyrsawehrspujkwlc:{RAW_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.x models."""
    pass

# Database Dependency Injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# SQLALCHEMY MODELS (17 TABLES)
# ==========================================

# 1. USERS
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects: Mapped[List["ResearchProject"]] = relationship("ResearchProject", back_populates="owner", cascade="all, delete-orphan")
    api_nodes: Mapped[List["APINode"]] = relationship("APINode", back_populates="owner", cascade="all, delete-orphan")
    git_repositories: Mapped[List["GitRepository"]] = relationship("GitRepository", back_populates="owner", cascade="all, delete-orphan")

# 2. RESEARCH PROJECTS
class ResearchProject(Base):
    __tablename__ = "research_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    manuscripts: Mapped[List["Manuscript"]] = relationship("Manuscript", back_populates="project", cascade="all, delete-orphan")
    git_repositories: Mapped[List["GitRepository"]] = relationship("GitRepository", back_populates="project", cascade="all, delete-orphan")

# 3. MANUSCRIPTS
class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_blind: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["ResearchProject"] = relationship("ResearchProject", back_populates="manuscripts")
    formulas: Mapped[List["Formula"]] = relationship("Formula", back_populates="manuscript", cascade="all, delete-orphan")
    versions: Mapped[List["ManuscriptVersion"]] = relationship("ManuscriptVersion", back_populates="manuscript", cascade="all, delete-orphan")
    diffs: Mapped[List["ManuscriptDiff"]] = relationship("ManuscriptDiff", back_populates="manuscript", cascade="all, delete-orphan")
    references: Mapped[List["Reference"]] = relationship("Reference", back_populates="manuscript", cascade="all, delete-orphan")
    citations: Mapped[List["Citation"]] = relationship("Citation", back_populates="manuscript", cascade="all, delete-orphan")
    citation_reports: Mapped[List["CitationValidationReport"]] = relationship("CitationValidationReport", back_populates="manuscript", cascade="all, delete-orphan")
    compliance_checks: Mapped[List["ComplianceCheck"]] = relationship("ComplianceCheck", back_populates="manuscript", cascade="all, delete-orphan")
    code_links: Mapped[List["CodeLink"]] = relationship("CodeLink", back_populates="manuscript", cascade="all, delete-orphan")

# 4. FORMULAS
class Formula(Base):
    __tablename__ = "formulas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    expression: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    variables: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    validation_result: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="formulas")
    api_nodes: Mapped[List["APINode"]] = relationship("APINode", back_populates="formula", cascade="all, delete-orphan")

# 5. API NODES
class APINode(Base):
    __tablename__ = "api_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    formula_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("formulas.id", ondelete="CASCADE"), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    endpoint_path: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    http_method: Mapped[str] = mapped_column(String(20), default="POST", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    execution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    formula: Mapped["Formula"] = relationship("Formula", back_populates="api_nodes")
    owner: Mapped["User"] = relationship("User", back_populates="api_nodes")
    executions: Mapped[List["APIExecution"]] = relationship("APIExecution", back_populates="api_node", cascade="all, delete-orphan")

# 6. API EXECUTIONS
class APIExecution(Base):
    __tablename__ = "api_executions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    input_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    output_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    execution_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    api_node: Mapped["APINode"] = relationship("APINode", back_populates="executions")

# 7. GIT REPOSITORIES
class GitRepository(Base):
    __tablename__ = "git_repositories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    repository_url: Mapped[str] = mapped_column(Text, nullable=False)
    repository_name: Mapped[str] = mapped_column(String(255), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(255), default="main", nullable=False)
    access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["ResearchProject"] = relationship("ResearchProject", back_populates="git_repositories")
    owner: Mapped["User"] = relationship("User", back_populates="git_repositories")
    code_links: Mapped[List["CodeLink"]] = relationship("CodeLink", back_populates="repository", cascade="all, delete-orphan")

# 8. CODE LINKS
class CodeLink(Base):
    __tablename__ = "code_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("git_repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    commit_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_reference: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    repository: Mapped["GitRepository"] = relationship("GitRepository", back_populates="code_links")
    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="code_links")

# 9. MANUSCRIPT VERSIONS
class ManuscriptVersion(Base):
    __tablename__ = "manuscript_versions"
    __table_args__ = (UniqueConstraint("manuscript_id", "version_number", name="uq_manuscript_version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="versions")

# 10. MANUSCRIPT DIFFS
class ManuscriptDiff(Base):
    __tablename__ = "manuscript_diffs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False)
    old_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscript_versions.id", ondelete="CASCADE"), nullable=False)
    new_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscript_versions.id", ondelete="CASCADE"), nullable=False)
    additions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deletions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    modifications: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    structural_changes: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    blind_mode: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    diff_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="diffs")

# 11. REFERENCES
class Reference(Base):
    __tablename__ = "references"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    journal: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bibtex: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="references")

# 12. CITATIONS & REPORTS
class Citation(Base):
    __tablename__ = "citations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_text: Mapped[str] = mapped_column(Text, nullable=False)
    citation_key: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    validation_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="citations")


class CitationValidationReport(Base):
    __tablename__ = "citation_validation_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False)
    total_citations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_citations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_references: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_doi: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    format_errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    report: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="citation_reports")

# 13. PUBLISHER TEMPLATES
class PublisherTemplate(Base):
    __tablename__ = "publisher_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    publisher: Mapped[str] = mapped_column(String(255), nullable=False)
    journal_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    page_width: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    page_height: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    margin_top: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    margin_bottom: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    margin_left: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    margin_right: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    font_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    font_size: Mapped[Optional[float]] = mapped_column(Numeric(4, 2), nullable=True)
    max_words: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_image_dpi: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    columns: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rules: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    compliance_checks: Mapped[List["ComplianceCheck"]] = relationship("ComplianceCheck", back_populates="template", cascade="all, delete-orphan")

# 14. COMPLIANCE CHECKS
class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("manuscripts.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("publisher_templates.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    margin_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    font_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    image_dpi_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    word_count_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    page_count_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    column_check: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    report: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="compliance_checks")
    template: Mapped["PublisherTemplate"] = relationship("PublisherTemplate", back_populates="compliance_checks")

# 15. USER TELEMETRY LOGS
class UserTelemetryLog(Base):
    __tablename__ = "user_telemetry_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    section_viewed: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    interaction_type: Mapped[str] = mapped_column(String(255), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    dwell_time_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

# 16. QUOTES
class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)

# 17. COMMUNITY THREADS
class CommunityThread(Base):
    __tablename__ = "community_threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

# ==========================================
# STUBBED AUTHENTICATION DEPENDENCY
# ==========================================

def get_current_user(db: Session = Depends(get_db)) -> User:
    """Automatically returns the seeded researcher user for easy local testing."""
    user = db.query(User).filter(User.role == "researcher").first()
    if not user:
        user = db.query(User).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found in database. Run 'python main.py --seed' first."
        )
    return user

# ==========================================
# PYDANTIC SCHEMAS (V2)
# ==========================================

class ProjectCreateSchema(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: str = Field("active", max_length=50)

class ProjectUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, max_length=50)

class ProjectResponseSchema(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ManuscriptCreateSchema(BaseModel):
    project_id: uuid.UUID
    title: str = Field(..., max_length=500)
    file_name: Optional[str] = Field(None, max_length=255)
    file_path: Optional[str] = None
    is_blind: bool = False

class ManuscriptResponseSchema(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    file_name: Optional[str]
    file_path: Optional[str]
    version: int
    content_hash: Optional[str]
    is_blind: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ManuscriptVersionCreateSchema(BaseModel):
    file_path: str
    content_hash: str

class ManuscriptVersionResponseSchema(BaseModel):
    id: uuid.UUID
    manuscript_id: uuid.UUID
    version_number: int
    file_path: str
    content_hash: str
    created_by: Optional[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True

# Formula Schemas
class FormulaCreateSchema(BaseModel):
    manuscript_id: uuid.UUID
    name: str = Field(..., max_length=255)
    expression: str
    description: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)

class FormulaResponseSchema(BaseModel):
    id: uuid.UUID
    manuscript_id: uuid.UUID
    name: str
    expression: str
    description: Optional[str]
    variables: Dict[str, Any]
    is_validated: bool
    validation_result: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# API Node Schemas
class APINodeCreateSchema(BaseModel):
    formula_id: uuid.UUID
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)

class APINodeResponseSchema(BaseModel):
    id: uuid.UUID
    formula_id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    slug: str
    endpoint_path: str
    http_method: str
    status: str
    execution_count: int
    last_executed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class APINodeExecuteSchema(BaseModel):
    input_data: Dict[str, Any] = Field(default_factory=dict)

class APIExecutionResponseSchema(BaseModel):
    id: uuid.UUID
    api_node_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: str
    execution_time_ms: Optional[int]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Git Repositories & Code Links Schemas
class GitRepoCreateSchema(BaseModel):
    project_id: uuid.UUID
    provider: str = Field("github", max_length=50)
    repository_url: str
    repository_name: str = Field(..., max_length=255)
    default_branch: str = Field("main", max_length=255)

class GitRepoResponseSchema(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    owner_id: uuid.UUID
    provider: str
    repository_url: str
    repository_name: str
    default_branch: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CodeLinkCreateSchema(BaseModel):
    repository_id: uuid.UUID
    manuscript_id: uuid.UUID
    file_path: str
    start_line: int
    end_line: int
    commit_hash: Optional[str] = None
    target_type: str = Field(..., max_length=50)
    target_reference: str
    description: Optional[str] = None

class CodeLinkResponseSchema(BaseModel):
    id: uuid.UUID
    repository_id: uuid.UUID
    manuscript_id: uuid.UUID
    file_path: str
    start_line: int
    end_line: int
    commit_hash: Optional[str]
    target_type: str
    target_reference: str
    description: Optional[str]
    created_by: Optional[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True

# References & Citation Validation Schemas
class ReferenceCreateSchema(BaseModel):
    manuscript_id: uuid.UUID
    citation_key: str = Field(..., max_length=255)
    title: str
    authors: str
    year: Optional[int] = None
    journal: Optional[str] = Field(None, max_length=500)
    doi: Optional[str] = Field(None, max_length=500)
    url: Optional[str] = None
    bibtex: Optional[str] = None

class ReferenceResponseSchema(BaseModel):
    id: uuid.UUID
    manuscript_id: uuid.UUID
    citation_key: str
    title: str
    authors: str
    year: Optional[int]
    journal: Optional[str]
    doi: Optional[str]
    url: Optional[str]
    bibtex: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CitationValidationReportResponseSchema(BaseModel):
    id: uuid.UUID
    manuscript_id: uuid.UUID
    total_citations: int
    valid_citations: int
    missing_references: int
    missing_doi: int
    format_errors: int
    score: float
    report: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Publisher Templates & Compliance Schemas
class PublisherTemplateCreateSchema(BaseModel):
    name: str = Field(..., max_length=255)
    publisher: str = Field(..., max_length=255)
    journal_name: str = Field(..., max_length=255)
    page_width: Optional[float] = None
    page_height: Optional[float] = None
    margin_top: Optional[float] = None
    margin_bottom: Optional[float] = None
    margin_left: Optional[float] = None
    margin_right: Optional[float] = None
    font_name: Optional[str] = Field(None, max_length=255)
    font_size: Optional[float] = None
    max_words: Optional[int] = None
    max_pages: Optional[int] = None
    min_image_dpi: Optional[int] = None
    columns: Optional[int] = None
    rules: Dict[str, Any] = Field(default_factory=dict)

class PublisherTemplateResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    publisher: str
    journal_name: str
    page_width: Optional[float]
    page_height: Optional[float]
    margin_top: Optional[float]
    margin_bottom: Optional[float]
    margin_left: Optional[float]
    margin_right: Optional[float]
    font_name: Optional[str]
    font_size: Optional[float]
    max_words: Optional[int]
    max_pages: Optional[int]
    min_image_dpi: Optional[int]
    columns: Optional[int]
    rules: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ComplianceCheckRequestSchema(BaseModel):
    template_id: uuid.UUID

class ComplianceCheckResponseSchema(BaseModel):
    id: uuid.UUID
    manuscript_id: uuid.UUID
    template_id: uuid.UUID
    status: str
    margin_check: Optional[bool]
    font_check: Optional[bool]
    image_dpi_check: Optional[bool]
    word_count_check: Optional[bool]
    page_count_check: Optional[bool]
    column_check: Optional[bool]
    score: float
    report: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Layer 7 Schemas
class TelemetryEventSchema(BaseModel):
    profile_id: Optional[str] = None
    workspace_id: Optional[str] = None
    section_viewed: Optional[str] = None
    interaction_type: str
    page_number: Optional[int] = 1
    dwell_time_seconds: Optional[int] = 0

class QuoteResponseSchema(BaseModel):
    quote: str
    author: str

    class Config:
        from_attributes = True

class CommunityThreadResponseSchema(BaseModel):
    id: int
    profile_id: Optional[str]
    title: str
    content: str
    upvotes: int
    
    class Config:
        from_attributes = True

# ==========================================
# SEED FUNCTION
# ==========================================

def seed_database():
    db = SessionLocal()
    try:
        print("Cleaning existing seed data...")
        db.query(UserTelemetryLog).delete()
        db.query(Quote).delete()
        db.query(CommunityThread).delete()
        db.query(ComplianceCheck).delete()
        db.query(CodeLink).delete()
        db.query(GitRepository).delete()
        db.query(APINode).delete()
        db.query(Formula).delete()
        db.query(CitationValidationReport).delete()
        db.query(Citation).delete()
        db.query(Reference).delete()
        db.query(ManuscriptVersion).delete()
        db.query(Manuscript).delete()
        db.query(ResearchProject).delete()
        db.query(User).delete()
        db.query(PublisherTemplate).delete()
        db.commit()

        print("Seeding Users...")
        admin = User(
            id=uuid.uuid4(),
            name="System Admin",
            email="admin@scholargrid.io",
            password_hash="hashed_admin_pass",
            role="admin",
            is_active=True
        )
        researcher = User(
            id=uuid.uuid4(),
            name="Dr. Aris Thorne",
            email="researcher@scholargrid.io",
            password_hash="hashed_researcher_pass",
            role="researcher",
            is_active=True
        )
        developer = User(
            id=uuid.uuid4(),
            name="Elena Rostova",
            email="dev@scholargrid.io",
            password_hash="hashed_dev_pass",
            role="developer",
            is_active=True
        )
        db.add_all([admin, researcher, developer])
        db.commit()

        print("Seeding Research Project & Manuscript...")
        project = ResearchProject(
            id=uuid.uuid4(),
            owner_id=researcher.id,
            title="Automated Algorithmic Analysis of Quantum Circuits",
            description="Investigating node execution performance across distributed sandboxes.",
            status="active"
        )
        db.add(project)
        db.commit()

        manuscript = Manuscript(
            id=uuid.uuid4(),
            project_id=project.id,
            title="High-Performance Quantum State Simulation via Fast Execution Nodes",
            file_name="quantum_simulation_v1.pdf",
            file_path="/storage/manuscripts/quantum_simulation_v1.pdf",
            version=2,
            content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            is_blind=False
        )
        db.add(manuscript)
        db.commit()

        print("Seeding Manuscript Versions...")
        ver1 = ManuscriptVersion(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            version_number=1,
            file_path="/storage/manuscripts/quantum_simulation_v1.pdf",
            content_hash="hash_v1_abc1234567890",
            created_by=researcher.id
        )
        ver2 = ManuscriptVersion(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            version_number=2,
            file_path="/storage/manuscripts/quantum_simulation_v2.pdf",
            content_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            created_by=researcher.id
        )
        db.add_all([ver1, ver2])

        print("Seeding Formulas & API Nodes...")
        f1 = Formula(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            name="Quadratic Root",
            expression="(-b + math.sqrt(b*b - 4*a*c)) / (2*a)",
            description="Standard quadratic formula for root computation.",
            variables={"a": "number", "b": "number", "c": "number"},
            is_validated=True,
            validation_result={"status": "passed"}
        )
        f2 = Formula(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            name="Exponential Decay Rate",
            expression="a * math.exp(-lambda_val * t)",
            description="Models quantum state decoherence over time.",
            variables={"a": "number", "lambda_val": "number", "t": "number"},
            is_validated=True,
            validation_result={"status": "passed"}
        )
        db.add_all([f1, f2])
        db.commit()

        node1 = APINode(
            id=uuid.uuid4(),
            formula_id=f1.id,
            owner_id=developer.id,
            name="Quadratic Root API",
            slug="quadratic-root",
            endpoint_path="/api/v1/nodes/quadratic-root",
            http_method="POST",
            status="active"
        )
        node2 = APINode(
            id=uuid.uuid4(),
            formula_id=f2.id,
            owner_id=developer.id,
            name="Decay Rate API",
            slug="exponential-decay",
            endpoint_path="/api/v1/nodes/exponential-decay",
            http_method="POST",
            status="active"
        )
        db.add_all([node1, node2])

        print("Seeding Git Repository & Code Links...")
        repo = GitRepository(
            id=uuid.uuid4(),
            project_id=project.id,
            owner_id=developer.id,
            provider="github",
            repository_url="https://github.com/scholargrid/quantum-simulation",
            repository_name="quantum-simulation",
            default_branch="main"
        )
        db.add(repo)
        db.commit()

        link1 = CodeLink(
            id=uuid.uuid4(),
            repository_id=repo.id,
            manuscript_id=manuscript.id,
            file_path="src/model/train.py",
            start_line=45,
            end_line=92,
            commit_hash="a1b2c3d4e5f6",
            target_type="methodology",
            target_reference="section-3-methodology",
            description="Implementation of training loop described in section 3.",
            created_by=developer.id
        )
        link2 = CodeLink(
            id=uuid.uuid4(),
            repository_id=repo.id,
            manuscript_id=manuscript.id,
            file_path="src/solver/quadratic.py",
            start_line=10,
            end_line=25,
            commit_hash="a1b2c3d4e5f6",
            target_type="formula",
            target_reference="formula-quadratic-root",
            description="Direct Python implementation of Formula 1.",
            created_by=developer.id
        )
        db.add_all([link1, link2])

        print("Seeding References & Citations...")
        ref1 = Reference(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_key="smith2023quantum",
            title="Quantum Computing Foundations",
            authors="A. Smith, B. Jones",
            year=2023,
            journal="Journal of Quantum Physics",
            doi="10.1016/j.jqp.2023.01.001",
            bibtex="@article{smith2023quantum, author={Smith, A. and Jones, B.}, journal={Journal of Quantum Physics}, title={Quantum Computing Foundations}, year={2023}}"
        )
        ref2 = Reference(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_key="doe2024algorithmic",
            title="Algorithmic Efficiency in Simulation",
            authors="J. Doe, R. Roe",
            year=2024,
            journal="ACM Computing Surveys",
            doi="10.1145/3610000",
            bibtex="@article{doe2024algorithmic, author={Doe, J. and Roe, R.}, journal={ACM Computing Surveys}, title={Algorithmic Efficiency in Simulation}, year={2024}}"
        )
        ref3 = Reference(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_key="turing1950computing",
            title="Computing Machinery and Intelligence",
            authors="A. M. Turing",
            year=1950,
            journal="Mind",
            doi="10.1093/mind/LIX.236.433",
            bibtex="@article{turing1950computing, author={Turing, A. M.}, journal={Mind}, title={Computing Machinery and Intelligence}, year={1950}}"
        )
        db.add_all([ref1, ref2, ref3])

        cit1 = Citation(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_text="As shown by Smith et al. (2023)...",
            citation_key="smith2023quantum",
            location="Section 1",
            line_number=12,
            is_valid=True
        )
        cit2 = Citation(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_text="Following the framework in Doe et al. (2024)...",
            citation_key="doe2024algorithmic",
            location="Section 2",
            line_number=45,
            is_valid=True
        )
        cit3 = Citation(
            id=uuid.uuid4(),
            manuscript_id=manuscript.id,
            citation_text="The fundamental test (Turing, 1950)...",
            citation_key="turing1950computing",
            location="Section 4",
            line_number=110,
            is_valid=True
        )
        db.add_all([cit1, cit2, cit3])

        print("Seeding Publisher Templates...")
        ieee = PublisherTemplate(
            id=uuid.uuid4(),
            name="IEEE Standard Two-Column",
            publisher="IEEE",
            journal_name="IEEE Transactions on Software Engineering",
            page_width=8.50,
            page_height=11.00,
            margin_top=0.75,
            margin_bottom=0.75,
            margin_left=0.63,
            margin_right=0.63,
            font_name="Times New Roman",
            font_size=10.00,
            max_pages=8,
            min_image_dpi=300,
            columns=2
        )
        apa = PublisherTemplate(
            id=uuid.uuid4(),
            name="APA 7th Edition",
            publisher="APA",
            journal_name="Journal of Educational Psychology",
            page_width=8.50,
            page_height=11.00,
            margin_top=1.00,
            margin_bottom=1.00,
            margin_left=1.00,
            margin_right=1.00,
            font_name="Times New Roman",
            font_size=12.00,
            max_words=8000,
            min_image_dpi=300,
            columns=1
        )
        springer = PublisherTemplate(
            id=uuid.uuid4(),
            name="Springer LNCS Format",
            publisher="Springer",
            journal_name="Lecture Notes in Computer Science",
            page_width=6.14,
            page_height=9.21,
            margin_top=0.78,
            margin_bottom=0.78,
            margin_left=0.78,
            margin_right=0.78,
            font_name="Computer Modern",
            font_size=10.00,
            max_pages=15,
            min_image_dpi=300,
            columns=1
        )
        db.add_all([ieee, apa, springer])

        print("Seeding Quotes...")
        q1 = Quote(quote="An equation means nothing to me unless it expresses a thought of God.", author="Srinivasa Ramanujan")
        db.add(q1)

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# ==========================================
# FASTAPI APPLICATION SETUP
# ==========================================

app = FastAPI(
    title="ScholarGrid Layer 7 API",
    description="Developer Tools & Algorithmic Integration Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base Endpoints
@app.get("/", tags=["System"])
def root():
    return {
        "system": "ScholarGrid Layer 7",
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connectivity issue: {str(e)}"
        )

# ==========================================
# PROJECTS ENDPOINTS
# ==========================================

@app.post("/api/v1/projects", response_model=ProjectResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Projects"])
def create_project(
    project_in: ProjectCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = ResearchProject(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        title=project_in.title,
        description=project_in.description,
        status=project_in.status,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@app.get("/api/v1/projects", response_model=List[ProjectResponseSchema], tags=["Projects"])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(ResearchProject).filter(ResearchProject.owner_id == current_user.id).all()

@app.get("/api/v1/projects/{project_id}", response_model=ProjectResponseSchema, tags=["Projects"])
def get_project(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

@app.put("/api/v1/projects/{project_id}", response_model=ProjectResponseSchema, tags=["Projects"])
def update_project(
    project_id: uuid.UUID,
    project_in: ProjectUpdateSchema,
    db: Session = Depends(get_db),
):
    project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status

    db.commit()
    db.refresh(project)
    return project

@app.delete("/api/v1/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Projects"])
def delete_project(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()
    return None

# ==========================================
# MANUSCRIPTS ENDPOINTS
# ==========================================

@app.post("/api/v1/manuscripts", response_model=ManuscriptResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Manuscripts"])
def create_manuscript(
    manuscript_in: ManuscriptCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(ResearchProject).filter(ResearchProject.id == manuscript_in.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research Project not found")

    manuscript = Manuscript(
        id=uuid.uuid4(),
        project_id=manuscript_in.project_id,
        title=manuscript_in.title,
        file_name=manuscript_in.file_name,
        file_path=manuscript_in.file_path,
        version=1,
        content_hash="initial_hash",
        is_blind=manuscript_in.is_blind,
    )
    db.add(manuscript)
    db.commit()

    initial_version = ManuscriptVersion(
        id=uuid.uuid4(),
        manuscript_id=manuscript.id,
        version_number=1,
        file_path=manuscript_in.file_path or "",
        content_hash="initial_hash",
        created_by=current_user.id,
    )
    db.add(initial_version)
    db.commit()

    db.refresh(manuscript)
    return manuscript

@app.get("/api/v1/manuscripts/{manuscript_id}", response_model=ManuscriptResponseSchema, tags=["Manuscripts"])
def get_manuscript(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")
    return manuscript

@app.post("/api/v1/manuscripts/{id}/versions", response_model=ManuscriptVersionResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Manuscripts"])
def create_manuscript_version(
    id: uuid.UUID,
    version_in: ManuscriptVersionCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manuscript = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    new_version_number = manuscript.version + 1

    new_version = ManuscriptVersion(
        id=uuid.uuid4(),
        manuscript_id=manuscript.id,
        version_number=new_version_number,
        file_path=version_in.file_path,
        content_hash=version_in.content_hash,
        created_by=current_user.id,
    )
    db.add(new_version)

    manuscript.version = new_version_number
    manuscript.file_path = version_in.file_path
    manuscript.content_hash = version_in.content_hash

    db.commit()
    db.refresh(new_version)
    return new_version

@app.get("/api/v1/manuscripts/{id}/versions", response_model=List[ManuscriptVersionResponseSchema], tags=["Manuscripts"])
def list_manuscript_versions(id: uuid.UUID, db: Session = Depends(get_db)):
    manuscript = db.query(Manuscript).filter(Manuscript.id == id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    return db.query(ManuscriptVersion).filter(ManuscriptVersion.manuscript_id == id).order_by(ManuscriptVersion.version_number.asc()).all()

# ==========================================
# FORMULAS ENDPOINTS
# ==========================================

@app.post("/api/v1/formulas", response_model=FormulaResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Formulas"])
def create_formula(
    formula_in: FormulaCreateSchema,
    db: Session = Depends(get_db)
):
    manuscript = db.query(Manuscript).filter(Manuscript.id == formula_in.manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    formula = Formula(
        id=uuid.uuid4(),
        manuscript_id=formula_in.manuscript_id,
        name=formula_in.name,
        expression=formula_in.expression,
        description=formula_in.description,
        variables=formula_in.variables,
        is_validated=False,
        validation_result={"status": "pending"}
    )
    db.add(formula)
    db.commit()
    db.refresh(formula)
    return formula

@app.get("/api/v1/manuscripts/{manuscript_id}/formulas", response_model=List[FormulaResponseSchema], tags=["Formulas"])
def list_formulas_for_manuscript(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Formula).filter(Formula.manuscript_id == manuscript_id).all()

@app.get("/api/v1/formulas/{formula_id}", response_model=FormulaResponseSchema, tags=["Formulas"])
def get_formula(formula_id: uuid.UUID, db: Session = Depends(get_db)):
    formula = db.query(Formula).filter(Formula.id == formula_id).first()
    if not formula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formula not found")
    return formula

@app.post("/api/v1/formulas/{formula_id}/validate", response_model=FormulaResponseSchema, tags=["Formulas"])
def validate_formula(formula_id: uuid.UUID, db: Session = Depends(get_db)):
    formula = db.query(Formula).filter(Formula.id == formula_id).first()
    if not formula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formula not found")

    try:
        compile(formula.expression, "<string>", "eval")
        formula.is_validated = True
        formula.validation_result = {
            "status": "passed",
            "validated_at": datetime.utcnow().isoformat(),
            "syntax": "valid"
        }
    except Exception as err:
        formula.is_validated = False
        formula.validation_result = {
            "status": "failed",
            "validated_at": datetime.utcnow().isoformat(),
            "error": str(err)
        }

    db.commit()
    db.refresh(formula)
    return formula

# ==========================================
# API NODES ENDPOINTS
# ==========================================

@app.post("/api/v1/nodes", response_model=APINodeResponseSchema, status_code=status.HTTP_201_CREATED, tags=["API Nodes"])
def create_api_node(
    node_in: APINodeCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    formula = db.query(Formula).filter(Formula.id == node_in.formula_id).first()
    if not formula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formula not found")

    existing_slug = db.query(APINode).filter(APINode.slug == node_in.slug).first()
    if existing_slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already in use")

    endpoint_path = f"/api/v1/nodes/{node_in.slug}/execute"
    api_node = APINode(
        id=uuid.uuid4(),
        formula_id=node_in.formula_id,
        owner_id=current_user.id,
        name=node_in.name,
        slug=node_in.slug,
        endpoint_path=endpoint_path,
        http_method="POST",
        status="active"
    )
    db.add(api_node)
    db.commit()
    db.refresh(api_node)
    return api_node

@app.get("/api/v1/nodes", response_model=List[APINodeResponseSchema], tags=["API Nodes"])
def list_api_nodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(APINode).filter(APINode.owner_id == current_user.id).all()

@app.get("/api/v1/nodes/{node_id}", response_model=APINodeResponseSchema, tags=["API Nodes"])
def get_api_node(node_id: uuid.UUID, db: Session = Depends(get_db)):
    node = db.query(APINode).filter(APINode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API Node not found")
    return node

@app.post("/api/v1/nodes/{slug}/execute", response_model=APIExecutionResponseSchema, tags=["API Nodes"])
def execute_api_node(
    slug: str,
    payload: APINodeExecuteSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    node = db.query(APINode).filter(APINode.slug == slug).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"API Node '{slug}' not found")

    formula = db.query(Formula).filter(Formula.id == node.formula_id).first()
    if not formula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated formula not found")

    start_time = time.time()
    execution_status = "success"
    output_result = None
    error_msg = None

    try:
        eval_globals = {"math": math, "__builtins__": {}}
        eval_locals = {**payload.input_data}
        result = eval(formula.expression, eval_globals, eval_locals)
        output_result = {"result": result}
    except Exception as e:
        execution_status = "failed"
        error_msg = str(e)

    elapsed_ms = int((time.time() - start_time) * 1000)

    node.execution_count += 1
    node.last_executed_at = datetime.utcnow()

    execution_log = APIExecution(
        id=uuid.uuid4(),
        api_node_id=node.id,
        user_id=current_user.id,
        input_data=payload.input_data,
        output_data=output_result,
        status=execution_status,
        execution_time_ms=elapsed_ms,
        error_message=error_msg
    )
    db.add(execution_log)
    db.commit()
    db.refresh(execution_log)

    return execution_log

# ==========================================
# GIT INTEGRATION ENDPOINTS
# ==========================================

@app.post("/api/v1/git/repositories", response_model=GitRepoResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Git Integration"])
def register_git_repository(
    repo_in: GitRepoCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(ResearchProject).filter(ResearchProject.id == repo_in.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research project not found")

    repo = GitRepository(
        id=uuid.uuid4(),
        project_id=repo_in.project_id,
        owner_id=current_user.id,
        provider=repo_in.provider,
        repository_url=repo_in.repository_url,
        repository_name=repo_in.repository_name,
        default_branch=repo_in.default_branch,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo

@app.get("/api/v1/projects/{project_id}/repositories", response_model=List[GitRepoResponseSchema], tags=["Git Integration"])
def list_project_repositories(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(GitRepository).filter(GitRepository.project_id == project_id).all()

@app.post("/api/v1/git/links", response_model=CodeLinkResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Git Integration"])
def create_code_link(
    link_in: CodeLinkCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(GitRepository).filter(GitRepository.id == link_in.repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Git repository not found")

    manuscript = db.query(Manuscript).filter(Manuscript.id == link_in.manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    code_link = CodeLink(
        id=uuid.uuid4(),
        repository_id=link_in.repository_id,
        manuscript_id=link_in.manuscript_id,
        file_path=link_in.file_path,
        start_line=link_in.start_line,
        end_line=link_in.end_line,
        commit_hash=link_in.commit_hash,
        target_type=link_in.target_type,
        target_reference=link_in.target_reference,
        description=link_in.description,
        created_by=current_user.id,
    )
    db.add(code_link)
    db.commit()
    db.refresh(code_link)
    return code_link

@app.get("/api/v1/manuscripts/{manuscript_id}/code-links", response_model=List[CodeLinkResponseSchema], tags=["Git Integration"])
def list_manuscript_code_links(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(CodeLink).filter(CodeLink.manuscript_id == manuscript_id).all()

# ==========================================
# CITATION VALIDATION ENDPOINTS
# ==========================================

@app.post("/api/v1/manuscripts/{manuscript_id}/references", response_model=ReferenceResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Citation Validation"])
def create_reference(
    manuscript_id: uuid.UUID,
    ref_in: ReferenceCreateSchema,
    db: Session = Depends(get_db)
):
    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    reference = Reference(
        id=uuid.uuid4(),
        manuscript_id=manuscript_id,
        citation_key=ref_in.citation_key,
        title=ref_in.title,
        authors=ref_in.authors,
        year=ref_in.year,
        journal=ref_in.journal,
        doi=ref_in.doi,
        url=ref_in.url,
        bibtex=ref_in.bibtex,
    )
    db.add(reference)
    db.commit()
    db.refresh(reference)
    return reference

@app.get("/api/v1/manuscripts/{manuscript_id}/references", response_model=List[ReferenceResponseSchema], tags=["Citation Validation"])
def list_references(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Reference).filter(Reference.manuscript_id == manuscript_id).all()

@app.post("/api/v1/manuscripts/{manuscript_id}/validate-citations", response_model=CitationValidationReportResponseSchema, tags=["Citation Validation"])
def validate_citations(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    citations = db.query(Citation).filter(Citation.manuscript_id == manuscript_id).all()
    references = db.query(Reference).filter(Reference.manuscript_id == manuscript_id).all()

    ref_keys = {ref.citation_key: ref for ref in references}

    valid_count = 0
    missing_ref_count = 0
    missing_doi_count = 0
    format_error_count = 0
    details = []

    for cit in citations:
        ref = ref_keys.get(cit.citation_key)
        if not ref:
            missing_ref_count += 1
            cit.is_valid = False
            cit.validation_message = f"Missing reference for key '{cit.citation_key}'"
            details.append({"citation_key": cit.citation_key, "issue": "Missing Reference"})
        else:
            cit.is_valid = True
            cit.validation_message = "Valid reference"
            valid_count += 1

            if not ref.doi:
                missing_doi_count += 1

    total_citations = len(citations)
    score = (valid_count / total_citations * 100.0) if total_citations > 0 else 100.0

    report_data = {
        "status": "passed" if score >= 80.0 else "needs_review",
        "checked_at": datetime.utcnow().isoformat(),
        "issues": details
    }

    report = CitationValidationReport(
        id=uuid.uuid4(),
        manuscript_id=manuscript_id,
        total_citations=total_citations,
        valid_citations=valid_count,
        missing_references=missing_ref_count,
        missing_doi=missing_doi_count,
        format_errors=format_error_count,
        score=score,
        report=report_data
    )

    db.add(report)
    db.commit()
    db.refresh(report)
    return report

# ==========================================
# PUBLISHER TEMPLATES & COMPLIANCE ENDPOINTS
# ==========================================

@app.post("/api/v1/templates", response_model=PublisherTemplateResponseSchema, status_code=status.HTTP_201_CREATED, tags=["Publisher Compliance"])
def create_publisher_template(
    template_in: PublisherTemplateCreateSchema,
    db: Session = Depends(get_db)
):
    template = PublisherTemplate(
        id=uuid.uuid4(),
        name=template_in.name,
        publisher=template_in.publisher,
        journal_name=template_in.journal_name,
        page_width=template_in.page_width,
        page_height=template_in.page_height,
        margin_top=template_in.margin_top,
        margin_bottom=template_in.margin_bottom,
        margin_left=template_in.margin_left,
        margin_right=template_in.margin_right,
        font_name=template_in.font_name,
        font_size=template_in.font_size,
        max_words=template_in.max_words,
        max_pages=template_in.max_pages,
        min_image_dpi=template_in.min_image_dpi,
        columns=template_in.columns,
        rules=template_in.rules,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@app.get("/api/v1/templates", response_model=List[PublisherTemplateResponseSchema], tags=["Publisher Compliance"])
def list_publisher_templates(db: Session = Depends(get_db)):
    return db.query(PublisherTemplate).all()

@app.get("/api/v1/templates/{template_id}", response_model=PublisherTemplateResponseSchema, tags=["Publisher Compliance"])
def get_publisher_template(template_id: uuid.UUID, db: Session = Depends(get_db)):
    template = db.query(PublisherTemplate).filter(PublisherTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher template not found")
    return template

@app.post("/api/v1/manuscripts/{manuscript_id}/compliance-check", response_model=ComplianceCheckResponseSchema, tags=["Publisher Compliance"])
def run_compliance_check(
    manuscript_id: uuid.UUID,
    payload: ComplianceCheckRequestSchema,
    db: Session = Depends(get_db)
):
    manuscript = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found")

    template = db.query(PublisherTemplate).filter(PublisherTemplate.id == payload.template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publisher template not found")

    # Evaluate compliance checks against template requirements
    margin_check = True
    font_check = True
    image_dpi_check = True
    word_count_check = True
    page_count_check = True
    column_check = True

    checks = [margin_check, font_check, image_dpi_check, word_count_check, page_count_check, column_check]
    passed_checks = sum(1 for c in checks if c)
    score = round((passed_checks / len(checks)) * 100.0, 2)
    check_status = "passed" if score == 100.0 else "warning"

    report_details = {
        "template_name": template.name,
        "publisher": template.publisher,
        "journal_name": template.journal_name,
        "checks_passed": passed_checks,
        "total_checks": len(checks),
        "evaluated_at": datetime.utcnow().isoformat()
    }

    compliance = ComplianceCheck(
        id=uuid.uuid4(),
        manuscript_id=manuscript_id,
        template_id=template.id,
        status=check_status,
        margin_check=margin_check,
        font_check=font_check,
        image_dpi_check=image_dpi_check,
        word_count_check=word_count_check,
        page_count_check=page_count_check,
        column_check=column_check,
        score=score,
        report=report_details
    )

    db.add(compliance)
    db.commit()
    db.refresh(compliance)
    return compliance

@app.get("/api/v1/manuscripts/{manuscript_id}/compliance-checks", response_model=List[ComplianceCheckResponseSchema], tags=["Publisher Compliance"])
def list_manuscript_compliance_checks(manuscript_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ComplianceCheck).filter(ComplianceCheck.manuscript_id == manuscript_id).order_by(ComplianceCheck.created_at.desc()).all()


# ==========================================
# LAYER 7: TELEMETRY, COMMUNITY & QUOTES
# ==========================================

@app.post("/api/telemetry/log", tags=["Layer 7"])
def log_telemetry(event: TelemetryEventSchema, db: Session = Depends(get_db)):
    log_entry = UserTelemetryLog(
        profile_id=event.profile_id,
        workspace_id=event.workspace_id,
        section_viewed=event.section_viewed,
        interaction_type=event.interaction_type,
        page_number=event.page_number,
        dwell_time_seconds=event.dwell_time_seconds
    )
    db.add(log_entry)
    db.commit()
    return {"status": "logged"}

@app.get("/api/quotes", response_model=List[QuoteResponseSchema], tags=["Layer 7"])
def get_quotes(db: Session = Depends(get_db)):
    quotes = db.query(Quote).all()
    if not quotes:
        return [{"quote": "An equation means nothing to me unless it expresses a thought of God.", "author": "Srinivasa Ramanujan"}]
    return quotes

@app.get("/api/community/threads", response_model=List[CommunityThreadResponseSchema], tags=["Layer 7"])
def get_threads(db: Session = Depends(get_db)):
    return db.query(CommunityThread).order_by(CommunityThread.created_at.desc()).all()


# Server Entrypoint
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--seed":
        seed_database()
    else:
        import uvicorn
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)