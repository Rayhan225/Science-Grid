from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..api.deps import get_db, get_current_user
from ..services.formula_service import FormulaService
from ..schemas.formula import FormulaIn, FormulaOut, ValidationResult
from ..models.formula import Formula

router = APIRouter(tags=["formulas"])

@router.post("/validate", response_model=ValidationResult)
def validate_formula(req: FormulaIn):
    res = FormulaService.validate_expression(req.expression)
    status = "ok" if res["is_valid"] else "invalid"
    return {"status": status, "messages": res.get("errors", []), "details": {"variables": res.get("variables")}}

@router.post("/", response_model=FormulaOut)
def create_formula(req: FormulaIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    f = FormulaService.create_from_in(db, req.dict(), current_user.id)
    return {
        "id": str(f.id),
        "manuscript_id": str(f.manuscript_id) if f.manuscript_id else None,
        "name": f.name,
        "expression": f.expression,
        "description": f.description,
        "variables": f.variables,
        "is_validated": f.is_validated,
        "validation_result": f.validation_result
    }

@router.get("/{formula_id}")
def get_formula(formula_id: str, db: Session = Depends(get_db)):
    f = db.query(Formula).filter(Formula.id == formula_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formula not found")
    return {
        "id": str(f.id),
        "manuscript_id": str(f.manuscript_id) if f.manuscript_id else None,
        "name": f.name,
        "expression": f.expression,
        "description": f.description,
        "variables": f.variables,
        "is_validated": f.is_validated,
        "validation_result": f.validation_result
    }
