import re
from typing import List, Dict, Any
from urllib.parse import urlparse

DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.IGNORECASE)
URL_RE = re.compile(r"https?://[\w\-./?%&=+#~]+", re.IGNORECASE)
ARXIV_RE = re.compile(r"(arXiv:)?\d{4}\.\d{4,5}(v\d+)?", re.IGNORECASE)


class CitationService:
    @staticmethod
    def _is_valid_doi(doi: str) -> bool:
        return bool(DOI_RE.search(doi))

    @staticmethod
    def _is_valid_url(url: str) -> bool:
        try:
            p = urlparse(url)
            return p.scheme in ('http', 'https') and bool(p.netloc)
        except Exception:
            return False

    @staticmethod
    def find_citations(text: str) -> List[Dict[str, Any]]:
        found: List[Dict[str, Any]] = []
        # DOIs
        for m in DOI_RE.finditer(text):
            doi = m.group(0)
            found.append({'type': 'doi', 'value': doi, 'valid': CitationService._is_valid_doi(doi)})
        # arXiv
        for m in ARXIV_RE.finditer(text):
            arxiv = m.group(0)
            found.append({'type': 'arxiv', 'value': arxiv, 'valid': True})
        # URLs
        for m in URL_RE.finditer(text):
            url = m.group(0)
            found.append({'type': 'url', 'value': url, 'valid': CitationService._is_valid_url(url)})
        return found

    @staticmethod
    def validate_reference_list(text: str) -> Dict[str, Any]:
        citations = CitationService.find_citations(text)
        issues = []
        for c in citations:
            if not c.get('valid'):
                issues.append({'citation': c, 'issue': 'Invalid format or unreachable'})
        return {'count': len(citations), 'citations': citations, 'issues': issues}
