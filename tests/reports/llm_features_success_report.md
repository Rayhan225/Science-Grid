# LLM Features Testing — Success Report

- **Timestamp:** 2026-09-24 03:47:37
- **Host:** DESKTOP-I8UOC9J
- **API backend:** http://127.0.0.1:8000
- **Express backend:** http://127.0.0.1:5000
- **Frontend:** http://localhost:5173
- **Result:** ✅ ALL PASS
- **Passed:** 59  **Failed:** 0  **Warnings:** 0  **Total:** 59

| Status | Test | Detail |
|--------|------|--------|
| ✅ PASS | `LLM Features Testing-001` Register fresh @test.local account for LLM suite | HTTP 200 uid=usr_1790199460693 |
| ✅ PASS | `LLM Features Testing-002` GET /health reports status=online | HTTP 200 online |
| ✅ PASS | `LLM Features Testing-003` Swarm chat answers derivative question meaningfully | 16s reply="To find the derivative of x^2 with respect to x, we'll apply the power rule of differentiation.\n\nThe power rule states t" |
| ✅ PASS | `LLM Features Testing-004` Swarm response surfaces the correct derivative (2x) | reply="To find the derivative of x^2 with respect to x, we'll apply the power rule of differentiation.\n\nThe power rule states t" |
| ✅ PASS | `LLM Features Testing-005` Chat fast-path returns exact physical constant (299,792,458 m/s) | 0s reply='The speed of light in vacuum is approximately 299,792,458 meters per second.' |
| ✅ PASS | `LLM Features Testing-006` Chat yields a substantive physics answer containing 'Hamiltonian' | 75s len=2846 reply='The Hamiltonian is a fundamental concept in quantum mechanics, playing a crucial role in the formulation of th' |
| ✅ PASS | `LLM Features Testing-007` Chat response includes citations key (RAG shape) | keys=['status', 'response', 'reply', 'citations', 'model'] |
| ✅ PASS | `LLM Features Testing-008` Translate endpoints returns non-empty Bengali text | 18s len=126 bengali_chars=107 sample='আমরা একটি স্কেলেবল অ্যাটেনশন প্রক্রিয়া প্রস্তাব করি যা বর্গাকার জটিলতা থেকে লাই' |
| ✅ PASS | `LLM Features Testing-009` Translation is genuinely Bengali script (contains Bengali glyphs) | bengali_chars=107 |
| ✅ PASS | `LLM Features Testing-010` math-ast returns structured AST tree | 62s ast_keys=['type', 'operator', 'variables', 'constants', 'tree'] |
| ✅ PASS | `LLM Features Testing-011` math-ast extracts variable list & Rust signature | vars=['Q', 'K', 'V'] sig=pub fn evaluate_ast(Q: f64, K: f64, V: f64) -> Result<f64, MathError> |
| ✅ PASS | `LLM Features Testing-012` math-extract harvests candidate equations from manuscript text | 0s found=2 pages=1 |
| ✅ PASS | `LLM Features Testing-013` Extracted equations carry latex + name + page | sample={"name": "Class Probability Distribution (Softmax)", "latex": "$$ P(y = c \\mid x) = \\frac{\\exp(z_c)}{\\sum_{j=1}^C \\ |
| ✅ PASS | `LLM Features Testing-014` math-analyze: full analysis object returned (HTTP success) | 109s keys=['status', 'evalId', 'name', 'latex', 'concept', 'rating', 'critique', 'alternatives', 'variables', 'pythonCode', 'chartData', 'defaultOutput', 'logicMap'] |
| ✅ PASS | `LLM Features Testing-015` math-analyze: concept is REAL LLM prose (not heuristic fallback) | concept='The sigmoid activation function is a continuous, differentiable, and monotonic increasing function over its domain. It has been wi' |
| ✅ PASS | `LLM Features Testing-016` math-analyze: rating is a rigorous grade string | rating='A (Information-Theoretic Standard )' |
| ✅ PASS | `LLM Features Testing-017` math-analyze: critique reasoning is substantive | critique='The sigmoid function exhibits vanishing gradients during backpropagation for large negative input values, whic' |
| ✅ PASS | `LLM Features Testing-018` math-analyze: alternatives enumerated | alternatives='Several alternative activation functions have been proposed to address the vanishing gradient problem, includi' |
| ✅ PASS | `LLM Features Testing-019` math-analyze: interactive variables produced | vars=['x', 'y', 'learning'] |
| ✅ PASS | `LLM Features Testing-020` math-analyze: executable python_code synthesized (def evaluate + print) | code_head="import numpy as np\ndef evaluate(variables):    x = variables['x']    y = 1 / (1 " |
| ✅ PASS | `LLM Features Testing-021` math-analyze: 50-point trajectory curve computed | points=51 |
| ✅ PASS | `LLM Features Testing-022` math-analyze: ReactFlow DAG logic map present | nodes=3 |
| ✅ PASS | `LLM Features Testing-023` math-analyze: single-pass grammar generation is FAST (<240s warm/cold) | 109s (pre-fix ~224s with 3 retries) |
| ✅ PASS | `LLM Features Testing-024` rigor-audit returns numeric rigor_score | 17s rigor_score=43.5 |
| ✅ PASS | `LLM Features Testing-025` rigor-audit returns verification_passed boolean | verification_passed=False |
| ✅ PASS | `LLM Features Testing-026` rigor-audit returns 5 dimensional scores | dims=['empirical_rigor', 'mathematical_soundness', 'boundary_safety', 'reproducibility', 'claim_alignment'] |
| ✅ PASS | `LLM Features Testing-027` rigor-audit review_summary is real LLM critique (not placeholder) | summary="Manuscript 'A Claim-Dense Manuscript Without Ablations' presents a coherent, methodological contribution evaluated at co" |
| ✅ PASS | `LLM Features Testing-028` rigor-audit flags carry actionable recommendations | flags=4 |
| ✅ PASS | `LLM Features Testing-029` rigor-audit persisted to audit_ledger (DB) | rows=1 |
| ✅ PASS | `LLM Features Testing-030` plagiarism-check returns originality + overlap metrics | 1s orig=5.0 overlap=95.0 sources=4 |
| ✅ PASS | `LLM Features Testing-031` plagiarism-check returns flagged segments properly shaped |  |
| ✅ PASS | `LLM Features Testing-032` ai-patterns-check returns probabilities + verdict | 10s human=59.6 ai=40.4 verdict='Hybrid / AI-Assisted (Localized Formulaic Phrasing)' |
| ✅ PASS | `LLM Features Testing-033` ai-patterns-check flags the hallmark clichés in fixture | flagged=5 |
| ✅ PASS | `LLM Features Testing-034` terminology-guard returns issues list | 0s issue_count=1 |
| ✅ PASS | `LLM Features Testing-035` terminology-guard flags unit inconsistency (23 ms vs 12 s) | types=['unit_inconsistency'] |
| ✅ PASS | `LLM Features Testing-036` terminology-guard issues carry anchors + recommendations |  |
| ✅ PASS | `LLM Features Testing-037` flashcards/generate synthesizes cards (not empty fallback) | 75s cards=4 concept0='Layer Normalization' |
| ✅ PASS | `LLM Features Testing-038` flashcards carry concept + definition + formula |  |
| ✅ PASS | `LLM Features Testing-039` flashcard formulas are LaTeX-styled when present |  |
| ✅ PASS | `LLM Features Testing-040` flashcards persisted to student_flashcards (DB) | rows=4 |
| ✅ PASS | `LLM Features Testing-041` code/implementations/extract returns an implementation object | 58s impl=ScaledDotProductAttentionForwardLayerNormLayerMultiHeadAttentionLayerLinearLayer |
| ✅ PASS | `LLM Features Testing-042` Generated code is real runnable PyTorch (imports + class) | code_head='import torch\nimport torch.nn as nn\nclass ScaledDotProductAttention(nn.Module):    def __in' |
| ✅ PASS | `LLM Features Testing-043` Implementation carries algorithm_name + Big-O complexity | name=ScaledDotProductAttentionForwardLayerNormLayerMultiHeadAttentionLayerLinearLayer complexity=O(N * d^2 / sqrt(d_k)) |
| ✅ PASS | `LLM Features Testing-044` implementation persisted to code_implementations (DB) | rows=1 |
| ✅ PASS | `LLM Features Testing-045` matrix returns per-paper comparative entries | 95s rows=2 |
| ✅ PASS | `LLM Features Testing-046` matrix entry #1 carries full schema (strengths/models/dataset) | keys=['id', 'paper', 'year', 'data_specs', 'dataset', 'variables', 'models', 'strengths', 'weaknesses', 'result', 'notes', 'fri'] |
| ✅ PASS | `LLM Features Testing-047` matrix entry #1 content is extracted prose, not placeholder | strengths='Parallelization , Linear Time Complexity ' |
| ✅ PASS | `LLM Features Testing-048` matrix entry #1 fri is a reproducibility score (75-98) | fri=97 |
| ✅ PASS | `LLM Features Testing-049` matrix entry #2 carries full schema (strengths/models/dataset) | keys=['id', 'paper', 'year', 'data_specs', 'dataset', 'variables', 'models', 'strengths', 'weaknesses', 'result', 'notes', 'fri'] |
| ✅ PASS | `LLM Features Testing-050` matrix entry #2 content is extracted prose, not placeholder | strengths='Residual connections reduce layer depth; improved training speedup by 30x on Ima' |
| ✅ PASS | `LLM Features Testing-051` matrix entry #2 fri is a reproducibility score (75-98) | fri=96 |
| ✅ PASS | `LLM Features Testing-052` citations/generate returns bibtexKey + 4 formats | 0s key=Researcher2025Sovereig |
| ✅ PASS | `LLM Features Testing-053` BibTeX entry is well-formed @article{} |  |
| ✅ PASS | `LLM Features Testing-054` citations/export returns publication-ready styles | HTTP 200 |
| ✅ PASS | `LLM Features Testing-055` PDF ingest returns paperId + page memory | HTTP 200 id=51d2c25f-78ee-43ea-8ec2-c414a457bc0f pages=1 |
| ✅ PASS | `LLM Features Testing-056` ingest produced smart research questions | questions=4 |
| ✅ PASS | `LLM Features Testing-057` Grounded chat returns response + RAG citations | 33s len=782 citations=1 |
| ✅ PASS | `LLM Features Testing-058` RAG citations are populated from document_chunks vector search | citations=1 first={"chunk_id": "1389c075-2436-4d24-b1d0-4d524c96b621", "page": 1, "section": "Document Start", "snippet": "Transformer Architecture Review\nWe propose a new netwo |
| ✅ PASS | `LLM Features Testing-059` Citation entries expose snippet/key fields |  |

---
*Generated by the ScholarGrid E2E test harness. See `tests/README.md` for how to re-run.*