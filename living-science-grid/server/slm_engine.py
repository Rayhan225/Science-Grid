# server/slm_engine.py
# ═══════════════════════════════════════════════════════════════════
# SLM Engine — Local Llama-3.2-3B-Instruct via llama-cpp-python
# Zero-network, CPU-only, deterministic greedy decoding
# ═══════════════════════════════════════════════════════════════════
import os
import json
import threading
from typing import List, Optional, Dict, Any
from pathlib import Path

try:
    from llama_cpp import Llama, LlamaGrammar
except ImportError:
    Llama = None
    LlamaGrammar = None
    print("[WARN] [SLM Engine] llama-cpp-python not installed. Run: pip install llama-cpp-python")

# ── GBNF grammar support rules (shared) ──
# llama-cpp-python 0.3.35 accepts EXACTLY these support rules; adding extra named
# rules (string_small, valchar, integer, boolean, ...) crashes with an access
# violation at sample time. Repetition operators {m,n} ARE supported, so string
# values are HARD-CAPPED (260 chars default here) — CPU models cannot ramble
# inside values and blow the token budget before completing. Raw control chars
# (\n\r\t) are excluded from strings so the emitted value is always JSON-valid.
_GBNF_SUPPORT = (
    'value ::= object | array | string | number | ("true" | "false" | "null") ws\n'
    'object ::= "{" ws ( string ":" ws value ("," ws string ":" ws value)* )? "}"\n'
    'array ::= "[" ws ( value ("," ws value)* )? "]"\n'
    'string ::= "\\"" ( [^"\\\\\\n\\r\\t] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) ) {0,260} "\\""\n'
    'number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?\n'
    'ws ::= ([ \\t\\n] ws)?\n'
)

# ── GBNF grammar: any valid JSON object (used when force_json=True) ──
# Constrained sampling guarantees well-formed JSON in a single pass, so
# robust_llm_json no longer needs slow multi-attempt repairs.
_JSON_OBJECT_GBNF = "root ::= object\n" + _GBNF_SUPPORT

_json_grammar_cache = None
_grammar_by_content = {}


def _get_json_grammar():
    """Return a cached LlamaGrammar instance constraining output to a JSON object."""
    global _json_grammar_cache
    if _json_grammar_cache is None and LlamaGrammar is not None:
        _json_grammar_cache = LlamaGrammar.from_string(_JSON_OBJECT_GBNF)
    return _json_grammar_cache


def _compile_grammar(gbnf: str):
    """Compile a GBNF string into a cached LlamaGrammar object."""
    if LlamaGrammar is None:
        return None
    cached = _grammar_by_content.get(gbnf)
    if cached is None:
        cached = LlamaGrammar.from_string(gbnf)
        _grammar_by_content[gbnf] = cached
    return cached


