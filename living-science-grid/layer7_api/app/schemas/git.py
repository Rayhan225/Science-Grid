from pydantic import BaseModel
from typing import Optional

class RepositoryIn(BaseModel):
    project_id: Optional[str] = None
    provider: str
    repository_url: str
    repository_name: Optional[str] = None
    default_branch: Optional[str] = 'main'
    access_token: Optional[str] = None

class RepositoryOut(BaseModel):
    id: str
    provider: str
    repository_url: str
    repository_name: Optional[str]
    default_branch: Optional[str]

class CodeLinkIn(BaseModel):
    manuscript_id: Optional[str] = None
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    commit_hash: Optional[str] = None
    target_type: Optional[str] = None
    target_reference: Optional[str] = None
    description: Optional[str] = None

class CodeLinkOut(BaseModel):
    id: str
    repository_id: str
    manuscript_id: Optional[str]
    file_path: str
    start_line: Optional[int]
    end_line: Optional[int]
    commit_hash: Optional[str]
    description: Optional[str]
