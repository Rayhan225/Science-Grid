from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..models.manuscript import Manuscript
from .deps import get_db, get_current_user
from ..models.manuscript_version import ManuscriptVersion
from fastapi import UploadFile, File
import uuid
import datetime

router = APIRouter()


class ManuscriptIn(BaseModel):
    project_id: str | None
    title: str


@router.post("/")
def create_manuscript(payload: ManuscriptIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ms = Manuscript(project_id=payload.project_id, title=payload.title)
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return {"id": str(ms.id), "title": ms.title}


@router.get("/{manuscript_id}")
def get_manuscript(manuscript_id: str, db: Session = Depends(get_db)):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return {"id": str(ms.id), "title": ms.title, "project_id": str(ms.project_id) if ms.project_id else None}


@router.post("/{manuscript_id}/versions")
def add_version(manuscript_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ms = db.query(Manuscript).filter(Manuscript.id == manuscript_id).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    # placeholder: do not save file to disk in this prototype
    version_number = db.query(ManuscriptVersion).filter(ManuscriptVersion.manuscript_id == manuscript_id).count() + 1
    content_hash = uuid.uuid4().hex
    file_path = f"/data/manuscripts/{manuscript_id}/v{version_number}/{file.filename}"
    mv = ManuscriptVersion(manuscript_id=ms.id, version_number=version_number, file_path=file_path, content_hash=content_hash, created_by=current_user.id, created_at=datetime.datetime.now(datetime.timezone.utc))
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return {"id": str(mv.id), "version": mv.version_number, "file_path": mv.file_path}


@router.get("/{manuscript_id}/versions")
def list_versions(manuscript_id: str, db: Session = Depends(get_db)):
    versions = db.query(ManuscriptVersion).filter(ManuscriptVersion.manuscript_id == manuscript_id).order_by(ManuscriptVersion.version_number).all()
    return [{"id": str(v.id), "version": v.version_number, "file_path": v.file_path, "created_at": v.created_at.isoformat()} for v in versions]
