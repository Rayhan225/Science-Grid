import re
from collections import Counter

text = open('src/data/authenticTemplates.js', encoding='utf-8').read()
rankings = re.findall(r'"ranking":\s*"([^"]+)"', text)
categories = re.findall(r'"category":\s*"([^"]+)"', text)
print(f"Total entries: {len(rankings)}")
print("Rankings breakdown:", Counter(rankings))
layout_styles = re.findall(r'"layout_style":\s*"([^"]+)"', text)
print("Layout styles breakdown:", Counter(layout_styles))

# Cross tabulation: for each category, how many Q1, Q2, Q3, Q4?
import json
# Let's extract each template block
templates = []
for block in re.split(r'\{\s*"id":', text)[1:]:
    cat_match = re.search(r'"category":\s*"([^"]+)"', block)
    rank_match = re.search(r'"ranking":\s*"([^"]+)"', block)
    name_match = re.search(r'"name":\s*"([^"]+)"', block)
    if cat_match and rank_match:
        templates.append({
            'name': name_match.group(1) if name_match else '',
            'category': cat_match.group(1),
            'ranking': rank_match.group(1)
        })

print(f"\nTotal parsed: {len(templates)}")
by_cat_and_rank = {}
for t in templates:
    key = (t['category'], t['ranking'])
    by_cat_and_rank[key] = by_cat_and_rank.get(key, 0) + 1

for cat in sorted(set(t['category'] for t in templates)):
    q1 = by_cat_and_rank.get((cat, 'Q1 Journals'), 0)
    q2 = by_cat_and_rank.get((cat, 'Q2 Journals'), 0)
    q3 = by_cat_and_rank.get((cat, 'Q3 Journals'), 0)
    q4 = by_cat_and_rank.get((cat, 'Q4 Journals'), 0)
    print(f"{cat}: Q1={q1}, Q2={q2}, Q3={q3}, Q4={q4}")
