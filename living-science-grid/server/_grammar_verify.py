import sys, os, time, json
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
print("== grammar ==")
print(g)
llm = Llama(model_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "llama-3.2-3b-instruct.Q5_K_M.gguf"),
            n_ctx=4096, n_threads=16, n_gpu_layers=0, verbose=False, seed=42)

CONCISE = '''Mathematical analysis of: Sigmoid Activation, formula $$ \\sigma(x) = \\frac{1}{1 + e^{-x}} $$ (logistic sigmoid, maps R to (0,1)).
Return ONLY the JSON object with these exact keys and order. Be concise: strings under 160 characters, variables list with exactly 2 items. Output nothing else.'''
t0 = time.time()
try:
    gg = LlamaGrammar.from_string(g)
    out = llm("""<|start_header_id|>system<|end_header_id|>

You are a precise academic mathematician. Output ONLY valid JSON. Be concise.<|eot_id|><|start_header_id|>user<|end_header_id|>

Mathematical analysis of: Sigmoid Activation, formula $$ \\sigma(x) = \\frac{1}{1 + e^{-x}} $$ (logistic sigmoid, maps R to (0,1)).
Return ONLY the JSON object with these exact keys and order: concept (string), rating (string), critique (string), alternatives (string), variables (array of objects with symbol,label,default,min,max,step,effect), python_code (string), eval_expr (string). Be concise; strings under 160 characters.<|eot_id|><|start_header_id|>assistant<|end_header_id|>

""", max_tokens=700, temperature=0.0, grammar=gg)
    txt = out["choices"][0]["text"]
    dt = time.time() - t0
    try:
        p = json.loads(txt)
        print(f"[RESULT] {round(dt,1)}s PARSE OK keys={list(p.keys())} lens={{concept:{len(str(p.get('concept','')))} critique:{len(str(p.get('critique','')))} py:{len(str(p.get('python_code','')))}}}")
        print("  vars:", len(p.get("variables") or []))
        print("  eval_expr:", p.get("eval_expr"))
    except Exception as e:
        print(f"[RESULT] {round(dt,1)}s PARSE FAIL: {str(e)[:100]}")
        print("  HEAD:", txt[:160].replace(chr(10), " "))
        print("  TAIL:", txt[-160:].replace(chr(10), " "))
except Exception as e:
    print("[ERROR]", str(e)[:200])