def build_schema_grammar(schema: Dict[str, str]) -> str:
    """Build a GBNF grammar emitting a JSON object with EXACTLY `schema`'s keys,
    in order, with value types enforced. `schema` maps key -> one of:
      "string"            -> string capped at 160 chars (inline, hard-capped)
      "string:<N>"        -> string capped at N chars
      "int" | "float"     -> JSON number
      "bool"              -> true/false
      "any"               -> any JSON value (nested strings capped by the
                             support `string` rule at 260 chars)
      "array:<lo>-<hi>:{key:type,...}"
                          -> array of lo..hi objects, EACH with exactly the
                             given keys in order (nested strings hard-capped)
      "object:{key:type,...}"
                          -> a single object with exactly the given keys

    Every string value in the output is HARD-CAPPED by the grammar, and arrays
    are HARD-CAPPED in object count, so CPU models are forced to be concise:
    generation completes within a bounded token budget instead of rambling past
    max_tokens and truncating mid-string / mid-array.

    IMPORTANT constraint discovered on llama-cpp-python 0.3.35: the root rule body
    must be a SINGLE line and the support rules must exactly be
    value/object/array/string/number/ws. Adding extra named rules (string_small,
    valchar, integer, boolean, ...) is silently rejected and crashes with an
    access violation at sample time. Per-key caps therefore can only be expressed
    INLINE inside the root body (repetition operators {m,n} ARE supported, and so
    are parenthesized groups, so nested objects/arrays are fully inlinable).
    """
    VALCHAR = r'[^"\\\n\r\t] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])'
    import re as _re

    def inline_string(cap: int):
        esc = '\\"'   # GBNF literal for a quote: \"
        return f'"{esc}" ( {VALCHAR} ) {{0,{cap}}} "{esc}"'

    def value_inline(typ: str) -> str:
        """Return an inline GBNF fragment for a scalar/any value type."""
        m = _re.match(r"^string(?::(\d+))?$", typ)
        if m:
            cap = int(m.group(1)) if m.group(1) else 160
            return inline_string(cap)
        if typ in ("int", "float"):
            return "number"
        if typ == "bool":
            return '("true" | "false") ws'
        return "value"

    def parse_fields(spec: str) -> Dict[str, str]:
        """Parse '{key:type,key2:type2}' (or the inner body) into an ordered dict."""
        spec = spec.strip()
        if spec.startswith("{") and spec.endswith("}"):
            spec = spec[1:-1]
        fields: Dict[str, str] = {}
        for part in spec.split(","):
            part = part.strip()
            if not part:
                continue
            k, _, v = part.partition(":")
            fields[k.strip()] = v.strip()
        return fields

    def object_inline(fields: Dict[str, str]) -> str:
        """Inline GBNF fragment for a fixed-shape JSON object."""
        parts = ['"{" ws']
        fkeys = list(fields.keys())
        for j, fkey in enumerate(fkeys):
            key_lit = '"\\"{}\\""'.format(fkey)
            fval = value_inline(fields[fkey])
            if j < len(fkeys) - 1:
                parts.append(f'{key_lit} ws ":" ws {fval} ws "," ws')
            else:
                parts.append(f'{key_lit} ws ":" ws {fval} ws "}}"')
        return " ".join(parts)

    def array_inline(spec: str) -> str:
        """Inline GBNF fragment for 'array:lo-hi:{...}' -> array of lo..hi objects."""
        rng, _, body = spec[len("array:"):].partition(":")   # "lo-hi", "{...}"
        lo_s, _, hi_s = rng.partition("-")
        lo, hi = int(lo_s), int(hi_s or lo_s)
        obj = object_inline(parse_fields(body))
        if lo <= 0:
            return f'"[" ws ( {obj} ( ws "," ws {obj} ){{0,{hi - 1}}} )? "]"'
        # lo >= 1: emit lo mandatory objects, then 0..(hi-lo) extra ones
        mandatory = " ".join([obj] + [f'ws "," ws {obj}'] * (lo - 1))
        if hi - lo > 0:
            return f'"[" ws {mandatory} ( ws "," ws {obj} ){{0,{hi - lo}}} "]"'
        return f'"[" ws {mandatory} "]"'

    parts = ['root ::= "{" ws']
    keys = list(schema.keys())
    for i, key in enumerate(keys):
        key_lit = '"\\"{}\\""'.format(key)          # GBNF literal for e.g. "concept"
        typ = schema[key]
        val = "value"
        if isinstance(typ, str):
            if typ.startswith("array:"):
                val = array_inline(typ)
            elif typ.startswith("object:"):
                val = object_inline(parse_fields(typ[len("object:"):]))
            elif typ == "any":
                val = "value"
            else:
                val = value_inline(typ)
        if i < len(keys) - 1:
            parts.append(f'{key_lit} ws ":" ws {val} " , "')
        else:
            parts.append(f'{key_lit} ws ":" ws {val} "}}"')
    root = " ".join(parts)
    return root + "\n" + _GBNF_SUPPORT

# ── Model path resolution ──
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_MODEL_PATH = _PROJECT_ROOT / "models" / "llama-3.2-3b-instruct.Q5_K_M.gguf"

# Singleton instance & thread-safety lock
_llm_instance = None
_inference_lock = threading.Lock()


def get_model():
    """Load and return the singleton LLM instance."""
    global _llm_instance
    if _llm_instance is None:
        if Llama is None:
            raise RuntimeError(
                "llama-cpp-python is not installed. "
                "Run: pip install llama-cpp-python"
            )
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found: {_MODEL_PATH}\n"
                f"Expected at: models/llama-3.2-3b-instruct.Q5_K_M.gguf"
            )

        n_threads = os.cpu_count() or 4
        _llm_instance = Llama(
            model_path=str(_MODEL_PATH),
            n_ctx=4096,
            n_threads=n_threads,
            n_threads_batch=n_threads,
            n_gpu_layers=0,       # CPU-only
            verbose=False,
            seed=42,              # Reproducibility
        )
        print(
            f"[OK] [SLM Engine] Loaded {_MODEL_PATH.name} "
            f"| ctx=4096 | threads={n_threads} | CPU-only | deterministic"
        )
    return _llm_instance


