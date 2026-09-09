from pydantic import BaseModel
from typing import Optional, Dict, Any

class FormulaIn(BaseModel):
    manuscript_id: Optional[str]
    name: str
    expression: str
    description: Optional[str] = None
    variables: Optional[Dict[str, str]] = None

class FormulaOut(BaseModel):
    id: str
    manuscript_id: Optional[str]
    name: str
    expression: str
    description: Optional[str]
    variables: Optional[Dict[str, str]]
    is_validated: bool
    validation_result: Optional[Dict[str, Any]]

class ValidationRequest(BaseModel):
    pass

class ValidationResult(BaseModel):
    status: str
    messages: Optional[list[str]] = None
    details: Optional[Dict[str, Any]] = None
