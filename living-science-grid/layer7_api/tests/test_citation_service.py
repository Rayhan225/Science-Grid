from backend.app.services.citation_service import CitationService


def test_find_doi_and_url_and_arxiv():
    text = "This paper cites DOI 10.1000/xyz123 and also references https://example.com and arXiv:2101.00001v2"
    found = CitationService.find_citations(text)
    types = {c['type'] for c in found}
    assert 'doi' in types
    assert 'url' in types
    assert 'arxiv' in types


def test_validate_reference_list_invalid():
    text = "Broken DOI 10.abc/123 and badurl htt://nope"
    res = CitationService.validate_reference_list(text)
    assert res['count'] >= 0
    assert isinstance(res['issues'], list)
