# Scratch experiment: reproduce the math-analyze generation path exactly,
# print the raw model output + timing + parse status. TEMP FILE (deleted later).
import sys, os, time, re, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "living-science-grid", "server"))
import slm_engine

schema = {
    "concept": "string", "rating": "string", "critique": "string",
    "alternatives": "string", "variables": "any",
    "python_code": "string", "eval_expr": "string",
}
name = "Sigmoid Activation"
raw_latex = r"$$ \sigma(x) = \frac{1}{1 + e^{-x}} $$"
extra_ctx = "The logistic sigmoid maps real inputs to the open interval (0, 1)."

prompt = (
    f"Perform an in-depth mathematical analysis and numerical stability critique of this formula:\n"
    f"Formula Name: {name}\n"
    f"LaTeX Expression: {raw_latex}\n"
    + (f"Paper Context: {extra_ctx[:800]}\n" if extra_ctx else "") +
    "\nRespond STRICTLY with valid JSON containing these exact keys:\n"
    "{\n"
    '  "concept": "Formal definition and mathematical significance of this equation in academic literature",\n'
    '  "rating": "Rigorous grade rating with rationale (e.g., \'A (Information-Theoretic Standard)\', \'B+ (Subject to saturation)\')",\n'
    '  "critique": "Detailed critique of numerical properties: continuity, differentiability, behavior under asymptotic limits, and numerical hazards (overflow, underflow, vanishing/exploding gradients, mitigation tricks)",\n'
    '  "alternatives": "Modern alternative mathematical formulations, generalizations, or numerically robust variants",\n'
    '  "variables": [\n'
    '    {\n'
    '      "symbol": "variable_symbol (e.g. x)",\n'
    '      "label": "Human descriptive parameter label",\n'
    '      "default": 1.0,\n'
    '      "min": -5.0,\n'
    '      "max": 5.0,\n'
    '      "step": 0.1,\n'
    '      "effect": "Explanation of how tuning this variable modulates the mathematical outcome"\n'
    '    }\n'
    '  ],\n'
    '  "python_code": "Complete executable Python snippet with an evaluate(variables) function and print statement",\n'
    '  "eval_expr": "Valid Python single-line mathematical expression evaluating output y from primary variable x and other parameters, e.g. \'1.0 / (1.0 + math.exp(-x))\' or \'math.tanh(x)\' or \'x * 1.5 + 0.5\'"\n'
    "}"
)

system_prompt = "You are a rigorous mathematical auditor. Implement and analyze the equations with meticulous precision. You MUST respond with valid JSON only. No markdown fences, no explanation outside the JSON object."

# Concise alternative prompt: embed strict length budgets per key.
budget_para = (
    "\n\nSTRICT LENGTH BUDGET (hard requirement): "
    "concept: at most 2 sentences (50-90 words). "
    "rating: at most 15 words. "
    "critique: at most 3 sentences (60-90 words). "
    "alternatives: at most 2 short items (40-70 words). "
    "variables: exactly 3 objects with short effect text (10-20 words each). "
    "python_code: at most 12 lines, no comments except a one-line header. "
    "eval_expr: a single short expression under 60 characters. "
    "Total JSON under 420 words."
)
user_prompt = prompt + budget_para
grammar = slm_engine.build_schema_grammar(schema)

t0 = time.time()
raw = slm_engine.generate(prompt=user_prompt, system_prompt=system_prompt, max_tokens=1400, force_json=True, grammar=grammar)
dt = time.time() - t0
print(f"\n[generate] {dt:.1f}s raw_len={len(raw)} first_200={raw[:200]!r}")

parsed = None
try:
    parsed = json.loads(raw)
except Exception as e:
    print(f"  strict parse failed: {e}")
    # control-char escape like main.py
    def esc(text):
        out, ins, escf = [], False, False
        for ch in text:
            if escf:
                out.append(ch); escf = False; continue
            if ch == "\\":
                out.append(ch); escf = True; continue
            if ch == '"':
                ins = not ins; out.append(ch); continue
            if ins and (ord(ch) < 0x20 or ord(ch) == 0x7F):
                out.append(f"\\u{ord(ch):04x}"); continue
            out.append(ch)
        return "".join(out)
    try:
        parsed = json.loads(esc(raw))
        print("  parse OK after control-char escape")
    except Exception as e2:
        print(f"  escape-parse failed: {e2}")

if parsed:
    print(f"  keys={list(parsed.keys())}")
    print(f"  concept={str(parsed.get('concept'))[:80]!r}")
    print(f"  variables_count={len(parsed.get('variables') or [])}")
    print(f"  python_code_len={len(str(parsed.get('python_code') or ''))}")
    print(f"  eval_expr={parsed.get('eval_expr')!r}")
else:
    print("  PARSED=None (need repair or longer budget)")