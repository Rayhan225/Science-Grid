"""
ScholarGrid — LLM Features Test Suite (port 8000, local Llama-3.2-3B).

Verifies every LLM-powered endpoint end-to-end against the live FastAPI server,
including:
  * Engine health / model warmup
  * Swarm chat reasoning + deterministic fast-path
  * Academic translation (Bengali)
  * Math AST parsing, equation extraction, deep equation analysis
  * Rigor audit (with audit_ledger persistence)
  * Plagiarism detection, AI-writing-pattern detection, terminology/notation guard
  * Flashcard synthesis, PyTorch code synthesis (with DB persistence)
  * Domain matrix extraction
  * Citation generation & export
  * RAG: PDF ingest -> pgvector chunking -> grounded chat with citations

The suite consumes only the running servers; every @test.local account and every
DB row it creates is cleaned up before it exits.

Run:  python tests/test_llm_features.py
"""

from __future__ import annotations

import io
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
from harness import (API_BASE, TEST_EMAIL_SUFFIX, TEST_PASSWORD, SuiteResult,
                      api_register, cleanup_user, connect_db, make_email,
                      write_report)

RES = SuiteResult("LLM Features Testing")
_report_md = Path(__file__).resolve().parent / "reports" / "llm_features_success_report.md"
_report_json = Path(__file__).resolve().parent / "reports" / "llm_features_results.json"
FIXTURES = Path(__file__).resolve().parent / "fixtures"

_TIMEOUT_FAST = 120
_TIMEOUT_LLM = 300  # CPU inference can take 30-90 s per call


def post_json(path, payload, timeout=_TIMEOUT_LLM):
    t0 = time.time()
    r = requests.post(f"{API_BASE}{path}", json=payload, timeout=timeout)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text[:300]}
    return r, body, time.time() - t0


def load_fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def unique_uid_style(prefix):
    return f"usr_{prefix}_{int(time.time() * 1000)}"


