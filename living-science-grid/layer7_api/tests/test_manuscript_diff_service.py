from backend.app.services.manuscript_diff_service import ManuscriptDiffService


def test_unified_diff_counts_and_text():
    old = "Line one\nLine two\nLine three"
    new = "Line one\nLine 2 modified\nLine three\nLine four added"
    res = ManuscriptDiffService.compute_unified_diff(old, new, fromfile='old.txt', tofile='new.txt')
    assert 'Line 2 modified' in res['diff']
    # one insertion (Line four) and one replacement counts as one insertion and one deletion
    assert res['insertions'] >= 1
    assert res['deletions'] >= 1


def test_structured_changes_contains_opcodes():
    old = "A\nB\nC\nD"
    new = "A\nB changed\nC\nE"
    changes = ManuscriptDiffService.compute_structured_changes(old, new)
    assert isinstance(changes, list)
    assert any(c['tag'] in ('replace', 'insert', 'delete') for c in changes)
