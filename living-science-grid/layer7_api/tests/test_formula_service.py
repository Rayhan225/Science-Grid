from backend.app.services.formula_service import FormulaService


def test_validate_balanced_parentheses():
    expr = "(a + b) * (c - d)"
    res = FormulaService.validate_expression(expr)
    assert res["is_valid"] is True
    assert res["errors"] == []
    assert "a" in res["variables"]


def test_validate_unmatched_parentheses():
    expr = "(a + b * (c - d)"
    res = FormulaService.validate_expression(expr)
    assert res["is_valid"] is False
    assert any("Unmatched" in e for e in res["errors"])


def test_validate_illegal_char():
    expr = "a + b + $illegal"
    res = FormulaService.validate_expression(expr)
    assert res["is_valid"] is False
    assert any("Illegal character" in e for e in res["errors"])
