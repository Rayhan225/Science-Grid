import os
from cryptography.fernet import Fernet, InvalidToken
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models.git_repository import GitRepository
from ..models.code_link import CodeLink
from .github_service import GitHubService

class GitService:
    @staticmethod
    def _get_fernet():
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            raise RuntimeError('ENCRYPTION_KEY not set in environment; cannot encrypt tokens')
        return Fernet(key)

    @staticmethod
    def encrypt_token(token: str) -> str:
        f = GitService._get_fernet()
        return f.encrypt(token.encode()).decode()

    @staticmethod
    def decrypt_token(enc: str) -> str:
        f = GitService._get_fernet()
        try:
            return f.decrypt(enc.encode()).decode()
        except InvalidToken:
            raise RuntimeError('Invalid encryption token')

    @staticmethod
    def create_repository(db: Session, data: Dict[str, Any], owner_id: str) -> GitRepository:
        token = data.get('access_token')
        enc = None
        # provider-specific validation and metadata enrichment
        provider = (data.get('provider') or '').lower()
        if provider == 'github':
            try:
                info = GitHubService.get_repo_info(data.get('repository_url'), token)
                # fill missing metadata
                if not data.get('repository_name'):
                    data['repository_name'] = info.get('repository_name')
                if not data.get('default_branch'):
                    data['default_branch'] = info.get('default_branch')
                # normalize URL
                data['repository_url'] = info.get('repository_url') or data.get('repository_url')
            except Exception as e:
                # do not fail creation solely on metadata fetch; log in real app
                pass
        if token:
            enc = GitService.encrypt_token(token)
        repo = GitRepository(
            project_id=data.get('project_id'),
            owner_id=owner_id,
            provider=data.get('provider'),
            repository_url=data.get('repository_url'),
            repository_name=data.get('repository_name'),
            default_branch=data.get('default_branch'),
            access_token_encrypted=enc
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
        return repo

    @staticmethod
    def list_repositories(db: Session):
        return db.query(GitRepository).all()

    @staticmethod
    def create_code_link(db: Session, repository_id: str, data: Dict[str, Any], user_id: str) -> CodeLink:
        cl = CodeLink(
            repository_id=repository_id,
            manuscript_id=data.get('manuscript_id'),
            file_path=data.get('file_path'),
            start_line=data.get('start_line'),
            end_line=data.get('end_line'),
            commit_hash=data.get('commit_hash'),
            target_type=data.get('target_type'),
            target_reference=data.get('target_reference'),
            description=data.get('description'),
            created_by=user_id
        )
        db.add(cl)
        db.commit()
        db.refresh(cl)
        return cl

    @staticmethod
    def list_code_links(db: Session, repository_id: str):
        return db.query(CodeLink).filter(CodeLink.repository_id == repository_id).all()

    @staticmethod
    def delete_code_link(db: Session, link_id: str, user_id: str) -> bool:
        cl = db.query(CodeLink).filter(CodeLink.id == link_id).first()
        if not cl:
            return False
        # allow owner or creator to delete
        if cl.created_by and str(cl.created_by) != str(user_id):
            return False
        db.delete(cl)
        db.commit()
        return True
