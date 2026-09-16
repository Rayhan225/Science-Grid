import os
import re

endpoints_frontend = set()
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                c = f.read()
            # match /api/...
            matches = re.findall(r'(/api/[a-zA-Z0-9_\-\/]+)', c)
            for m in matches:
                # remove trailing punctuation if any
                clean = m.rstrip('$,;)}`"\'')
                if clean.startswith('/api/'):
                    endpoints_frontend.add(clean)

with open(r'research_brain/main.py', 'r', encoding='utf-8') as f:
    main_code = f.read()

print(f"Total distinct frontend endpoints found: {len(endpoints_frontend)}")
missing = []
for ep in sorted(endpoints_frontend):
    # Check if exact endpoint or prefix is defined in main.py
    if ep in main_code:
        status = "EXACT"
    else:
        parts = ep.strip('/').split('/')
        prefix = '/' + '/'.join(parts[:3])
        if prefix in main_code:
            status = f"PREFIX ({prefix})"
        else:
            status = "MISSING"
            missing.append(ep)
    print(f"{ep:<50} : {status}")

print(f"\nMissing count: {len(missing)}")
for m in missing:
    print(" - ", m)
