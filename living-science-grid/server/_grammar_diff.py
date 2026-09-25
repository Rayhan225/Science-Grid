import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slm_engine

SCHEMA = {
    "concept": "string",
    "rating": "string",
    "critique": "string",
    "alternatives": "string",
    "variables": "any",
    "python_code": "string",
    "eval_expr": "string",
}
g = slm_engine.build_schema_grammar(SCHEMA)
print("== repr of built grammar ==")
print(repr(g))
print()
print("== repr of hand ROOT+COMMON (from bisect) ==")
COMMON = """
value ::= object | array | string | number | ("true" | "false" | "null") ws
object ::= "{" ws ( string ":" ws value ("," ws string ":" ws value)* )? "}"
array ::= "[" ws ( value ("," ws value)* )? "]"
string ::= "\\"" ( [^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\\""
number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?
ws ::= ([ \\t\\n] ws)?
"""
ROOT = (
    'root ::= "{" ws '
    '"\\"concept\\"" ws ":" ws string " , " ws '
    '"\\"rating\\"" ws ":" ws string " , " ws '
    '"\\"critique\\"" ws ":" ws string " , " ws '
    '"\\"alternatives\\"" ws ":" ws string " , " ws '
    '"\\"variables\\"" ws ":" ws value " , " ws '
    '"\\"python_code\\"" ws ":" ws string " , " ws '
    '"\\"eval_expr\\"" ws ":" ws string "}"'
)
print(repr(ROOT + COMMON))
print()
print("== char diff ==")
import difflib
a = g.splitlines()
# normalize built to single line for comparison
b = (ROOT + COMMON).splitlines()
for line in difflib.unified_diff(a, b, lineterm=""):
    print(repr(line))