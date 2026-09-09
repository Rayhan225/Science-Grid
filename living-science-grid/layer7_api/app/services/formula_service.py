from typing import Dict, Any
from ..models.formula import Formula
from ..models.manuscript import Manuscript

class FormulaService:
    @staticmethod
    def validate_expression(expr: str) -> Dict[str, Any]:
        # Lightweight static checks: balanced parentheses, allowed chars, simple safety
        errors = []
        stack = []
        allowed_chars = set("0123456789.+-*/() %abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_,")
        for ch in expr:
            if ch not in allowed_chars:
                errors.append(f"Illegal character: {ch}")
        for i,ch in enumerate(expr):
            if ch == '(':
                stack.append(i)
            elif ch == ')':
                if not stack:
                    errors.append("Unmatched closing parenthesis")
                else:
                    stack.pop()
        if stack:
            errors.append("Unmatched opening parenthesis")
        # naive variable detection
        import re
        vars = set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", expr))
        # exclude known function names like sin, cos, log for now
        return {
            "errors": errors,
            "variables": list(vars),
            "is_valid": len(errors) == 0
        }

    @staticmethod
    def create_from_in(db, data: Dict[str, Any], user_id: str) -> Formula:
        f = Formula(
            manuscript_id=data.get("manuscript_id"),
            name=data["name"],
            expression=data["expression"],
            description=data.get("description"),
            variables=data.get("variables") or {},
            is_validated=False,
            validation_result={}
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return f