def format_llama3_prompt(
    system_prompt: str,
    user_prompt: Optional[str] = None,
    messages: Optional[List[dict]] = None
) -> str:
    """
    Build a strict Meta Llama-3 instruction-template string.
    BOS token is added by llama-cpp tokenizer.
    """
    prompt_str = "<|start_header_id|>system<|end_header_id|>\n\n"
    prompt_str += f"{system_prompt.strip()}<|eot_id|>"

    # Handle multi-turn dialogue history if provided
    if messages:
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "").strip()
            if role not in ("system", "user", "assistant") or not content:
                continue
            if role == "system":
                continue  # System prompt already added
            prompt_str += f"<|start_header_id|>{role}<|end_header_id|>\n\n{content}<|eot_id|>"

    # Append current user prompt if provided
    if user_prompt:
        prompt_str += f"<|start_header_id|>user<|end_header_id|>\n\n{user_prompt.strip()}<|eot_id|>"

    # Open assistant turn
    prompt_str += "<|start_header_id|>assistant<|end_header_id|>\n\n"
    return prompt_str


def generate(
    prompt: Optional[str] = None,
    system_prompt: str = "You are a precise academic research assistant. Be concise, mathematically rigorous, and technical.",
    messages: Optional[List[dict]] = None,
    max_tokens: int = 512,
    temperature: float = 0.1,
    top_p: float = 0.95,
    force_json: bool = False,
    grammar: Optional[str] = None,
) -> str:
    """
    Generate text with tailored analytical decoding for academic reasoning.
    temperature=0.0 when force_json=True for strict deterministic JSON schemas.
    temperature=0.1 for grounded reasoning with minimal hallucination risk.

    `grammar`: explicit GBNF grammar string. When provided it overrides the
    generic JSON-object grammar (used with force_json=True) so callers can
    constrain output to an exact key schema for faster, precise completion.
    """
    llm = get_model()

    if force_json:
        system_prompt += (
            "\nYou MUST respond with valid JSON only. "
            "No markdown fences, no explanation outside the JSON object."
        )
        temperature = 0.0
        top_k = 1
        top_p = 1.0
    else:
        top_k = 40

    formatted = format_llama3_prompt(system_prompt, user_prompt=prompt, messages=messages)

    effective_grammar = None
    if grammar:
        effective_grammar = _compile_grammar(grammar)
    elif force_json:
        effective_grammar = _get_json_grammar()

    with _inference_lock:
        tokens = llm.tokenize(formatted.encode("utf-8"))
        # Native 4096 context window: leave at least max_tokens for response
        max_allowed_input = 4096 - max_tokens - 32
        if len(tokens) > max_allowed_input:
            tokens = tokens[:max_allowed_input]
            formatted = llm.detokenize(tokens).decode("utf-8", errors="ignore")

        result = llm(
            formatted,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            repeat_penalty=1.05,
            stop=["<|eot_id|>", "<|end_of_text|>", "<|start_header_id|>"],
            echo=False,
            grammar=effective_grammar,
        )

    text = result["choices"][0]["text"].strip() if result.get("choices") else ""
    return text


def warmup():
    """Pre-load model into memory during server startup."""
    try:
        result = generate("Say 'ready'.", max_tokens=8)
        print(f"[OK] [SLM Engine] Warmup complete -> {result[:50]}")
        return True
    except Exception as e:
        print(f"[ERROR] [SLM Engine] Warmup failed: {e}")
        return False


def get_model_info() -> dict:
    """Return metadata about the loaded model."""
    return {
        "name": "llama-3.2-3b-instruct-q5km",
        "file": _MODEL_PATH.name,
        "engine": "llama-cpp-python",
        "device": "cpu",
        "context_length": 4096,
        "decoding": "greedy (temperature=0.0, top_k=1)",
        "threads": os.cpu_count() or 4,
        "loaded": _llm_instance is not None,
    }
