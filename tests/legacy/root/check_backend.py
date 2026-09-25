import ast, re

with open('research_brain/latex_studio.py', 'r', encoding='utf-8') as f:
    src = f.read()

ast.parse(src)
print('Syntax OK')

routes = re.findall(r'@router\.(get|post|put|patch|delete)\("([^"]+)"', src)
for method, route in routes:
    print(f"  {method.upper():6} {route}")
