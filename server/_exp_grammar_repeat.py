# Test whether GBNF repetition operators {m,n} are supported by this llama.cpp build.
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "living-science-grid", "server"))
import slm_engine

# Bounded string rule using {0,40} repetition. If unsupported, llama.cpp typically
# prints a grammar parse error and may abort.
gbnf = r'''root ::= "{\"ws" "\"word\"" ws ":" ws string ws "}"
string ::= "\"" ( [^"\\\n\r\t] {0,40} ) "\""
ws ::= ([ \t\n] ws)?
'''
grammar = slm_engine._compile_grammar(gbnf)
print("grammar compiled:", grammar is not None)
t0 = time.time()
try:
    out = slm_engine.generate(prompt='Say a single short word, then stop.', system_prompt='Be terse.', max_tokens=128, force_json=False, grammar=gbnf)
    print(f"OK {time.time()-t0:.1f}s out={out!r}")
except Exception as e:
    print(f"FAIL {time.time()-t0:.1f}s {type(e).__name__}: {e}")
    sys.exit(2)
sys.exit(0)