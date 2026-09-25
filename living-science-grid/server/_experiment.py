import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
print("=== GRAMMAR ===")
print(g)
print("=== END GRAMMAR ===")

VERBOSE = '''Perform an in-depth mathematical analysis and numerical stability critique of this formula:
Formula Name: Sigmoid Activation
LaTeX Expression: $$ \\sigma(x) = \\frac{1}{1 + e^{-x}} $$
Respond STRICTLY with valid JSON containing these exact keys in this exact order:
{
  "concept": "Formal definition and mathematical significance of this equation in academic literature",
  "rating": "Rigorous grade rating with rationale",
  "critique": "Detailed critique of numerical properties: continuity, differentiability, asymptotic limits, numerical hazards (overflow, underflow, vanishing/exploding gradients), mitigation tricks",
  "alternatives": "Modern alternative mathematical formulations, generalizations, or numerically robust variants",
  "variables": [
    {"symbol": "variable_symbol", "label": "Human descriptive parameter label", "default": 1.0, "min": -5.0, "max": 5.0, "step": 0.1, "effect": "Explanation of how tuning this variable modulates the mathematical outcome"}
  ],
  "python_code": "Complete executable Python snippet with an evaluate(variables) function and print statement",
  "eval_expr": "Valid Python single-line mathematical expression evaluating output y from primary variable x, e.g. '1.0 / (1.0 + math.exp(-x))'"
}'''

CONCISE = '''Mathematical analysis of: Sigmoid Activation, formula $$ \\sigma(x) = \\frac{1}{1 + e^{-x}} $$ (logistic sigmoid, maps R to (0,1)).
Return ONLY the JSON object below with these exact keys and order. Be concise: strings under 160 characters, variables list with exactly 2 items:
{
  "concept": "definition and significance",
  "rating": "grade like 'A (Stable Saturation)' with 3-6 word rationale",
  "critique": "numerical properties, hazards, mitigation (under 160 chars)",
  "alternatives": "modern robust variants (under 130 chars)",
  "variables": [
    {"symbol": "symbol", "label": "label", "default": 1.0, "min": -5.0, "max": 5.0, "step": 0.1, "effect": "effect text"}
  ],
  "python_code": "import math\\ndef evaluate(variables):\\n    x = float(variables.get('x', 1.0))\\n    y = 1.0 / (1.0 + math.exp(-x))\\n    return float(y)\\n\\noutput = evaluate(variables)\\nprint(f'Computed Output: {output:.6f}')\\n",
  "eval_expr": "1.0 / (1.0 + math.exp(-x))"
}'''

for label, prompt in [("VERBOSE+SCHEMA", VERBOSE), ("CONCISE+SCHEMA", CONCISE)]:
    t0 = time.time()
    try:
        out = slm_engine.generate(
            prompt=prompt,
            system_prompt="You are a precise academic mathematician. Output ONLY valid JSON.",
            force_json=True, grammar=g, max_tokens=650,
        )
        dt = time.time() - t0
        try:
            parsed = json.loads(out)
            lens = {k: len(str(parsed.get(k) or "")) for k in ["concept", "critique", "alternatives", "python_code", "eval_expr"]}
            print(label, "->", round(dt, 1), "s | PARSE OK keys=", list(parsed.keys()), "lens=", lens)
        except Exception as pe:
            print(label, "->", round(dt, 1), "s | PARSE FAIL:", str(pe)[:90])
        print("  HEAD:", out[:150].replace("\n", " "))
        print("  TAIL:", out[-150:].replace("\n", " "))
    except Exception as e:
        print(label, "-> ERROR:", str(e)[:250])