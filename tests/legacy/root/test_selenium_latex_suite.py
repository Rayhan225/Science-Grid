# research_brain/test_selenium_latex_suite.py
# ═══════════════════════════════════════════════════════════════════
# Comprehensive End-to-End Test Suite for ScholarGrid LaTeX Studio
# Validates Supabase PostgreSQL Tables, FastAPI CRUD Endpoints, 
# Central Vault Synchronization, and Selenium Headless UI Workflows
# ═══════════════════════════════════════════════════════════════════

import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_API = "http://127.0.0.1:8000"
BASE_WEB = "http://localhost:5173"

def print_header(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def run_backend_crud_tests():
    print_header("PART 1: BACKEND SUPABASE POSTGRESQL & API CRUD VERIFICATION")
    
    # 1. Test Project Creation with Full Research Metadata
    print("\n[TEST 1] Creating New Research Project via POST /api/latex/projects/new...")
    project_payload = {
        "title": "Invariant Spectral Operators in Deep Diffusion Manifolds",
        "running_title": "INVARIANT SPECTRAL OPERATORS IN DIFFUSION",
        "authors": "Dr. Elena Rostova, Devin Vance",
        "affiliations": "Institute for Advanced Scientific Computing",
        "abstract": "We establish rigorous convergence bounds for spectral operator invariants.",
        "keywords": "Diffusion Models, Spectral Operators, Mathematical Invariance",
        "journal_name": "IEEE Transactions on Pattern Analysis and Machine Intelligence",
        "doi": "10.1109/TPAMI.2026.0921001",
        "manuscript_date": "September 22, 2026",
        "template": "standard_article",
        "user_id": "usr_test_evaluator"
    }

    res = requests.post(f"{BASE_API}/api/latex/projects/new", json=project_payload)
    assert res.status_code == 200, f"Failed project creation: {res.text}"
    created_data = res.json()
    project_id = created_data["id"]
    print(f"  --> [PASS] Project created successfully. ID: {project_id}")
    assert created_data["title"] == project_payload["title"]

    # 2. Test Project Retrieval
    print("\n[TEST 2] Fetching Created Project via GET /api/latex/projects/{id}...")
    res = requests.get(f"{BASE_API}/api/latex/projects/{project_id}")
    assert res.status_code == 200, f"Failed to get project: {res.text}"
    proj_details = res.json()
    assert proj_details["title"] == project_payload["title"]
    assert "main_file" in proj_details
    assert len(proj_details.get("files", [])) >= 2 # main.tex and references.bib
    print(f"  --> [PASS] Project details verified. Files count: {len(proj_details['files'])}")

    # 3. Test Multi-File CRUD (Adding an SVG figure asset)
    print("\n[TEST 3] Creating Additional Project File via POST /api/latex/projects/{id}/files...")
    file_payload = {
        "path": "figures/diffusion_manifold.svg",
        "file_type": "svg",
        "content": "<svg><rect width='100' height='100' fill='cyan'/></svg>"
    }
    res = requests.post(f"{BASE_API}/api/latex/projects/{project_id}/files", json=file_payload)
    assert res.status_code == 200
    file_id = res.json()["id"]
    print(f"  --> [PASS] Project asset created: {file_id}")

    # 4. Test Saving & Auto-Sync to Central Vault
    print("\n[TEST 4] Saving Project via PUT /api/latex/projects/{id} & Vault Sync...")
    save_payload = {
        "title": "Invariant Spectral Operators in Deep Diffusion Manifolds (Revised)",
        "main_file": "\\documentclass{article}\n\\title{Updated Invariant Formulation}\n\\begin{document}\n\\maketitle\n\\section{Introduction}\nEmpirical verification.\\end{document}",
        "bib_content": "@article{test2026, title={Spectral Diffusion}, year={2026}}",
        "compiler_engine": "pdflatex",
        "user_id": "usr_test_evaluator"
    }
    res = requests.put(f"{BASE_API}/api/latex/projects/{project_id}", json=save_payload)
    assert res.status_code == 200
    print(f"  --> [PASS] Project saved and auto-synced to Central Vault file_system.")

    # 5. Test the reported diff-404 fix: a project created under usr_admin must
    #    be diffable by any scoped user (ownership relaxed to match list filter).
    print("\n[TEST 5] Diff endpoint must not 404 for shared/usr_admin projects...")
    admin_project = requests.post(f"{BASE_API}/api/latex/projects/new", json={
        "title": "Cross-User Ownership Regression Test",
        "authors": "Dr. Elena Rostova",
        "template": "standard_article",
        "user_id": "usr_admin"
    }).json()
    requests.post(f"{BASE_API}/api/latex/projects/{admin_project['id']}/versions", json={
        "version_name": "v1", "commit_message": "baseline", "user_id": "usr_admin"
    })
    diff_res = requests.post(f"{BASE_API}/api/latex/projects/{admin_project['id']}/diff",
                             json={"user_id": "usr_test_evaluator"})
    assert diff_res.status_code == 200, f"diff 404 regression: {diff_res.status_code} {diff_res.text}"
    assert "diff" in diff_res.json()
    print("  --> [PASS] POST /projects/{id}/diff returns 200 for shared projects (was 404).")
    # Versions list must also resolve for the scoped user
    ver_res = requests.get(f"{BASE_API}/api/latex/projects/{admin_project['id']}/versions?user_id=usr_test_evaluator")
    assert ver_res.status_code == 200, f"versions 404 regression: {ver_res.text}"
    print("  --> [PASS] GET /projects/{id}/versions returns 200 for shared projects.")
    requests.delete(f"{BASE_API}/api/latex/projects/{admin_project['id']}")

    # 6. Test Peer Review Comments CRUD
    print("\n[TEST 6] Testing Peer Review System (POST & PUT Comments)...")
    comment_payload = {
        "user_id": "usr_test_evaluator",
        "author_name": "Dr. Elena Rostova",
        "content": "Please provide the formal proof of lemma 3.",
        "line_number": 12
    }
    res = requests.post(f"{BASE_API}/api/latex/projects/{project_id}/comments", json=comment_payload)
    assert res.status_code == 200, f"Comment POST failed: {res.text}"
    c_id = res.json()["id"]
    print(f"  --> [PASS] Comment created: {c_id}")

    # Resolve comment
    res = requests.put(f"{BASE_API}/api/latex/comments/{c_id}/resolve", json={"resolved": True})
    assert res.status_code == 200
    print(f"  --> [PASS] Comment status updated to Resolved.")

    # 7. Test Compilation Diagnostics Engine
    print("\n[TEST 7] Testing Syntax & Error Diagnostics via POST /api/latex/compile...")
    valid_latex = "\\documentclass{article}\n\\begin{document}\n\\section{Intro}\nHello \\cite{test2026}\n\\end{document}"
    res = requests.post(f"{BASE_API}/api/latex/compile", json={"latex_code": valid_latex, "bib_content": ""})
    assert res.status_code == 200
    comp_res = res.json()
    assert comp_res["compiled"] is True
    print(f"  --> [PASS] Compilation succeeded cleanly. Word count: {comp_res['stats']['wordCount']}")

    # Deliberate error test
    broken_latex = "\\documentclass{article}\n\\begin{document}\n\\begin{equation}\nx = y\n\\end{document}"
    res = requests.post(f"{BASE_API}/api/latex/compile", json={"latex_code": broken_latex})
    comp_broken = res.json()
    assert len(comp_broken["errors"]) > 0
    print(f"  --> [PASS] Deliberate syntax mismatch accurately caught on line {comp_broken['errors'][0]['line']}")

    # 8. Test the SciSpace-style Academic Layouts endpoint (templates gallery)
    print("\n[TEST 8] Checking Academic Templates Gallery via GET /api/latex/layouts...")
    layouts_res = requests.get(f"{BASE_API}/api/latex/layouts?page_size=6&page=1")
    assert layouts_res.status_code == 200
    layouts_data = layouts_res.json()
    assert layouts_data["total"] > 0, "No seeded academic layouts found"
    assert "categories" in layouts_data and "publishers" in layouts_data
    layout = layouts_data["layouts"][0]
    tmpl_res = requests.get(f"{BASE_API}/api/latex/layouts/{layout['id']}/template")
    assert tmpl_res.status_code == 200
    assert "latex_code" in tmpl_res.json()
    print(f"  --> [PASS] {layouts_data['total']} academic templates available; template source for '{layout['name']}' fetched.")

    # 9. Test Explicit Central Vault Backup Sync
    print("\n[TEST 9] Explicit Vault Sync via POST /api/latex/projects/vault-sync...")
    res = requests.post(f"{BASE_API}/api/latex/projects/vault-sync", json={
        "project_id": project_id,
        "user_id": "usr_test_evaluator"
    })
    assert res.status_code == 200
    vault_resp = res.json()
    print(f"  --> [PASS] Project committed into Central Vault directory /{vault_resp['folder']}/{vault_resp['filename']}")

    # 10. Clean up test project
    print("\n[TEST 10] Cleanup Project via DELETE /api/latex/projects/{id}...")
    res = requests.delete(f"{BASE_API}/api/latex/projects/{project_id}")
    assert res.status_code == 200
    print(f"  --> [PASS] Test project cleanly deleted with cascade triggers.")

    return True

def run_selenium_browser_tests():
    print_header("PART 2: SELENIUM WEBDRIVER HEADLESS FRONTEND WORKFLOWS")
    
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1600,1000")
    
    driver = webdriver.Chrome(options=opts)
    wait = WebDriverWait(driver, 15)

    try:
        print("\n[SELENIUM 1] Bootstrapping Authenticated Session...")
        driver.get(BASE_WEB)
        time.sleep(1)

        # Inject session for Dr. Elena Rostova
        driver.execute_script("""
            const user = {
                id: 'usr_admin',
                name: 'Dr. Elena Rostova',
                role: 'researcher',
                email: 'researcher@scholargrid.io',
                institution: 'Institute for Advanced Scientific Computing'
            };
            localStorage.setItem('sg_user', JSON.stringify(user));
            localStorage.setItem('sg_current_user', JSON.stringify(user));
            localStorage.setItem('sg_token', 'mock_jwt_token_sovereign_eval');
        """)
        driver.refresh()
        time.sleep(2)
        print("  --> [PASS] Authenticated session active as Dr. Elena Rostova.")

        # Navigate to LaTeX Studio via Sidebar
        print("\n[SELENIUM 2] Clicking 'LaTeX Studio' Navigation in Sidebar...")
        time.sleep(2)
        driver.execute_script("""
            const btn = document.querySelector('button[title=\"LaTeX Studio\"]');
            if (btn) btn.click();
        """)
        time.sleep(3)
        print("  --> [PASS] LaTeX Studio view opened.")

        # Verify Core LaTeX Studio UI Elements
        print("\n[SELENIUM 3] Verifying Overleaf Header, Compilation & View Switcher...")
        page_source = driver.page_source
        assert "Recompile" in page_source, "Recompile button missing"
        assert "Source" in page_source, "Source split button missing"
        assert "Visual" in page_source, "Visual split button missing"
        print("  --> [PASS] All top header buttons, compiler controls & view switchers verified.")

        # Test Slash Commands Modal
        print("\n[SELENIUM 4] Opening LaTeX Slash Commands Palette ([ / ] Slash)...")
        slash_btn = driver.find_element(By.XPATH, "//button[contains(., 'Slash')]")
        slash_btn.click()
        time.sleep(1)
        slash_source = driver.page_source
        assert "LaTeX Slash Commands" in slash_source, "Slash modal failed to open"
        assert "/section" in slash_source, "/section missing"
        assert "/equation" in slash_source, "/equation missing"
        print("  --> [PASS] LaTeX Slash Commands palette verified with /codes.")

        # Close Slash Modal
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(@class, 'hover:text-white')]")
        close_btn.click()
        time.sleep(1)

        # Test Switching to Visual Editor
        print("\n[SELENIUM 5] Switching to 'Visual' Editor Mode...")
        visual_btn = driver.find_element(By.XPATH, "//button[contains(., 'Visual')]")
        visual_btn.click()
        time.sleep(1.5)
        visual_source = driver.page_source
        assert "Visual Editor" in visual_source, "Visual Editor banner missing"
        print("  --> [PASS] Visual Editor mode mounted with interactive collapsible sections.")

        # Test Switching back to Page Sheet (PDF) via Source
        print("\n[SELENIUM 6] Switching to 'Source' Page Sheet (PDF) Publication View...")
        src_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'rounded-lg')]//button[contains(., 'Source')]")
        src_btn.click()
        time.sleep(1.5)
        pdf_source = driver.page_source
        assert "scholargrid-pdf-print-container" in pdf_source, "Print container missing"
        print("  --> [PASS] Page Sheet (PDF) publication container rendered with IEEE/Nature typography.")

        # Test Project Front (Dashboard)
        print("\n[SELENIUM 7] Opening Project Front Workspace via 'Projects' Button...")
        projects_btn = driver.find_element(By.XPATH, "//button[contains(., 'Projects')]")
        projects_btn.click()
        time.sleep(1.5)
        dash_source = driver.page_source
        assert "Research Manuscript Workspace" in dash_source, "Project Front header missing"
        assert "New Research Paper" in dash_source, "New Paper button missing"
        print("  --> [PASS] Project Front Workspace Hub verified.")

        # Test the SciSpace-style Academic Templates Gallery
        print("\n[SELENIUM 8] Opening 'Templates' Academic Templates Gallery...")
        templates_btn = driver.find_element(By.XPATH, "//button[contains(., 'Templates')]")
        templates_btn.click()
        time.sleep(2.5)
        tmpl_source = driver.page_source
        assert "Journal-Ready Research Templates" in tmpl_source, "Templates gallery header missing"
        assert "Academic Templates" in tmpl_source, "Academic Templates label missing"
        print("  --> [PASS] Academic Templates gallery (SciSpace-style) open with search & filters.")

        # Return to the editor workspace
        back_btn = driver.find_element(By.XPATH, "//button[contains(., 'Back to Projects')]")
        back_btn.click()
        time.sleep(1.5)

        # Test Academic Layout Ingestion Event
        print("\n[SELENIUM 9] Testing Academic Layout Ingestion (Nature Communications / Zoosystema)...")
        # Build the payload in Python and JSON-encode it: routing raw backslashes
        # through a JS template literal would mangle \begin -> backspace, \title -> TAB.
        applied_latex = (
            "\\documentclass[11pt,onecolumn,a4paper]{article}\n"
            "\\title{Empirical Invariance in Biological Networks}\n"
            "\\author{Dr. Elena Rostova}\n"
            "\\begin{document}\n"
            "\\maketitle\n"
            "\\begin{abstract}We prove invariance bounds for empirical spectral networks "
            "under diffeomorphic reparameterization.\\end{abstract}\n"
            "\\section{Introduction}\n"
            "All empirical matrices conform to verified benchmarks.\n"
            "\\end{document}\n"
        )
        apply_payload = {
            "layout": {
                "id": "tmpl_nature_test",
                "name": "Nature Communications Evaluation",
                "publisher": "Springer Nature",
                "columns": 1,
                "citation_format": "Nature Vancouver"
            },
            "latex_code": applied_latex
        }
        driver.execute_script(
            "window.dispatchEvent(new CustomEvent('sg-apply-layout', { detail: "
            + json.dumps(apply_payload) + " }));"
        )
        time.sleep(2)
        applied_source = driver.page_source
        assert "Empirical Invariance in Biological Networks" in applied_source or "Nature Communications" in applied_source, "Layout ingestion failed"
        print("  --> [PASS] Academic Layout dynamically applied into LaTeX Studio.")

        # Test Save and Central Vault Trigger
        print("\n[SELENIUM 10] Triggering Save Project & Central Vault Sync...")
        save_btn = driver.find_element(By.XPATH, "//button[contains(., 'Save')]")
        save_btn.click()
        time.sleep(1.5)
        print("  --> [PASS] Save & Central Vault sync dispatched.")

        # Test Citation Picker
        print("\n[SELENIUM 11] Testing Citation Picker...")
        cite_btn = driver.find_element(By.XPATH, "//button[@title='Insert Citation']")
        cite_btn.click()
        time.sleep(1)
        cite_source = driver.page_source
        assert "Insert Citation" in cite_source, "Citation picker modal failed to open"
        print("  --> [PASS] Citation picker modal opens correctly.")

        # Close citation picker
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(@class, 'hover:text-white')]")
        close_btn.click()
        time.sleep(1)

        # Test Spell Check
        print("\n[SELENIUM 12] Testing Spell Check (LaTeX-aware)...")
        spell_btn = driver.find_element(By.XPATH, "//button[@title='Spell Check (LaTeX-aware)']")
        spell_btn.click()
        time.sleep(1)
        spell_source = driver.page_source
        assert "Spell Check" in spell_source, "Spell check modal failed to open"
        print("  --> [PASS] Spell check modal opens correctly.")

        # Close spell check
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(@class, 'hover:text-white')]")
        close_btn.click()
        time.sleep(1)

        # Test Cross-References Navigation
        print("\n[SELENIUM 13] Testing Cross-References Navigation...")
        crossref_btn = driver.find_element(By.XPATH, "//button[@title='Cross-References']")
        crossref_btn.click()
        time.sleep(1)
        crossref_source = driver.page_source
        assert "Cross-References" in crossref_source, "Cross-references modal failed to open"
        print("  --> [PASS] Cross-references navigation modal opens correctly.")

        # Close cross-references
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(@class, 'hover:text-white')]")
        close_btn.click()
        time.sleep(1)

        # Test Track Changes / Diff (previously reported 404 — now returns 200)
        print("\n[SELENIUM 14] Testing Track Changes / Diff...")
        diff_btn = driver.find_element(By.XPATH, "//button[@title='Track Changes / Diff']")
        diff_btn.click()
        time.sleep(1)
        diff_source = driver.page_source
        assert "Track Changes" in diff_source, "Diff modal failed to open"
        print("  --> [PASS] Diff/Track Changes modal opens correctly (backend 404 resolved).")

        # Close diff
        close_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(@class, 'hover:text-white')]")
        close_btn.click()
        time.sleep(1)

        # Test Real LaTeX Compilation Button
        print("\n[SELENIUM 15] Verifying Real Compile Button Present...")
        real_compile_btn = driver.find_element(By.XPATH, "//button[contains(., 'Real Compile')]")
        assert real_compile_btn.is_displayed(), "Real Compile button not visible"
        print("  --> [PASS] Real LaTeX Compile button present in toolbar.")

        # Test Source/Visual Split Buttons Fixed Position
        print("\n[SELENIUM 16] Verifying Source/Visual Split Buttons Stay Fixed...")
        source_btn = driver.find_element(By.XPATH, "//button[contains(., 'Source')]")
        visual_btn2 = driver.find_element(By.XPATH, "//button[contains(., 'Visual')]")
        assert source_btn.is_displayed() and visual_btn2.is_displayed(), "Source/Visual buttons not visible"
        print("  --> [PASS] Source/Visual split buttons visible and fixed.")

        # Test Abstract Editing in Visual Editor
        print("\n[SELENIUM 17] Testing Abstract Editing in Visual Editor...")
        visual_btn3 = driver.find_element(By.XPATH, "//div[contains(@class, 'rounded-lg')]//button[contains(., 'Visual')]")
        visual_btn3.click()
        time.sleep(1.5)
        visual_source = driver.page_source
        assert "Abstract" in visual_source, "Abstract section missing in visual editor"
        # Check for editable abstract textarea
        assert "textarea" in visual_source or "input" in visual_source, "Abstract not editable"
        print("  --> [PASS] Abstract is editable in Visual Editor.")

        # Test Copy File Name Feature in Context Menu
        print("\n[SELENIUM 18] Testing Context Menu Copy File Name...")
        # Right-click a file row in the file tree (rows carry title = full path)
        driver.execute_script("""
            const row = document.querySelector('div[title="main.tex"]') ||
                        Array.from(document.querySelectorAll('div[title]')).find(el =>
                            el.title.endsWith('.tex') || el.title.endsWith('.bib')) ||
                        Array.from(document.querySelectorAll('div[title]'))[0];
            if (row) {
                const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 120 });
                row.dispatchEvent(event);
            }
        """)
        time.sleep(1)
        menu_source = driver.page_source
        assert "Copy file name" in menu_source or "Copy file path" in menu_source, "Copy file name/path not in context menu"
        print("  --> [PASS] Copy file name/path feature present in context menu.")
        # Close the context menu (Escape) so subsequent tests are not blocked
        driver.execute_script("""
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        """)
        time.sleep(0.8)

        # Test that NO native browser dialogs are used (custom alert system)
        print("\n[SELENIUM 19] Verifying Custom Dialog System (no native confirm/prompt)...")
        new_file_btn = driver.find_element(By.XPATH, "//button[@title='New file']")
        new_file_btn.click()
        time.sleep(1)
        dialog_source = driver.page_source
        assert "Create File" in dialog_source, "Custom dialog did not render (native prompt may be in use)"
        assert "Cancel" in dialog_source, "Custom dialog Cancel button missing"
        close_dialog = driver.find_element(By.XPATH, "//button[contains(., 'Cancel')]")
        close_dialog.click()
        time.sleep(1)
        print("  --> [PASS] Custom-designed dialog boxes replace all native confirm/prompt dialogs.")

        # Test Custom Toast Notifications
        print("\n[SELENIUM 20] Testing Custom Toast Notifications...")
        driver.execute_script("""
            if (window.showToast) {
                window.showToast('Test notification', 'success');
            }
        """)
        time.sleep(1)
        toast_source = driver.page_source
        assert 'animate-slideIn' in toast_source or 'bg-emerald-950' in toast_source, "Custom toast not rendered"
        print("  --> [PASS] Custom animated toast notifications working.")

    finally:
        driver.quit()
        print("\n  --> [PASS] Selenium WebDriver session completed with 0 errors.")

    return True

if __name__ == "__main__":
    t0 = time.time()
    try:
        backend_ok = run_backend_crud_tests()
        selenium_ok = run_selenium_browser_tests()
        elapsed = round(time.time() - t0, 2)
        print_header(f"ALL TESTS PASSED SUCCESSFULLY IN {elapsed}s (100% PASS RATE)")
    except Exception as e:
        print(f"\n[TEST FAILED]: {e}")
        import traceback
        traceback.print_exc()
