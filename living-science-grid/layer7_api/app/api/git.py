from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .deps import get_db, get_current_user
from ..services.git_service import GitService
from ..schemas.git import RepositoryIn, RepositoryOut, CodeLinkIn, CodeLinkOut

router = APIRouter()


@router.post('/repositories', response_model=RepositoryOut)
def create_repository(payload: RepositoryIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    repo = GitService.create_repository(db, payload.dict(), current_user.id)
    return RepositoryOut(id=str(repo.id), provider=repo.provider, repository_url=repo.repository_url, repository_name=repo.repository_name, default_branch=repo.default_branch)


@router.get('/repositories')
def list_repositories(db: Session = Depends(get_db)):
    repos = GitService.list_repositories(db)
    return [RepositoryOut(id=str(r.id), provider=r.provider, repository_url=r.repository_url, repository_name=r.repository_name, default_branch=r.default_branch) for r in repos]


@router.post('/repositories/{repo_id}/links', response_model=CodeLinkOut)
def create_code_link(repo_id: str, payload: CodeLinkIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # ensure repository exists
    from ..models.git_repository import GitRepository
    repo = db.query(GitRepository).filter(GitRepository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail='Repository not found')
    cl = GitService.create_code_link(db, repo_id, payload.dict(), current_user.id)
    return CodeLinkOut(id=str(cl.id), repository_id=str(cl.repository_id), manuscript_id=str(cl.manuscript_id) if cl.manuscript_id else None, file_path=cl.file_path, start_line=cl.start_line, end_line=cl.end_line, commit_hash=cl.commit_hash, description=cl.description)


@router.get('/repositories/{repo_id}/links')
def list_code_links(repo_id: str, db: Session = Depends(get_db)):
    links = GitService.list_code_links(db, repo_id)
    return [CodeLinkOut(id=str(l.id), repository_id=str(l.repository_id), manuscript_id=str(l.manuscript_id) if l.manuscript_id else None, file_path=l.file_path, start_line=l.start_line, end_line=l.end_line, commit_hash=l.commit_hash, description=l.description) for l in links]


@router.delete('/code-links/{link_id}')
def delete_code_link(link_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ok = GitService.delete_code_link(db, link_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail='Code link not found or not authorized')
    return {'status': 'deleted'}
