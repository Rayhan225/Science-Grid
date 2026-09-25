"""
ScholarGrid — LLM-Powered UI Test Suite (Selenium).

Drives the four LLM-native views against the LIVE Vite app (:5173) + FastAPI (:8000)
and asserts that what renders in the browser reflects REAL local-LLM output
(grammar-constrained JSON -> React state -> DOM), not heuristic fallbacks:

  1. MathEvaluator  : "Run Evaluation" on a typed formula -> Concept & Definition
                      deck + Secure WASM Sandbox python subroutine carry the LLM's
                      prose/pythonCode (real content, executable contract).
  2. DomainMatrix   : select 2 vault papers -> Run Engine -> comparative matrix
                      rows with extracted prose (no generic fallback records).
  3. ValidationRigor: paste manuscript -> Run Full ScholarAudit -> GRADE pill, an
                      Executive Peer-Review Synthesis paragraph, methodology flags.
  4. InsightLens    : mount a PDF stream -> copilot chat answer citing [Page N].

The suite consumes only the running servers. A fresh `@test.local` account and
every row it creates (library/vault files, math sessions, matrix auto-saves,
audit ledger entries, insight workspaces/papers) are removed before it exits.

Run:  python tests/test_llm_ui_selenium.py
"""

from __future__ import annotations

import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
import re as _re
from selenium.webdriver.common.by import By
from harness import (API_BASE, FRONTEND_URL, TEST_PASSWORD, SuiteResult,
                      api_register, cleanup_user, connect_db, make_email,
                      write_report, UI)

RES = SuiteResult("LLM-Powered UI Testing (Selenium)")
_report_md = Path(__file__).resolve().parent / "reports" / "llm_ui_selenium_success_report.md"
_report_json = Path(__file__).resolve().parent / "reports" / "llm_ui_selenium_results.json"

_PDF_PATH = Path(__file__).resolve().parent / "screenshots" / "_llm_ui_probe.pdf"

# Fallback markers emitted by the local heuristics when the LLM path is bypassed.
MATH_FALLBACK_TAIL = "parametric mapping evaluated across continuous empirical coordinates"
AUDIT_PLACEHOLDER_TAIL = "presents an academically sound and theoretically consistent formulation"
MATRIX_FALLBACK_MARKERS = ("Empirical Research Corpus", "Neural Transformer Framework",
                           "evaluated on empirical matrices", "Benchmark validation corpus")


# --------------------------------------------------------------------------
# UI helpers
# --------------------------------------------------------------------------
def _submit_email_password(ui, email, password):
    """Fill the Auth modal login form (Sign In mode) and submit."""
    from selenium.webdriver.common.by import By
    ui.by_placeholder("user@scholargrid.io").clear()
    ui.by_placeholder("user@scholargrid.io").send_keys(email)
    pw = ui.driver.find_element(By.CSS_SELECTOR,
                                "div.fixed.inset-0 input[type='password']")
    pw.clear()
    pw.send_keys(password)
    ui.by_text("Authenticate Session", tag="button").click()
    ui.wait_until_login_settled(timeout=60)


def _open_auth_modal(ui):
    for label in ("Sign In", "Authenticated Portal", "Get Started"):
        if ui.click_visible_text(label, timeout=5):
            break
    ui.text_present("1-Click Quick Demo Role Access", timeout=25)


def _login_ui(ui, email):
    ui.driver.get(FRONTEND_URL)
    _open_auth_modal(ui)
    _submit_email_password(ui, email, TEST_PASSWORD)
    ok = ui.text_present("ScholarGrid Research Command.", timeout=45)
    ui.warm_view_chunks(timeout=180)
    return ok


def _body_text(ui):
    return ui.driver.find_element(By.TAG_NAME, "body").text


def _wait_body_has(ui, *markers, timeout=300, interval=3.0, absent=None):
    """Wait until body text contains every marker (and none of `absent`)."""
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        last = _body_text(ui)
        if all((m or "").lower() in last.lower() for m in markers if m):
            if absent and any((a or "").lower() in last.lower() for a in absent):
                pass
            else:
                return last
        time.sleep(interval)
    return last


def _read_textarea(ui, placeholder_fragment):
    from selenium.webdriver.common.by import By
    el = ui.driver.find_element(
        By.XPATH, f"//textarea[contains(@placeholder, '{placeholder_fragment}')]")
    return el


