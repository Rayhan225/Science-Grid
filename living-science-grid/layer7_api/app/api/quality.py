from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..services.manuscript_diff_service import ManuscriptDiffService
from ..services.citation_service import CitationService
from ..services.publisher_compliance_service import PublisherComplianceService
from ..database.database import SessionLocal

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post('/diff')
def compute_diff(payload: dict):
    old = payload.get('old', '')
    new = payload.get('new', '')
    res = ManuscriptDiffService.compute_unified_diff(old, new)
    return res


@router.post('/diff/structured')
def structured_diff(payload: dict):
    old = payload.get('old', '')
    new = payload.get('new', '')
    return ManuscriptDiffService.compute_structured_changes(old, new)


@router.post('/citations/validate')
def validate_citations(payload: dict):
    text = payload.get('text', '')
    return CitationService.validate_reference_list(text)


@router.post('/publisher/check')
def publisher_check(payload: dict):
    text = payload.get('text', '')
    images = payload.get('images', [])
    rules = payload.get('rules', {})
    return PublisherComplianceService.run_compliance_checks(text, images, rules)
