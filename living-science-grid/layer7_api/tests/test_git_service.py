import os
from cryptography.fernet import Fernet
from unittest.mock import patch

from backend.app.services.git_service import GitService
from backend.app.services.github_service import GitHubService


def test_encrypt_decrypt_roundtrip(monkeypatch):
    key = Fernet.generate_key().decode()
    monkeypatch.setenv('ENCRYPTION_KEY', key)
    token = 's3cr3t'
    enc = GitService.encrypt_token(token)
    assert isinstance(enc, str) and enc != token
    dec = GitService.decrypt_token(enc)
    assert dec == token


def test_create_repository_with_github_adapter(monkeypatch):
    # set encryption key
    key = Fernet.generate_key().decode()
    monkeypatch.setenv('ENCRYPTION_KEY', key)

    # mock GitHubService.get_repo_info to return metadata
    meta = {
        'repository_name': 'octocat/Hello-World',
        'default_branch': 'main',
        'repository_url': 'https://github.com/octocat/Hello-World'
    }

    with patch.object(GitHubService, 'get_repo_info', return_value=meta):
        # monkeypatch the ORM model used in the service to a plain Python class
        import backend.app.services.git_service as git_service_module

        class SimpleRepo:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        monkeypatch.setattr(git_service_module, 'GitRepository', SimpleRepo)

        # simple dummy DB that accepts add/commit/refresh calls
        class DummyDB:
            def add(self, obj):
                self.added = obj

            def commit(self):
                pass

            def refresh(self, obj):
                pass

        db = DummyDB()

        data = {
            'provider': 'github',
            'repository_url': 'https://github.com/octocat/Hello-World',
            'access_token': 'tok-123',
        }
        owner_id = 'owner-1'
        repo = GitService.create_repository(db, data, owner_id)

        # ensure metadata filled
        assert repo.repository_name == 'octocat/Hello-World'
        assert repo.default_branch == 'main'
        assert repo.repository_url == 'https://github.com/octocat/Hello-World'

        # encrypted token present
        assert repo.access_token_encrypted is not None

        # decrypt and verify
        dec = GitService.decrypt_token(repo.access_token_encrypted)
        assert dec == 'tok-123'