# --------------------------------------------------------------------------
# Seeding helpers (rows live under the fresh @test.local user -> cleaned up)
# --------------------------------------------------------------------------
def _seed_library_file(uid, name, content):
    r = requests.post(f"{API_BASE}/api/library", timeout=60, json={
        "name": name, "type": "file", "textContent": content, "userId": uid,
    })
    body = r.json() if r.status_code == 200 else {}
    return body.get("item", {}).get("id")


def _seed_vault_papers(uid):
    papers = [
        ("Neural_Neural_Machine_Translation.txt",
         ("The Transformer architecture relies solely on attention mechanisms, dispensing with "
          "recurrence and convolutions. Training on WMT 2014 English-to-German achieved a BLEU of "
          "28.4, outperforming the recurrent baseline. Multi-head attention with 8 heads, d_model=512, "
          "Adam optimizer with learning rate 0.0001 and 250k steps on 8 GPUs.")),
        ("Cardiac_MRI_Segmentation.txt",
         ("We propose a 3D U-Net for multi-class cardiac MRI segmentation. The model was trained on "
          "the ACDC 2017 dataset (150 subjects) with a Dice score of 0.91 on the test split. "
          "Optimizer: Adam with learning rate 1e-3, batch size 8, 31.5M parameters, 5-fold "
          "cross-validation on a 16GB V100 GPU.")),
    ]
    ids = []
    for name, content in papers:
        fid = _seed_library_file(uid, name, content)
        if fid:
            ids.append(fid)
    return ids


def _build_probe_pdf() -> Path:
    import fitz
    _PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _PDF_PATH.exists():
        return _PDF_PATH
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
    doc.save(str(_PDF_PATH))
    doc.close()
    return _PDF_PATH


# --------------------------------------------------------------------------
# Flow 1 — MathEvaluator
# --------------------------------------------------------------------------
def test_math_evaluator(ui):
    RES.start_section("MathEvaluator — local LLM analysis rendered in equation deck")
    ok = ui.goto_view("Math Evaluator", "Math Evaluator Sandbox", timeout=120)
    RES.record("Navigate to Math Evaluator view", ok, "heading 'Math Evaluator Sandbox'")

    # Type a formulation into the persistent command bar and run it.
    ta = _read_textarea(ui, "Type LaTeX formulation")
    ui._set_value(ta, "y = 2*x + 1")
    ui.driver.find_element("css selector", 'button[title="Run Evaluation"]').click()

    # The pipeline: math-extract -> analyzeSingleEquation (math-analyze LLM) ->
    # deck with Concept & Definition / WASM sandbox. CPU model: allow several minutes.
    body = _wait_body_has(ui, "Concept & Definition", "Secure WASM Sandbox",
                          timeout=480, interval=5)
    body_l = body.lower()
    res_ok = "concept & definition" in body_l and "secure wasm sandbox" in body_l
    RES.record("Equation deck renders Concept & Definition + WASM sandbox after run",
               res_ok, f"deck sections present after pipeline")
    if not res_ok:
        ui.shot("math_eval_timeout")
        return

    # Concept = REAL LLM prose (not the heuristic tail).
    concept = _section_text(ui, "Functional Definition")
    RES.record("MathEvaluator concept is real LLM prose (not fallback)",
               len(concept) > 60 and MATH_FALLBACK_TAIL.lower() not in concept.lower(),
               f"concept[{len(concept)}]={concept[:110]!r}")

    # WASM sandbox python subroutine has the executable evaluate contract.
    code = _section_text(ui, "Python Subroutine")
    RES.record("WASM sandbox python subroutine is the LLM's executable snippet",
               ("def evaluate(variables)" in code or "def " in code) and "print" in code,
               f"code_head={code[:90]!r}")

    # Try actually executing the snippet in Pyodide (network CDN reachable).
    try:
        btn = ui.by_text("Run Script", tag="button", timeout=15)
        ui.driver.execute_script("arguments[0].click();", btn)
        t0 = time.time()
        while time.time() - t0 < 240:
            out = _section_text(ui, "Standard Output")
            if out and "Awaiting script execution call" not in out:
                break
            time.sleep(4)
        RES.record("WASM sandbox executes the LLM snippet via Pyodide",
                   bool(out) and "Awaiting script execution call" not in str(out),
                   f"stdout={str(out)[:120]!r}", warn=not (bool(out) and "Awaiting" not in str(out)))
    except Exception as e:  # noqa: BLE001
        RES.record("WASM sandbox executes the LLM snippet via Pyodide", False,
                   f"script run blocked: {e}", warn=True)
    ui.shot("math_evaluator_result")


