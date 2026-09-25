# Test: grammar with TWO length-capped string rules + standard support rules survives
# llama.cpp 0.3.35 compilation and sampling.
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "living-science-grid", "server"))
import slm_engine

gbnf = (
    'root ::= "{" ws "\\"title\\"" ws ":" ws string_small ws " , " ws "\\"code\\"" ws ":" ws string_big ws "}"\n'
    'string_small ::= "\\"" ( valchar {0,30} ) "\\""\n'
    'string_big ::= "\\"" ( valchar {0,120} ) "\\""\n'
    'valchar ::= [^"\\\\\\n\\r\\t] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])\n'
    'number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?\n'
    'ws ::= ([ \\t\\n] ws)?\n'
)
grammar = slm_engine._compile_grammar(gbnf)
print("grammar compiled:", grammar is not None)
t0 = time.time()
try:
    out = slm_engine.generate(
        prompt='Write JSON with a short title and a medium-length code snippet.',
        system_prompt='Be terse.', max_tokens=256, force_json=False, grammar=gbnf)
    print(f"OK {time.time()-t0:.1f}s out={out!r}")
except Exception as e:
    print(f"FAIL {time.time()-t0:.1f}s {type(e).__name__}: {e}")
    sys.exit(2)
sys.exit(0)