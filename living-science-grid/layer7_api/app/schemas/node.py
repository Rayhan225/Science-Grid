from pydantic import BaseModel
from typing import Optional, Dict, Any

class NodeIn(BaseModel):
    formula_id: Optional[str] = None
    name: str
    is_public: Optional[bool] = False

class NodeOut(BaseModel):
    id: str
    slug: str
    name: str
    formula_id: Optional[str]
    owner_id: Optional[str]
    status: Optional[str]

class ExecuteIn(BaseModel):
    input: Dict[str, Any]

class ExecuteOut(BaseModel):
    status: str
    result: Optional[Any]
    execution_time_ms: Optional[int]
    messages: Optional[list[str]] = None