def _section_text(ui, heading):
    """Return content rendered under a heading element (h2/h3/h4/div/span) whose
    trimmed text exactly equals `heading` (e.g. 'Functional Definition',
    'Python Subroutine', 'Standard Output', 'Executive Peer-Review Synthesis')."""
    try:
        return ui.driver.execute_script("""
            const want = arguments[0].trim().toLowerCase();
            const els = [...document.querySelectorAll('h2, h3, h4, div, span')];
            const hit = els.find(e =>
                (e.textContent || '').trim().toLowerCase() === want);
            if (!hit) return null;
            const parent = hit.parentElement;
            const later = [...parent.children].filter(c => c !== hit);
            if (later.length) {
                const immediate = later.map(c => (c.textContent || '').trim())
                                       .filter(Boolean).join('\\n');
                // The heading sits in a thin header row (e.g. 'Executive
                // Peer-Review Synthesis' + 'Automated Reviewer #2 Protocol'
                // label): the real content is a sibling block one level up.
                if (immediate.length < 40 && parent.parentElement) {
                    const gp = parent.parentElement;
                    const alt = [...gp.children].filter(c => c !== parent)
                        .map(c => (c.textContent || '').trim()).filter(Boolean).join('\\n');
                    if (alt.trim()) return alt.slice(0, 2500);
                }
                return immediate.slice(0, 2500);
            }
            let rest = '';
            parent.childNodes.forEach(n => {
                if (n.nodeType === 3 && (n.textContent || '').trim()) rest += n.textContent;
            });
            return rest.trim().slice(0, 2500);
        """, heading) or ""
    except Exception:  # noqa: BLE001
        return ""


# --------------------------------------------------------------------------
# Flow 2 — DomainMatrix
# --------------------------------------------------------------------------
def test_domain_matrix(ui, seeded_ids):
    RES.start_section("DomainMatrix — LLM comparative matrix rendered (no fallback rows)")
    ok = ui.goto_view("DomainMatrix AI", "Run Engine", timeout=120) or \
        ui.goto_view("DomainMatrix AI", "Awaiting Literature Ingestion", timeout=120)
    RES.record("Navigate to DomainMatrix view", ok, "'Run Engine' / vault sources visible")

    # Vault file cards (seeded via API) should list for this user.
    body = _wait_body_has(ui, "Neural_Neural_Machine_Translation.txt",
                          "Cardiac_MRI_Segmentation.txt", timeout=120, interval=3)
    body_l = body.lower()
    RES.record("Seeded vault papers listed as selectable cards",
               "neural_neural_machine_translation.txt" in body_l
               and "cardiac_mri_segmentation.txt" in body_l,
               f"card titles present ({len(seeded_ids)} seeds)")

    # Click both file cards, then Run Engine.
    for title in ("Neural_Neural_Machine_Translation.txt", "Cardiac_MRI_Segmentation.txt"):
        ui.click_visible_text(title, timeout=20)
    time.sleep(1.0)
    ui.by_text("Run Engine", tag="button", timeout=20).click()

    # Wait for the matrix table (LLM call takes ~1-3 min) and check for real content.
    body = _wait_body_has(ui, "Paper & Year", timeout=420, interval=5)
    body_l = body.lower()
    table_ok = "paper & year" in body_l
    RES.record("Comparative matrix table rendered after Run Engine", table_ok,
               "header 'Paper & Year' present")
    if table_ok:
        no_fallback = all(m.lower() not in body_l for m in MATRIX_FALLBACK_MARKERS)
        RES.record("Matrix rows are REAL LLM extraction (no generic fallback records)",
                   no_fallback,
                   f"fallback markers absent; len(body)={len(body)}")
        real_signal = any(k in body_l for k in ("bleu", "attention", "transformer")) and \
                      any(k in body_l for k in ("acdc", "mri", "dice", "u-net"))
        RES.record("Matrix rows echo the seeded papers' real specifics",
                   real_signal, f"BLEU/attention + ACDC/MRI signals present")
    else:
        ui.shot("domain_matrix_timeout")
    ui.shot("domain_matrix_result")