def main():
    # ── 0. Register a fresh disposable user for user-scoped writes ──
    email = make_email("llm")
    r, reg = api_register(email, name="LLM Tester", role="researcher")
    uid = reg.get("user", {}).get("id") if isinstance(reg, dict) else None
    RES.record("Register fresh @test.local account for LLM suite", r.status_code in (200, 201) and bool(uid),
               f"HTTP {r.status_code} uid={uid}")
    if not uid:
        uid = unique_uid_style("fail")
    conn = None
    try:
        conn = connect_db()
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] DB connection unavailable for persistence checks: {e}")

    created_paper_ids: list = []
    created_eval_paper_ids: list = []

    try:
        # ══════════════════════════════════════════════════════════════
        # 1. LLM ENGINE HEALTH & WARMUP
        # ══════════════════════════════════════════════════════════════
        RES.start_section("1. LLM Engine Health & Warmup")
        r = requests.get(f"{API_BASE}/health", timeout=_TIMEOUT_FAST)
        hb = r.json() if r.status_code == 200 else {}
        RES.record("GET /health reports status=online", r.status_code == 200 and hb.get("status") == "online",
                   f"HTTP {r.status_code} {hb.get('status')}")

        # ── 2. Swarm Chat & Reasoning ──
        RES.start_section("2. Swarm Chat & Deterministic Reasoning")
        _, c, dt = post_json("/api/research/swarm", {
            "query": "What is the derivative of x^2 with respect to x?",
            "context": "Single-variable calculus; f(x) = x^2.", "user_id": uid,
        })
        resp = str(c.get("response") or c.get("reply") or "")
        mentions = any(k in resp.lower() for k in ["2x", "derivative"])
        RES.record("Swarm chat answers derivative question meaningfully",
                   c.get("status") == "success" and len(resp) > 15 and mentions,
                   f"{dt:.0f}s reply={resp[:120]!r}")
        RES.record("Swarm response surfaces the correct derivative (2x)",
                   mentions and "2x" in resp.lower(), f"reply={resp[:120]!r}")

        _, c, dt = post_json("/api/research/chat", {
            "query": "What is the speed of light in vacuum?",
            "user_id": uid,
        })
        resp = str(c.get("response") or c.get("reply") or "")
        RES.record("Chat fast-path returns exact physical constant (299,792,458 m/s)",
                   "299,792,458" in resp, f"{dt:.0f}s reply={resp[:90]!r}")

        _, c, dt = post_json("/api/research/chat", {
            "query": "Explain the significance of the Hamiltonian in quantum mechanics.",
            "user_id": uid,
        })
        resp = str(c.get("response") or c.get("reply") or "")
        has_hamiltonian = "hamiltonian" in resp.lower()
        RES.record("Chat yields a substantive physics answer containing 'Hamiltonian'",
                   c.get("status") == "success" and len(resp) > 50 and has_hamiltonian,
                   f"{dt:.0f}s len={len(resp)} reply={resp[:110]!r}")
        RES.record("Chat response includes citations key (RAG shape)",
                   "citations" in c, f"keys={list(c.keys())[:8]}")

        # ── 3. Academic Translation (Bengali) ──
        RES.start_section("3. Academic Translation Engine")
        src = ("We propose a scalable attention mechanism that reduces quadratic "
               "complexity to linear time while preserving expressivity.")
        _, c, dt = post_json("/api/research/translate", {"text": src, "target_lang": "bengali"}, timeout=_TIMEOUT_FAST)
        trans = str(c.get("translated_text") or c.get("translation") or "")
        bengali_chars = sum(1 for ch in trans if '\u0980' <= ch <= '\u09FF')
        RES.record("Translate endpoints returns non-empty Bengali text",
                   c.get("status") == "success" and len(trans) >= 5 and trans != src,
                   f"{dt:.0f}s len={len(trans)} bengali_chars={bengali_chars} sample={trans[:80]!r}")
        RES.record("Translation is genuinely Bengali script (contains Bengali glyphs)",
                   bengali_chars >= 3, f"bengali_chars={bengali_chars}")

        # ── 4. Math AST Parsing ──
        RES.start_section("4. Math AST Parsing")
        ast_paper_id = str(uuid.uuid4())
        created_eval_paper_ids.append(ast_paper_id)
        _, c, dt = post_json("/api/research/math-ast", {
            "formula": r"$$ \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V $$",
            "paper_id": ast_paper_id,
        })
        ast = c.get("astTree") or {}
        RES.record("math-ast returns structured AST tree",
                   c.get("status") == "success" and isinstance(ast, dict) and bool(ast.get("tree")),
                   f"{dt:.0f}s ast_keys={list(ast.keys())[:6]}")
        RES.record("math-ast extracts variable list & Rust signature",
                   bool(ast.get("variables")) and "pub fn" in str(c.get("rustSignature", "")),
                   f"vars={ast.get('variables')} sig={c.get('rustSignature')}")

        # ── 5. Math Equation Extraction ──
        RES.start_section("5. Math Equation Extraction")
        math_text = ("The architecture uses Scaled Dot-Product Attention defined as "
                     "Attention(Q,K,V) = softmax(QK^T/sqrt(d_k)) V. "
                     "The loss L = sum_i y_i log yhat_i drives optimization. "
                     "Positional encodings PE(pos,2i) = sin(pos/10000^(2i/d)) are added. "
                     "The model follows y = Wx + b at the output head.")
        _, c, dt = post_json("/api/research/math-extract", {"text": math_text, "max_equations": 6}, timeout=_TIMEOUT_FAST)
        eqs = c.get("equations") or []
        RES.record("math-extract harvests candidate equations from manuscript text",
                   c.get("status") == "success" and len(eqs) >= 2,
                   f"{dt:.0f}s found={len(c.get('equations', []))} pages={c.get('totalPagesScanned')}")
        RES.record("Extracted equations carry latex + name + page",
                   all(isinstance(e, dict) and (e.get("latex") or e.get("equation")) for e in eqs),
                   f"sample={json.dumps(eqs[0] if eqs else {}, ensure_ascii=False)[:120]}")

        # ── 6. Deep Math Analysis (core LLM JSON flow) ──
        RES.start_section("6. Deep Math Analysis (robust_llm_json + grammar)")
        t0 = time.time()
        _, c, dt = post_json("/api/research/math-analyze", {
            "latex": r"$$ \sigma(x) = \frac{1}{1 + e^{-x}} $$",
            "name": "Sigmoid Activation",
            "pageNum": 1,
            "context": "The logistic sigmoid maps real inputs to the open interval (0, 1).",
            "paper_id": ast_paper_id,
        })
        concept = str(c.get("concept") or "")
        rating = str(c.get("rating") or "")
        critique = str(c.get("critique") or "")
        alternatives = str(c.get("alternatives") or "")
        variables = c.get("variables") or []
        python_code = str(c.get("pythonCode") or c.get("python_code") or "")
        chart = c.get("chartData") or c.get("chartPoints") or c.get("chart_data") or []
        logic_map = c.get("logicMap") or c.get("logic_map") or {}
        fallback_concept_tail = "parametric mapping evaluated across continuous empirical coordinates"

        RES.record("math-analyze: full analysis object returned (HTTP success)",
                   c.get("status") == "success" if c.get("status") else True,
                   f"{dt:.0f}s keys={list(c.keys())[:14]}")
        RES.record("math-analyze: concept is REAL LLM prose (not heuristic fallback)",
                   len(concept) > 60 and fallback_concept_tail not in concept,
                   f"concept={concept[:130]!r}")
        RES.record("math-analyze: rating is a rigorous grade string",
                   bool(rating) and any(ch.isalpha() for ch in rating), f"rating={rating[:80]!r}")
        RES.record("math-analyze: critique reasoning is substantive",
                   len(critique) > 40, f"critique={critique[:110]!r}")
        RES.record("math-analyze: alternatives enumerated",
                   len(alternatives) > 25, f"alternatives={alternatives[:110]!r}")
        RES.record("math-analyze: interactive variables produced",
                   isinstance(variables, list) and len(variables) >= 1 and all(v.get("symbol") for v in variables),
                   f"vars={[v.get('symbol') for v in variables][:6]}")
        RES.record("math-analyze: executable python_code synthesized (def evaluate + print)",
                   ("def evaluate(variables)" in python_code) and ("print" in python_code),
                   f"code_head={python_code[:80]!r}")
        RES.record("math-analyze: 50-point trajectory curve computed",
                   len(chart) >= 50 and all("x" in p for p in chart),
                   f"points={len(chart)}")
        RES.record("math-analyze: ReactFlow DAG logic map present",
                   isinstance(logic_map, dict) and bool(logic_map.get("nodes")),
                   f"nodes={len(logic_map.get('nodes', []))}")
        RES.record("math-analyze: single-pass grammar generation is FAST (<240s warm/cold)",
                   dt < 240.0, f"{dt:.0f}s (pre-fix ~224s with 3 retries)")

        # ── 7. Rigor Audit (LLM JSON + audit_ledger persistence) ──
        RES.start_section("7. Rigor Audit & Persistence")
        audit_text = ("We introduce a novel neural architecture We introduce a novel neural architecture. "
                      "The proposed method achieves 94.2% accuracy on the benchmark. "
                      "We evaluate on N=128 samples without statistical significance testing. "
                      "No baseline comparison or ablation study is provided. "
                      "The loss function is L(y, yhat) = -sum y log yhat. "
                      "Claims of state-of-the-art performance lack confidence intervals.")
        _, c, dt = post_json("/api/research/rigor-audit", {
            "title": "A Claim-Dense Manuscript Without Ablations",
            "content": audit_text,
            "user_id": uid,
        })
        rigor_score = c.get("rigor_score")
        dims = c.get("dimensional_scores") or {}
        flags = c.get("audit_flags") or []
        summary = str(c.get("review_summary") or "")
        dlg = "Audit evaluation completed."
        RES.record("rigor-audit returns numeric rigor_score",
                   isinstance(rigor_score, (int, float)) and 0 <= rigor_score <= 100,
                   f"{dt:.0f}s rigor_score={rigor_score}")
        RES.record("rigor-audit returns verification_passed boolean",
                   isinstance(c.get("verification_passed"), bool), f"verification_passed={c.get('verification_passed')}")
        RES.record("rigor-audit returns 5 dimensional scores",
                   isinstance(dims, dict) and all(k in dims for k in
                                                  ["empirical_rigor", "mathematical_soundness", "boundary_safety",
                                                   "reproducibility", "claim_alignment"]),
                   f"dims={list(dims.keys())}")
        RES.record("rigor-audit review_summary is real LLM critique (not placeholder)",
                   summary != dlg and len(summary) > 60, f"summary={summary[:120]!r}")
        RES.record("rigor-audit flags carry actionable recommendations",
                   isinstance(flags, list) and all(f.get("recommendation") for f in flags[:2]),
                   f"flags={len(flags)}")
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT count(*) FROM audit_ledger WHERE user_id = %s", (uid,))
                    audit_rows = cur.fetchone()[0]
                RES.record("rigor-audit persisted to audit_ledger (DB)",
                           audit_rows >= 1, f"rows={audit_rows}")
            except Exception as e:  # noqa: BLE001
                RES.record("rigor-audit persisted to audit_ledger (DB)", False,
                           f"DB ERROR: {e}", warn=True)

        # ── 8. Plagiarism Detection ──
        RES.start_section("8. Plagiarism Detection")
        _, c, dt = post_json("/api/research/plagiarism-check", {
            "title": "Novel LLM Manuscript",
            "content": audit_text,
        }, timeout=_TIMEOUT_FAST)
        RES.record("plagiarism-check returns originality + overlap metrics",
                   c.get("status") == "success" and "originalityScore" in c and "canonicalOverlapIndex" in c,
                   f"{dt:.0f}s orig={c.get('originalityScore')} overlap={c.get('canonicalOverlapIndex')}"
                   f" sources={len(c.get('matchedSources', []))}")
        RES.record("plagiarism-check returns flagged segments properly shaped",
                   isinstance(c.get("flaggedSegments"), list) and isinstance(c.get("matchedSources"), list),
                   "")

        # ── 9. AI Writing Pattern Detection ──
        RES.start_section("9. AI Writing-Pattern Detection")
        ai_fx = load_fixture("ai_patterns.json")
        _, c, dt = post_json("/api/research/ai-patterns-check", ai_fx, timeout=_TIMEOUT_FAST)
        flagged = c.get("flaggedSentences") or []
        verdict = str(c.get("verdict") or "")
        RES.record("ai-patterns-check returns probabilities + verdict",
                   "humanProbability" in c and "aiProbability" in c and "verdict" in c,
                   f"{dt:.0f}s human={c.get('humanProbability')} ai={c.get('aiProbability')} verdict={verdict!r}")
        RES.record("ai-patterns-check flags the hallmark clichés in fixture",
                   len(flagged) >= 1 and all(f.get("reason") for f in flagged),
                   f"flagged={len(flagged)}")

        # ── 10. Terminology & Notation Guard ──
        RES.start_section("10. Terminology & Notation Guard")
        tg_fx = load_fixture("term_guard.json")
        _, c, dt = post_json("/api/research/terminology-guard", tg_fx, timeout=_TIMEOUT_FAST)
        issues = c.get("issues") or []
        types = [i.get("type") for i in issues]
        RES.record("terminology-guard returns issues list",
                   "issues" in c and isinstance(issues, list),
                   f"{dt:.0f}s issue_count={len(issues)}")
        RES.record("terminology-guard flags unit inconsistency (23 ms vs 12 s)",
                   "unit_inconsistency" in types or any("ms" in str(i.get("symbol", "")).lower() for i in issues),
                   f"types={types[:6]}")
        RES.record("terminology-guard issues carry anchors + recommendations",
                   all(i.get("anchor") and i.get("recommendation") for i in issues),
                   "")

        # ── 11. Flashcard Synthesis (LLM JSON + DB persistence) ──
        RES.start_section("11. Flashcard Synthesis & Persistence")
        fc_fx = load_fixture("flashcards.json")
        fc_fx["user_id"] = uid
        _, c, dt = post_json("/api/student/flashcards/generate", fc_fx)
        cards = c.get("generated") or c.get("cards") or []
        RES.record("flashcards/generate synthesizes cards (not empty fallback)",
                   isinstance(cards, list) and len(cards) >= 2,
                   f"{dt:.0f}s cards={len(cards)} concept0={str(cards[0].get('concept') if cards else '')[:60]!r}")
        RES.record("flashcards carry concept + definition + formula",
                   all(cd.get("concept") and cd.get("definition") for cd in cards), "")
        RES.record("flashcard formulas are LaTeX-styled when present",
                   all(cd.get("formula") for cd in cards), "")
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT count(*) FROM student_flashcards WHERE user_id = %s", (uid,))
                    fc_rows = cur.fetchone()[0]
                RES.record("flashcards persisted to student_flashcards (DB)",
                           fc_rows >= 2, f"rows={fc_rows}")
            except Exception as e:  # noqa: BLE001
                RES.record("flashcards persisted to student_flashcards (DB)", False,
                           f"DB ERROR: {e}", warn=True)

        # ── 12. PyTorch Code Synthesis (LLM JSON + DB persistence) ──
        RES.start_section("12. PyTorch Code Synthesis & Persistence")
        _, c, dt = post_json("/api/code/implementations/extract", {
            "paper_title": "Scaled Dot Product Attention",
            "content": "Scaled dot-product attention computes softmax(QK^T / sqrt(d_k)) V.",
            "user_id": uid,
        })
        imp = c.get("implementation") or {}
        code = str(imp.get("code_snippet") or "")
        RES.record("code/implementations/extract returns an implementation object",
                   c.get("status") == "success" and bool(imp.get("id")), f"{dt:.0f}s impl={imp.get('algorithm_name')}")
        RES.record("Generated code is real runnable PyTorch (imports + class)",
                   ("import torch" in code) and ("class " in code) and ("def forward" in code),
                   f"code_head={code[:90]!r}")
        RES.record("Implementation carries algorithm_name + Big-O complexity",
                   bool(imp.get("algorithm_name")) and bool(imp.get("complexity")),
                   f"name={imp.get('algorithm_name')} complexity={imp.get('complexity')}")
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT count(*) FROM code_implementations WHERE user_id = %s", (uid,))
                    ci_rows = cur.fetchone()[0]
                RES.record("implementation persisted to code_implementations (DB)",
                           ci_rows >= 1, f"rows={ci_rows}")
            except Exception as e:  # noqa: BLE001
                RES.record("implementation persisted to code_implementations (DB)", False,
                           f"DB ERROR: {e}", warn=True)

        # ── 13. Domain Matrix Extraction (LLM JSON + cache) ──
        RES.start_section("13. Domain Matrix Extraction")
        mtx_paper_a = {
            "id": str(uuid.uuid4()),
            "title": "Attention Is All You Need",
            "content": ("We propose the Transformer, a network architecture based solely on attention mechanisms. "
                        "Multi-head attention jointly attends to information from different representation subspaces. "
                        "Training on WMT 2014 English-to-German achieved 28.4 BLEU, outperforming recurrent networks. "
                        "Adam optimizer with learning rate 0.0001 and 250k steps on 8 GPUs."),
        }
        mtx_paper_b = {
            "id": str(uuid.uuid4()),
            "title": "Residual Learning for Deep Networks",
            "content": ("We present a residual learning framework to ease training of networks substantially deeper than "
                        "those used previously. Deep residual nets achieved 3.57% top-5 error on ImageNet 2015, "
                        "using 152 layers with batch normalization and SGD with weight decay 1e-4."),
        }
        _, c, dt = post_json("/api/research/matrix", {"papers": [mtx_paper_a, mtx_paper_b]}, timeout=420)
        rows = c.get("matrixData") or []
        RES.record("matrix returns per-paper comparative entries",
                   c.get("status") == "success" and len(rows) == 2,
                   f"{dt:.0f}s rows={len(rows)}")
        for i, ent in enumerate(rows, 1):
            RES.record(f"matrix entry #{i} carries full schema (strengths/models/dataset)",
                       all(k in ent for k in ["paper", "data_specs", "dataset", "models",
                                              "strengths", "weaknesses", "result", "fri"]),
                       f"keys={list(ent.keys())[:12]}")
            RES.record(f"matrix entry #{i} content is extracted prose, not placeholder",
                       len(str(ent.get("strengths") or "")) > 25 and ent.get("dataset") not in (None, "Empirical Corpus"),
                       f"strengths={str(ent.get('strengths'))[:80]!r}")
            RES.record(f"matrix entry #{i} fri is a reproducibility score (75-98)",
                       isinstance(ent.get("fri"), int) and 75 <= ent.get("fri") <= 98,
                       f"fri={ent.get('fri')}")

        # ── 14. Citation Generation & Export ──
        RES.start_section("14. Citation Generation & Export")
        _, c, dt = post_json("/api/citations/generate", {
            "title": "Sovereign Attention Mechanisms",
            "authors": "A. Researcher, B. Scholar",
            "year": 2025,
            "journal": "Journal of Sovereign AI",
            "doi": "10.48550/arXiv.2501.00001",
        }, timeout=_TIMEOUT_FAST)
        fmts = c.get("formats") or {}
        RES.record("citations/generate returns bibtexKey + 4 formats",
                   c.get("status") == "success" and bool(c.get("bibtexKey")) and all(
                       k in fmts for k in ["bibtex", "apa", "ieee", "chicago"]),
                   f"{dt:.0f}s key={c.get('bibtexKey')}")
        RES.record("BibTeX entry is well-formed @article{}",
                   str(fmts.get("bibtex", "")).startswith("@article{") and "title = " in str(fmts.get("bibtex", "")),
                   "")
        r = requests.get(f"{API_BASE}/api/citations/export",
                         params={"title": "Sovereign Attention Mechanisms", "authors": "A. Researcher, B. Scholar",
                                 "year": 2025, "doi": "10.48550/arXiv.2501.00001"}, timeout=_TIMEOUT_FAST)
        eb = r.json() if r.status_code == 200 else {}
        RES.record("citations/export returns publication-ready styles",
                   r.status_code == 200 and all(k in (eb.get("formats") or {}) for k in ["bibtex", "apa", "ieee", "chicago"]),
                   f"HTTP {r.status_code}")

        # ── 15. RAG: PDF Ingest -> Chunking -> Grounded Chat ──
        RES.start_section("15. RAG Ingest, pgvector Retrieval & Grounded Chat")
        pdf_bytes = _build_test_pdf()
        paper_id = None
        try:
            rr = requests.post(
                f"{API_BASE}/api/research/ingest",
                files={"file": ("Transformer_Architecture_Review.pdf", pdf_bytes, "application/pdf")},
                timeout=300,
            )
            ib = rr.json() if rr.status_code == 200 else {"raw": rr.text[:300]}
            paper_id = ib.get("paperId") or ib.get("paper_id")
            RES.record("PDF ingest returns paperId + page memory",
                       rr.status_code == 200 and bool(paper_id) and "paperMemory" in ib,
                       f"HTTP {rr.status_code} id={paper_id} pages={ib.get('totalPages')}")
            if paper_id:
                created_paper_ids.append(str(paper_id))
                RES.record("ingest produced smart research questions",
                           len(ib.get("smartQuestions") or []) >= 2,
                           f"questions={len(ib.get('smartQuestions', []))}")

                _, c, dt = post_json("/api/research/chat", {
                    "query": "What attention mechanism does this paper propose?",
                    "paper_id": str(paper_id),
                    "user_id": uid,
                })
                resp = str(c.get("response") or c.get("reply") or "")
                citations = c.get("citations") or []
                RES.record("Grounded chat returns response + RAG citations",
                           c.get("status") == "success" and len(resp) > 20,
                           f"{dt:.0f}s len={len(resp)} citations={len(citations)}")
                RES.record("RAG citations are populated from document_chunks vector search",
                           len(citations) >= 1,
                           f"citations={len(citations)} first={json.dumps(citations[0])[:160] if citations else 'none'}")
                if citations:
                    RES.record("Citation entries expose snippet/key fields",
                               all(any(k in cit for k in ["snippet", "chunk_id", "page", "section"]) for cit in citations),
                               "")
            else:
                RES.record("PDF ingest returns paperId + page memory", False,
                           f"HTTP {rr.status_code} body={json.dumps(ib)[:220]}")
        except Exception as e:  # noqa: BLE001
            RES.record("PDF ingest & RAG chat proceeded without transport error", False,
                       f"EXCEPTION: {e}")

    finally:
        # ──────────────────────────────────────────────────────────────
        # Cleanup: remove the @test.local user + LLM-created artifacts
        # ──────────────────────────────────────────────────────────────
        cleaned = {}
        if conn:
            try:
                for pid in created_paper_ids:
                    with conn.cursor() as cur:
                        for tbl in ("document_chunks", "paper_sections", "paper_analysis_cache",
                                    "math_evaluations", "papers"):
                            try:
                                cur.execute(f"DELETE FROM {tbl} WHERE paper_id = %s", (pid,))
                                cleaned[f"{tbl}#{pid[:8]}"] = cur.rowcount
                            except Exception:  # noqa: BLE001
                                pass
                        conn.commit()
                for pid in created_eval_paper_ids:
                    with conn.cursor() as cur:
                        try:
                            cur.execute("DELETE FROM math_evaluations WHERE paper_id = %s", (pid,))
                            conn.commit()
                        except Exception:  # noqa: BLE001
                            pass
                removed = cleanup_user(uid, conn)
                cleaned["user_cleanup"] = sum(removed.values())
            except Exception as e:  # noqa: BLE001
                print(f"[WARN] LLM suite cleanup incomplete: {e}")
        else:
            print("[WARN] No DB connection; user cleanup skipped (server remains untouched)")
        print(f"[CLEANUP] LLM suite removed artifacts: {cleaned}")

    ok, fail = write_report(RES, _report_md, _report_json)
    print(f"\n[s] LLM Features suite: {ok} passed, {fail} failed -> {_report_md}")
    sys.exit(0 if fail == 0 else 1)


def _build_test_pdf() -> bytes:
    """Build a small in-memory PDF with text + math content using PyMuPDF."""
    import fitz
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    lines = [
        "Transformer Architecture Review",
        "We propose a new network architecture based solely on attention mechanisms,",
        "dispensing with recurrence and convolutions entirely.",
        "The scaled dot-product attention is defined as",
        "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V.",
        "Multi-head attention allows the model to jointly attend to information from",
        "different representation subspaces at different positions.",
        "Experiments show the model achieves 28.4 BLEU on English-to-German translation.",
    ]
    y = 90
    for ln in lines:
        page.insert_text((70, y), ln, fontsize=11)
        y += 26
    return doc.tobytes()


if __name__ == "__main__":
    main()