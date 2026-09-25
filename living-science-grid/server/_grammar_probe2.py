import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llama_cpp import LlamaGrammar
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
open("_gen_grammar.txt", "w", encoding="utf-8").write(g)

STR_RULE = (
    'string ::= "\\"" ( [^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\\""\n'
    'ws ::= ([ \\t\\n] ws)?'
)

def try_g(name, gbnf):
    try:
        LlamaGrammar.from_string(gbnf)
        print(f"[OK]   {name}")
    except Exception as e:
        print(f"[FAIL] {name}: {str(e)[:120].replace(chr(10), ' ')}")

try_g("as-generated", g)
try_g("spaces-joined", " ".join(g.split()))
try_g("rules-reversed(value-first)", "\n".join(reversed(g.split("\n"))))

keys = list(SCHEMA.keys())
# root body on one line, all string values
one_line_root = 'root ::= "{" ws ' + " ".join(
    f'"\\"{k}\\"" ws ":" ws string' + (' " , "' if i < len(keys) - 1 else ' "}"')
    for i, k in enumerate(keys)
)
try_g("root-single-line-keys", one_line_root + "\n" + STR_RULE)

# root body multi-line, all string values
parts = ['root ::= "{" ws']
for i, k in enumerate(keys):
    sep = '" , "' if i < len(keys) - 1 else '"}"'
    parts.append(f'"\\"{k}\\"" ws ":" ws string {sep}')
try_g("root-multiline-keys", "\n".join(parts) + "\n" + STR_RULE)