# --------------------------------------------------------------------------
# Flow 3 — ValidationRigor
# --------------------------------------------------------------------------
def test_validation_rigor(ui):
    RES.start_section("ValidationRigor — ScholarAudit LLM critique rendered")
    ok = ui.goto_view("ScholarAudit", "ScholarAudit Integrity & Peer-Review Engine", timeout=120)
    RES.record("Navigate to ScholarAudit view", ok, "heading rendered")

    manuscript = ("We introduce a novel neural architecture. The proposed method achieves "
                  "94.2% accuracy on the benchmark. We evaluate on N=128 samples without "
                  "statistical significance testing. No baseline comparison or ablation study "
                  "is provided. The loss function is L(y, yhat) = -sum y log yhat. Claims of "
                  "state-of-the-art performance lack confidence intervals.")
    # The editor textarea only mounts after the workspace is active: click the
    # quick-start "Load Benchmark Demo" to open a workspace, then switch the
    # manuscript viewport to Source Code (shows the editable textarea).
    ui.click_visible_text("Load Benchmark Demo", timeout=30)
    ui.click_visible_text("Source Code", timeout=30)
    ta = _read_textarea(ui, "Paste research manuscript")
    ui._set_value(ta, manuscript)

    ui.by_text("Run Full ScholarAudit (Institutional Rigor Scan)", tag="button", timeout=30).click()

    # Audit runs rigor-audit (LLM) concurrent with 3 fast checkers.
    body = _wait_body_has(ui, "GRADE:", "Executive Peer-Review Synthesis", timeout=420, interval=5)
    body_l = body.lower()
    RES.record("ScholarAudit results panel renders GRADE pill + synthesis",
               "grade:" in body_l and "executive peer-review synthesis" in body_l,
               f"results panel present")

    summary = _section_text(ui, "Executive Peer-Review Synthesis")
    RES.record("Peer-Review Synthesis is real LLM critique (not default placeholder)",
               len(summary) > 80 and AUDIT_PLACEHOLDER_TAIL.lower() not in summary.lower(),
               f"summary[{len(summary)}]={summary[:130]!r}")

    # Methodology Flags tab shows severity-tagged issues from the audit.
    ui.click_visible_text("Methodology Flags", timeout=15)
    body = _wait_body_has(ui, "Showing", "flag(s)", timeout=60, interval=3)
    body_l = body.lower()
    flags_ok = "flag(s)" in body_l and "showing" in body_l
    RES.record("Methodology Flags tab renders severity-filtered flags",
               flags_ok, "Showing N flag(s) control present")
    if flags_ok:
        import re as _re
        m = _re.search(r"showing (\d+) flag\(s\)", body_l)
        n_flags = int(m.group(1)) if m else 0
        RES.record("Article flags carry actionable content (severity/title text)",
                   n_flags >= 1, f"flag count={n_flags}")
    ui.shot("validation_rigor_result")


# --------------------------------------------------------------------------
# Flow 4 — InsightLens (PDF mount + grounded copilot chat)
# --------------------------------------------------------------------------
def test_insight_lens(ui):
    RES.start_section("InsightLens — PDF mount + grounded copilot answering with pages")
    ok = _open_insightlens_nav(ui)
    RES.record("Navigate to InsightLens view", ok, "manual opened")

    # Close the manual so the reader (Mount PDF Stream) is reachable.
    ui.click_visible_text("Acknowledge & Close Manual", timeout=20)
    time.sleep(1.0)

    pdf = _build_probe_pdf()
    from selenium.webdriver.common.by import By
    inp = ui.driver.find_element(
        By.CSS_SELECTOR, "input[type='file'][accept='application/pdf']")
    inp.send_keys(str(pdf))

    # Extraction pipeline: client PDF parse -> swarm summary (LLM) -> SLM ingest.
    # Mounting replaces the empty-state label with the reader (pdfFile set).
    _wait_body_has(ui, absent=["Mount PDF Stream"], timeout=120, interval=4)
    # Chat input becomes active once paperData is set.
    deadline = time.time() + 600
    chat_ready = False
    while time.time() < deadline:
        try:
            el = ui.driver.find_element(
                By.XPATH, "//input[@placeholder='Ask document questions (cites exact pages)...']")
            if el.is_enabled():
                chat_ready = True
                break
        except Exception:  # noqa: BLE001
            pass
        time.sleep(4)
    RES.record("PDF mounted and copilot chat enabled (paper ingested)",
               chat_ready, "copilot input enabled after extraction pipeline")

    if chat_ready:
        q = "What attention mechanism does this paper propose?"
        ui._set_value(el, q)
        el.submit()
        # The extraction pipeline seeds a welcome assistant bubble, so count
        # copilot bubbles before submitting, then wait for a NEW reply bubble
        # to render (typing pulse gone). Extract the reply text directly from
        # that bubble (the local 3B model cites pages in prose like
        # 'on Page 1 (Chunk ID: ...)' rather than a '[Page N]' bracket).
        n_before = _copilot_bubble_count(ui)
        deadline = time.time() + 480
        answer = ""
        while time.time() < deadline:
            if _copilot_bubble_count(ui) > n_before:
                body_l = _body_text(ui).lower()
                if "evaluating multi-page context" not in body_l:
                    answer = _copilot_reply_text(ui)
                    break
            time.sleep(5)
        answer_l = answer.lower()
        has_page_cite = "[page" in answer_l or bool(
            _re.search(r"page\s*\d+", answer_l))
        has_attention = "attention" in answer_l
        RES.record("Copilot answers the question",
                   len(answer) > 40 and "no response received" not in answer_l
                   and "backend server returned an error" not in answer_l
                   and "local ai execution pipeline offline" not in answer_l,
                   f"agent replied (len={len(answer)})")
        RES.record("Answer cites exact page numbers (RAG grounding)",
                   has_page_cite, "page citation present (bracket or prose)")
        RES.record("Answer is grounded on the document topic",
                   has_attention, "mentions 'attention'")
    ui.shot("insight_lens_result")


