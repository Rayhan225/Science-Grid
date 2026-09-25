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
g = slm_engine.build_schema_grammar(SCHEMA)

llm = Llama(model_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "llama-3.2-3b-instruct.Q5_K_M.gguf"),
            n_ctx=1024, n_threads=16, n_gpu_layers=0, verbose=False, seed=42)

def run_case(name, gbnf):
    t0 = time.time()
    try:
        gg = LlamaGrammar.from_string(gbnf)
        out = llm("json please", max_tokens=14, temperature=0.0, grammar=gg)
        txt = out["choices"][0]["text"].replace("\n", " ")
        print(f"[OK]   {name:<26} {round(time.time()-t0,1)}s -> {txt[:45]!r}")
    except Exception as e:
        print(f"[FAIL] {name:<26} {str(e)[:80].replace(chr(10), ' ')}")

run_case("built-multiline", g)
run_case("built-singleline", " ".join(g.split()))
run_case("built-nonl-nointbool", " ".join(g.split()).replace('integer ::= "-"? "0" | [1-9] [0-9]* ', "").replace('boolean ::= "true" | "false" ', ""))