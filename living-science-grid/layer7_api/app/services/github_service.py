import re
import requests
from typing import Dict


class GitHubService:
    @staticmethod
    def _parse_repo_url(url: str) -> tuple[str, str]:
        # handle formats: git@github.com:owner/repo.git or https://github.com/owner/repo(.git)
        if url.startswith('git@'):
            m = re.match(r'git@[^:]+:([^/]+)/([^/.]+)(?:\.git)?', url)
            if m:
                owner = m.group(1)
                repo = m.group(2)
                if repo.endswith('.git'):
                    repo = repo[:-4]
                return owner, repo
        else:
            m = re.match(r'https?://[^/]+/([^/]+)/([^/]+)', url)
            if m:
                owner = m.group(1)
                repo = m.group(2)
                if repo.endswith('.git'):
                    repo = repo[:-4]
                return owner, repo
        raise ValueError('Unable to parse GitHub repo URL')

    @staticmethod
    def get_repo_info(repo_url: str, token: str) -> Dict[str, str]:
        owner, repo = GitHubService._parse_repo_url(repo_url)
        api_url = f'https://api.github.com/repos/{owner}/{repo}'
        headers = {'Accept': 'application/vnd.github+json'}
        if token:
            headers['Authorization'] = f'token {token}'
        resp = requests.get(api_url, headers=headers, timeout=10)
        if resp.status_code != 200:
            raise RuntimeError(f'GitHub API error: {resp.status_code} - {resp.text}')
        data = resp.json()
        return {
            'repository_name': data.get('full_name'),
            'default_branch': data.get('default_branch'),
            'repository_url': data.get('html_url')
        }