def _copilot_bubble_count(ui):
    """Number of rendered InsightLens Copilot assistant chat bubbles."""
    return ui.driver.execute_script("""
        return [...document.querySelectorAll('span')]
            .filter(e => (e.textContent || '').trim() === 'InsightLens Copilot').length;
    """) or 0


def _copilot_reply_text(ui):
    """Text of the most recently rendered InsightLens Copilot bubble.

    Includes the prose answer plus any rendered '[Page N]' RAG citation chips
    (which sit outside the .prose node, below the markdown).
    """
    return ui.driver.execute_script("""
        const spans = [...document.querySelectorAll('span')]
            .filter(e => (e.textContent || '').trim() === 'InsightLens Copilot');
        if (!spans.length) return '';
        const last = spans[spans.length - 1];
        let bubble = last;
        while (bubble && bubble !== document.body
               && !(bubble.className && String(bubble.className).includes('p-4'))) {
            bubble = bubble.parentElement;
        }
        if (!bubble || bubble === document.body) return '';
        const parts = [];
        const prose = bubble.querySelector('.prose');
        if (prose && (prose.textContent || '').trim()) parts.push(prose.textContent.trim());
        [...bubble.querySelectorAll('span')].forEach(s => {
            const t = (s.textContent || '').trim();
            if (t.startsWith('[Page ')) parts.push(t);
        });
        return parts.join('\\n');
    """) or ""


def _open_insightlens_nav(ui):
    """InsightLens opens on its reader; reveal the manual heading like the UI suite."""
    if ui._click_nav_button("InsightLens Reader"):
        try:
            ui.by_css('button[title="View Manual"]', timeout=30).click()
        except Exception:  # noqa: BLE001
            pass
    return ui.text_present("InsightLens User Manual & Operator Guide", timeout=120)


# --------------------------------------------------------------------------
# Runner
# --------------------------------------------------------------------------
def main():
    # 0. Fresh disposable account + two vault papers (all rows cleaned up later).
    email = make_email("llmui")
    r, reg = api_register(email, name="LLM UI Tester", role="researcher")
    uid = reg.get("user", {}).get("id") if isinstance(reg, dict) else None
    RES.record("Register fresh @test.local account", r.status_code in (200, 201) and bool(uid),
               f"HTTP {r.status_code} uid={uid}")
    if not uid:
        print("[FATAL] no user id; aborting")
        sys.exit(1)

    seeds = _seed_vault_papers(uid)
    RES.record("Seed 2 vault papers via /api/library", len(seeds) == 2,
               f"ids={seeds}")

    ui = UI(headless=True)
    conn = None
    try:
        conn = connect_db()
    except Exception as e:  # noqa: BLE001
        print(f"[WARN] DB connection unavailable for cleanup: {e}")

    try:
        logged = _login_ui(ui, email)
        RES.record("UI login as fresh account lands on Command Matrix", logged,
                   "sg_token stored; matrix rendered")

        test_math_evaluator(ui)
        test_domain_matrix(ui, seeds)
        test_validation_rigor(ui)
        test_insight_lens(ui)
    finally:
        ui.quit()
        cleaned = {}
        if conn:
            try:
                removed = cleanup_user(uid, conn)
                cleaned["user_cleanup"] = sum(removed.values())
            except Exception as e:  # noqa: BLE001
                print(f"[WARN] cleanup incomplete: {e}")
                cleaned["user_cleanup"] = -1
        else:
            print("[WARN] no DB connection; cleanup skipped")
        print(f"[CLEANUP] LLM-UI suite removed artifacts: {cleaned}")

    ok, fail = write_report(RES, _report_md, _report_json)
    print(f"\n[s] LLM-Powered UI suite: {ok} passed, {fail} failed -> {_report_md}")
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main()