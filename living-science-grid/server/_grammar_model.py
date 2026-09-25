import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llama_cpp import Llama, LlamaGrammar

STR = 'string ::= "\\"" ( [^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\\""'
WS = 'ws ::= ([ \\t\\n] ws)?'

CASES = {
    "open-close": 'root ::= "{" ws "}"',
    "escaped-key": 'root ::= "{" ws "\\"a\\"" ws "}"',
    "key-colon-string": 'root ::= "{" ws "\\"a\\"" ws ":" ws string "}"',
    "key-comma-sep": 'root ::= "{" ws "\\"a\\"" ws ":" ws string " , " ws "\\"b\\"" ws ":" ws string "}"',
    "literal-pipe": 'root ::= "{" ws ( "\\"a\\"" | "\\"b\\"" ) "}"',
    "space-char-class-sep": 'root ::= "{" ws "\\"a\\"" ws ":" ws string [ \\t\\n] "," ws "\\"b\\"" ws ":" ws string "}"',
}

llm = Llama(model_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "llama-3.2-3b-instruct.Q5_K_M.gguf"),
            n_ctx=1024, n_threads=16, n_gpu_layers=0, verbose=False, seed=42)

for name, root in CASES.items():
    gbnf = root + "\n" + STR + "\n" + WS
    t0 = time.time()
    try:
        g = LlamaGrammar.from_string(gbnf)
        out = llm("say x", max_tokens=6, temperature=0.0, grammar=g)
        txt = out["choices"][0]["text"].replace("\n", " ")
        print(f"[OK]   {name:<22} {round(time.time()-t0,1)}s -> {txt[:40]!r}")
    except Exception as e:
        print(f"[FAIL] {name:<22} {str(e)[:100].replace(chr(10), ' ')}")