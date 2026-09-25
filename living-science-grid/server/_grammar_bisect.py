import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llama_cpp import Llama, LlamaGrammar
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

g_full = slm_engine.build_schema_grammar(SCHEMA)

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

def run_case(name, gbnf):
    t0 = time.time()
    try:
        g = LlamaGrammar.from_string(gbnf)
        out = llm("json please", max_tokens=40, temperature=0.0, grammar=g)
        txt = out["choices"][0]["text"].replace("\n", " ")
        print(f"[OK]   {name:<24} {round(time.time()-t0,1)}s -> {txt[:50]!r}")
    except Exception as e:
        print(f"[FAIL] {name:<24} {str(e)[:90].replace(chr(10), ' ')}")

llm = Llama(model_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "llama-3.2-3b-instruct.Q5_K_M.gguf"),
            n_ctx=1024, n_threads=16, n_gpu_layers=0, verbose=False, seed=42)

run_case("full-built", g_full)
run_case("root+COMMON", ROOT + COMMON)
run_case("no-integer-bool", ROOT + COMMON.replace('boolean ::= "true" | "false"\n', "").replace('integer ::= "-"? "0" | [1-9] [0-9]*\n', ""))
run_case("root-only-string-vals", (ROOT + COMMON).replace('"\\"variables\\"" ws ":" ws value " , " ws', '"\\"variables\\"" ws ":" ws string " , " ws'))