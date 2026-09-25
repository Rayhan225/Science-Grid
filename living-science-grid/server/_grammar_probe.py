from llama_cpp import LlamaGrammar

COMMON = (
    'string ::= "\\"" ( [^"\\\\] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\\""\n'
    'ws ::= ([ \\t\\n] ws)?'
)


def try_g(name, root):
    gbnf = root + "\n" + COMMON
    try:
        gg = LlamaGrammar.from_string(gbnf)
        print(f"[OK]   {name}")
    except Exception as e:
        print(f"[FAIL] {name}: {str(e)[:140].replace(chr(10), ' ')}")


try_g("basic-open-close", 'root ::= "{" ws "}"')
try_g("key-single", 'root ::= "{" ws "\\"concept\\"" ws "}"')
try_g("key-colon-string", 'root ::= "{" ws "\\"concept\\"" ws ":" ws string "}"')
try_g("comma-sep", 'root ::= "{" ws "\\"a\\"" ws ":" ws string " , " ws "\\"b\\"" ws ":" ws string "}"')
try_g("key-via-codepoint", 'root ::= "{" ws "\\u0022concept\\u0022" ws "}"')
try_g("colon-as-char", 'root ::= "{" ws "\\"concept\\"" ws "\\:" ws string "}"')