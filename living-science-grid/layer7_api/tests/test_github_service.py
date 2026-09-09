from unittest.mock import patch
from backend.app.services.github_service import GitHubService


class DummyResp:
    def __init__(self, status_code=200, json_data=None, text=''):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text

    def json(self):
        return self._json


def test_parse_repo_url_https():
    owner, repo = GitHubService._parse_repo_url('https://github.com/octocat/Hello-World.git')
    assert owner == 'octocat' and repo == 'Hello-World'


def test_get_repo_info_success():
    sample = {'full_name': 'octocat/Hello-World', 'default_branch': 'main', 'html_url': 'https://github.com/octocat/Hello-World'}

    with patch('backend.app.services.github_service.requests.get') as mock_get:
        mock_get.return_value = DummyResp(200, sample)
        info = GitHubService.get_repo_info('https://github.com/octocat/Hello-World', token='tok')
        assert info['repository_name'] == 'octocat/Hello-World'
        assert info['default_branch'] == 'main'
        assert info['repository_url'] == 'https://github.com/octocat/Hello-World'


def test_get_repo_info_not_found():
    with patch('backend.app.services.github_service.requests.get') as mock_get:
        mock_get.return_value = DummyResp(404, {}, text='Not Found')
        try:
            GitHubService.get_repo_info('https://github.com/does/notexist', token=None)
            assert False, 'expected RuntimeError'
        except RuntimeError:
            pass
