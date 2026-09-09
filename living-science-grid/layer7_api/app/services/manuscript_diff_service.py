from difflib import unified_diff, SequenceMatcher
from typing import List, Dict, Any


class ManuscriptDiffService:
    @staticmethod
    def compute_unified_diff(old_text: str, new_text: str, fromfile: str = 'old', tofile: str = 'new') -> Dict[str, Any]:
        a_lines = old_text.splitlines()
        b_lines = new_text.splitlines()
        diff_lines = list(unified_diff(a_lines, b_lines, fromfile=fromfile, tofile=tofile, lineterm=''))
        diff_text = '\n'.join(diff_lines)
        insertions = sum(1 for l in diff_lines if l.startswith('+') and not l.startswith('+++'))
        deletions = sum(1 for l in diff_lines if l.startswith('-') and not l.startswith('---'))
        return {
            'diff': diff_text,
            'insertions': insertions,
            'deletions': deletions,
        }

    @staticmethod
    def compute_structured_changes(old_text: str, new_text: str) -> List[Dict[str, Any]]:
        a_lines = old_text.splitlines()
        b_lines = new_text.splitlines()
        sm = SequenceMatcher(a=old_text, b=new_text)
        ops = sm.get_opcodes()
        changes: List[Dict[str, Any]] = []
        for tag, a0, a1, b0, b1 in ops:
            changes.append({
                'tag': tag,
                'a_start': a0,
                'a_end': a1,
                'b_start': b0,
                'b_end': b1,
                'a_text': '\n'.join(a_lines[a0:a1]),
                'b_text': '\n'.join(b_lines[b0:b1]),
            })
        return changes
