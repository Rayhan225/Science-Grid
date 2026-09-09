from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..models.project import ResearchProject
from .deps import get_db, get_current_user

router = APIRouter()


class ProjectIn(BaseModel):
    title: str
    description: str | None = None


class ProjectOut(BaseModel):
    id: str
    owner_id: str | None
    title: str | None
    description: str | None


@router.post("/", response_model=ProjectOut)
def create_project(payload: ProjectIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    proj = ResearchProject(owner_id=current_user.id, title=payload.title, description=payload.description)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return ProjectOut(id=str(proj.id), owner_id=str(proj.owner_id) if proj.owner_id else None, title=proj.title, description=proj.description)


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    q = db.query(ResearchProject).all()
    return [{"id": str(p.id), "title": p.title, "description": p.description} for p in q]


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": str(proj.id), "title": proj.title, "description": proj.description}


@router.put("/{project_id}")
def update_project(project_id: str, payload: ProjectIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    proj = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    # simple ownership check
    if proj.owner_id and str(proj.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    proj.title = payload.title
    proj.description = payload.description
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return {"id": str(proj.id), "title": proj.title, "description": proj.description}


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    proj = db.query(ResearchProject).filter(ResearchProject.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.owner_id and str(proj.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    db.delete(proj)
    db.commit()
    return {"status": "deleted"}
