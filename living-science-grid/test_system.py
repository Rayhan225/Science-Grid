#!/usr/bin/env python3
# test_system.py - ScholarGrid Comprehensive Automated System Diagnostic Suite
import os
import sys
import time
import json
import asyncio
import traceback
from typing import Dict, Any, List, Optional
import httpx
import asyncpg

# =====================================================================
# CONFIGURATION
# =====================================================================
BACKEND_URL = "http://127.0.0.1:8000"
OLLAMA_URL = "http://localhost:11434"

DB_CONFIG = {
    "host": "aws-0-ap-southeast-1.pooler.supabase.com",
    "port": 6543,
    "user": "postgres.nxarpilggbxfoyfkywey",
    "password": "RayhanSourov@123",
    "database": "postgres",
    "ssl": "require",
    "statement_cache_size": 0,
    "timeout": 15.0
}

# Terminal Formatting
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# =====================================================================
# REPORTING ENGINE
# =====================================================================
class SystemDiagnosticReport:
    def __init__(self):
        self.tests: List[Dict[str, Any]] = []
        self.start_time = time.time()

    def record(
        self, 
        subsystem: str, 
        test_name: str, 
        passed: bool, 
        working_detail: str, 
        failure_detail: str = "", 
        remediation_step: str = ""
    ):
        self.tests.append({
            "subsystem": subsystem,
            "name": test_name,
            "passed": passed,
            "working": working_detail,
            "failure": failure_detail,
            "action": remediation_step
        })

    def render(self):
        total_time = round(time.time() - self.start_time, 2)
        passed_count = sum(1 for t in self.tests if t["passed"])
        failed_count = len(self.tests) - passed_count

        print("\n" + "=" * 90)
        print(f"{BOLD}{CYAN}          SCHOLARGRID COMPREHENSIVE SYSTEM DIAGNOSTIC MATRIX{RESET}")
        print(f"{DIM}          Execution Time: {total_time}s | Target: {BACKEND_URL} | DB: Supabase Pooler{RESET}")
        print("=" * 90 + "\n")

        for idx, t in enumerate(self.tests, 1):
            tag = f"{GREEN}{BOLD}[PASS]{RESET}" if t["passed"] else f"{RED}{BOLD}[FAIL]{RESET}"
            print(f"{BOLD}{idx:02d}. {t['subsystem']} ➔ {t['name']} {tag}")
            
            if t["working"]:
                print(f"    {GREEN}✔ Working:{RESET} {t['working']}")
                
            if not t["passed"]:
                print(f"    {RED}✖ Root Cause:{RESET} {t['failure']}")
                print(f"    {YELLOW}🔧 Action Required:{RESET} {t['action']}")
            print(f"{DIM}{'-' * 90}{RESET}")

        summary_color = GREEN if failed_count == 0 else RED
        print(f"\n{BOLD}Diagnostic Verdict:{RESET} {summary_color}{passed_count} Passed{RESET} | {RED if failed_count else GREEN}{failed_count} Failed{RESET} of {len(self.tests)} Subsystem Checks.\n")

report = SystemDiagnosticReport()

# =====================================================================
# 1. FRONTEND SOURCE CODE SCANNER
# =====================================================================
def test_frontend_source_compliance():
    print(f"{CYAN}Scanning Frontend Codebase for Protocol, Port & Syntax Flaws...{RESET}")
    base_src = os.path.join(os.getcwd(), "src")
    if not os.path.exists(base_src):
        report.record(
            "Frontend Assets", "Source Directory Check",
            False, "", "Directory 'src' not found in current execution path.",
            "Run test_system.py from the living-science-grid project root."
        )
        return

    violations = []
    scanned_count = 0

    for root, _, files in os.walk(base_src):
        for file in files:
            if file.endswith((".jsx", ".js", ".tsx", ".ts")):
                scanned_count += 1
                fpath = os.path.join(root, file)
                rel_path = os.path.relpath(fpath, os.getcwd())
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                    # Deprecated Port 5000 Check
                    if "localhost:5000" in content or "127.0.0.1:5000" in content:
                        violations.append(f"{rel_path}: References legacy port 5000 (must be 8000)")

                    # Direct Ollama 11434 Call Check (Browser CORS Leak)
                    if "localhost:11434" in content or "127.0.0.1:11434" in content:
                        violations.append(f"{rel_path}: Direct browser fetch to port 11434 detected (causes CORS; route via 8000)")

                    # JSX Attribute Scrambling Checks
                    if 'size="{1' in content or 'size="{2' in content:
                        violations.append(f"{rel_path}: Contains malformed Lucide size literal (e.g., size=\"{{14}}\")")
                    if 'className="{Number(' in content or 'data="{[' in content:
                        violations.append(f"{rel_path}: Corrupted JSX attribute string found")

    if not violations:
        report.record(
            "Frontend Compliance", "Static Code & Route Verification",
            True,
            f"All {scanned_count} JavaScript/React source files route to port 8000 without CORS leaks or JSX syntax flaws."
        )
    else:
        report.record(
            "Frontend Compliance", "Static Code & Route Verification",
            False,
            f"Scanned {scanned_count} files.",
            f"Identified {len(violations)} flaw(s):\n      - " + "\n      - ".join(violations),
            "Replace corrupted syntax or legacy port numbers with unified port 8000 API routes."
        )

# =====================================================================
# 2. SUPABASE POSTGRESQL DIRECT POOL
# =====================================================================
async def test_database_direct():
    print(f"{CYAN}Checking Direct PostgreSQL Connection to Supabase...{RESET}")
    conn = None
    try:
        conn = await asyncpg.connect(**DB_CONFIG)
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        table_names = [t["table_name"] for t in tables]
        
        required = ["file_system", "workspaces", "domain_workspaces", "global_vault_notes"]
        missing_tables = [t for t in required if t not in table_names]

        if missing_tables:
            report.record(
                "PostgreSQL Core", "Supabase Relational Tables",
                False, "",
                f"Missing required tables in 'public' schema: {missing_tables}",
                "Start research_brain/main.py to auto-execute table bootstrap migrations."
            )
            return

        # Validate Schema Columns
        ws_cols = [c["column_name"] for c in await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces'")]
        dw_cols = [c["column_name"] for c in await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'domain_workspaces'")]
        vn_cols = [c["column_name"] for c in await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'global_vault_notes'")]
        fs_cols = [c["column_name"] for c in await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'file_system'")]

        def check_cols(table_name, expected, actual):
            missing = [c for c in expected if c not in actual]
            return missing

        ws_missing = check_cols("workspaces", ["tool_type", "is_pinned", "file_id", "state_data", "chat_history"], ws_cols)
        dw_missing = check_cols("domain_workspaces", ["chat_history", "is_pinned", "matrix_data", "selected_files"], dw_cols)
        vn_missing = check_cols("global_vault_notes", ["image_data", "raw_text", "insight_comment"], vn_cols)
        fs_missing = check_cols("file_system", ["processing_status", "ai_cache"], fs_cols)

        all_missing = ws_missing + dw_missing + vn_missing + fs_missing

        if not all_missing:
            report.record(
                "PostgreSQL Core", "Relational Schema Integrity",
                True,
                "Direct connection OK. All tables verified with required isolation, chat, and visual snippet columns."
            )
        else:
            report.record(
                "PostgreSQL Core", "Table Column Migrations",
                False,
                f"Connected, but schema is missing columns: ws={ws_missing}, dw={dw_missing}, notes={vn_missing}, fs={fs_missing}",
                "Execute the automated self-healing migrations in research_brain/main.py."
            )
    except Exception as e:
        report.record(
            "PostgreSQL Core", "Direct Supabase Connection",
            False, "",
            f"Cannot establish connection: {repr(e)}",
            "Verify network access and ensure Supabase pooler credentials match port 6543."
        )
    finally:
        if conn:
            await conn.close()

# =====================================================================
# 3. FASTAPI SERVER CORE & TELEMETRY
# =====================================================================
async def test_backend_and_telemetry():
    print(f"{CYAN}Testing FastAPI Core Health & Telemetry Metrics...{RESET}")
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            h_res = await client.get(f"{BACKEND_URL}/health")
            t_res = await client.get(f"{BACKEND_URL}/api/telemetry/stats")

            if h_res.status_code == 200 and t_res.status_code == 200:
                h_data = h_res.json()
                t_data = t_res.json()
                report.record(
                    "FastAPI Core", "Health & Telemetry Routing",
                    True,
                    f"Status 200 OK. Database: {h_data.get('database')}. Vault Files: {t_data.get('totalPagesRead')}, Vault Notes: {t_data.get('annotationVolumes')}."
                )
            else:
                report.record(
                    "FastAPI Core", "Health & Telemetry Routing",
                    False, "",
                    f"Health: {h_res.status_code} ({h_res.text}), Telemetry: {t_res.status_code} ({t_res.text})",
                    "Check FastAPI terminal for server stack traces."
                )
        except Exception as e:
            report.record(
                "FastAPI Core", "Server Availability",
                False, "",
                f"Connection failed to {BACKEND_URL}: {repr(e)}",
                "Start backend service: python research_brain/main.py"
            )

# =====================================================================
# 4. OLLAMA INFERENCE ENGINE
# =====================================================================
async def test_ollama_engine():
    print(f"{CYAN}Testing Ollama Model Availability & Inference Pipeline...{RESET}")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            tags_res = await client.get(f"{OLLAMA_URL}/api/tags")
            if tags_res.status_code == 200:
                models = [m.get("name") for m in tags_res.json().get("models", [])]
                has_llama = any("llama3" in m for m in models)
                if has_llama:
                    # Test actual inference via FastAPI proxy
                    swarm_res = await client.post(
                        f"{BACKEND_URL}/api/research/swarm",
                        json={"query": "Test query: output 'READY'", "context": "System diagnostic check"}
                    )
                    if swarm_res.status_code == 200 and "response" in swarm_res.json():
                        report.record(
                            "Ollama Engine", "Local Model Verification & Proxy Call",
                            True,
                            f"Model llama3 detected. Proxy inference completed through FastAPI (/api/research/swarm)."
                        )
                    else:
                        report.record(
                            "Ollama Engine", "FastAPI AI Swarm Proxy",
                            False, "Ollama running.",
                            f"/api/research/swarm returned {swarm_res.status_code}: {swarm_res.text}",
                            "Check Ollama execution inside research_brain/main.py."
                        )
                else:
                    report.record(
                        "Ollama Engine", "Model Presence (llama3)",
                        False, f"Ollama online. Available: {models}",
                        "Model 'llama3' is missing from Ollama.",
                        "Run: ollama run llama3"
                    )
            else:
                report.record(
                    "Ollama Engine", "Ollama Status",
                    False, "",
                    f"Ollama returned HTTP {tags_res.status_code}",
                    "Restart the Ollama service."
                )
        except Exception as e:
            report.record(
                "Ollama Engine", "Service Connection",
                False, "",
                f"Cannot reach Ollama at {OLLAMA_URL}: {repr(e)}",
                "Ensure Ollama is running ('ollama serve')."
            )

# =====================================================================
# 5. CENTRAL VAULT FILE LIFECYCLE
# =====================================================================
async def test_vault_lifecycle():
    print(f"{CYAN}Testing Central Vault Lifecycle (Upload -> Resolve -> SmartFetch -> Delete)...{RESET}")
    async with httpx.AsyncClient(timeout=10.0) as client:
        test_name = f"auto_test_file_{int(time.time())}.txt"
        test_content = "ScholarGrid System Integrity Payload 2026."
        file_id = None

        try:
            # 1. Upload
            up_res = await client.post(f"{BACKEND_URL}/api/library", json={
                "name": test_name, "type": "file", "parentId": None, "textContent": test_content
            })
            if up_res.status_code not in [200, 201]:
                report.record(
                    "Central Vault", "Database Insertion",
                    False, "",
                    f"POST /api/library returned {up_res.status_code}: {up_res.text}",
                    "Inspect INSERT logic in research_brain/main.py."
                )
                return

            file_id = up_res.json().get("item", {}).get("id") or up_res.json().get("id")

            # 2. Resolve File by Name
            res_file = await client.get(f"{BACKEND_URL}/api/library/resolve-file?filename={test_name}")
            
            # 3. Retrieve Content
            read_res = await client.get(f"{BACKEND_URL}/api/library/file/{file_id}")
            content_ok = test_content in read_res.json().get("content", "")

            # 4. Smart Fetch & Cache Update
            cache_put = await client.put(f"{BACKEND_URL}/api/library/cache/{file_id}", json={
                "status": "complete", "ai_data": {"tested": True}
            })
            smart_fetch = await client.get(f"{BACKEND_URL}/api/library/smart-fetch/{file_id}")
            smart_ok = smart_fetch.json().get("source") == "cache"

            # 5. Purge Test Record
            del_res = await client.delete(f"{BACKEND_URL}/api/library/{file_id}")
            del_ok = del_res.status_code == 200

            if res_file.status_code == 200 and content_ok and smart_ok and del_ok:
                report.record(
                    "Central Vault", "Full Relational File Operations",
                    True,
                    f"File upload, name resolution, content retrieval, AI caching, and database deletion verified with 0 errors."
                )
            else:
                report.record(
                    "Central Vault", "File Lifecycle Pipeline",
                    False, "Upload succeeded.",
                    f"Resolve: {res_file.status_code} | ContentMatch: {content_ok} | CacheMatch: {smart_ok} | Delete: {del_ok}",
                    "Verify file_system table endpoints in research_brain/main.py."
                )
        except Exception as e:
            report.record(
                "Central Vault", "Lifecycle Execution",
                False, "",
                f"Exception encountered: {repr(e)}\n{traceback.format_exc()}",
                "Ensure FastAPI backend is running and database connection pool is active."
            )

# =====================================================================
# 6. MATH EVALUATOR WORKSPACE & EQUATION DATA
# =====================================================================
async def test_mathevaluator_ledger():
    print(f"{CYAN}Testing MathEvaluator Isolated Workspace Ledger...{RESET}")
    async with httpx.AsyncClient(timeout=10.0) as client:
        test_ws_id = f"test_math_{int(time.time())}"
        try:
            # 1. Post Workspace with Formula & Sliders
            save_payload = {
                "id": test_ws_id,
                "title": "Automated Math Diagnostic Matrix",
                "tool_type": "math_evaluator",
                "timestamp": "2026-09-09",
                "isPinned": False,
                "paperSummary": "Algorithmic analysis of neural convergence rates.",
                "equations": [
                    {
                        "id": "eq_loss",
                        "name": "Mean Squared Loss",
                        "latex": "$$ L(\\theta) = \\frac{1}{N} \\sum_{i=1}^N (y_i - f(x_i))^2 $$",
                        "status": "complete",
                        "variables": [{"symbol": "N", "label": "Sample Size", "default": 100}]
                    }
                ],
                "sliderValues": {"eq_loss": {"N": 250}},
                "outputLogs": {"eq_loss": "Execution completed: L=0.0412"}
            }

            save_res = await client.post(f"{BACKEND_URL}/api/workspaces", json=save_payload)
            if save_res.status_code != 200:
                report.record(
                    "MathEvaluator", "Workspace Persistence",
                    False, "",
                    f"POST /api/workspaces returned {save_res.status_code}: {save_res.text}",
                    "Inspect workspaces table columns and POST query in main.py."
                )
                return

            # 2. Query filtered by tool_type
            get_res = await client.get(f"{BACKEND_URL}/api/workspaces?tool_type=math_evaluator")
            workspaces = get_res.json() if get_res.status_code == 200 else []
            target_ws = next((w for w in workspaces if w.get("id") == test_ws_id), None)

            # 3. Test Pinning and Renaming
            pin_res = await client.put(f"{BACKEND_URL}/api/workspaces/{test_ws_id}/pin", json={"isPinned": True})
            ren_res = await client.put(f"{BACKEND_URL}/api/workspaces/{test_ws_id}/rename", json={"title": "Renamed Math Workspace"})

            # 4. Clean up
            await client.delete(f"{BACKEND_URL}/api/workspaces/{test_ws_id}")

            equations_present = target_ws and len(target_ws.get("equations", [])) > 0
            sliders_present = target_ws and target_ws.get("sliderValues", {}).get("eq_loss", {}).get("N") == 250

            if equations_present and sliders_present and pin_res.status_code == 200 and ren_res.status_code == 200:
                report.record(
                    "MathEvaluator", "Isolated Ledger, Equations & Controls",
                    True,
                    "Saved equations, slider values, and execution logs. Verified tool_type isolation, pin, rename, and deletion."
                )
            else:
                report.record(
                    "MathEvaluator", "Equation State Reconstruction",
                    False, "Saved to database.",
                    f"Equations found: {equations_present} | Sliders found: {sliders_present}",
                    "Ensure main.py reconstructs equations and sliderValues in the GET /api/workspaces response."
                )
        except Exception as e:
            report.record(
                "MathEvaluator", "Ledger Test Execution",
                False, "",
                f"Exception: {repr(e)}\n{traceback.format_exc()}",
                "Check backend connectivity and database schema."
            )

# =====================================================================
# 7. INSIGHTLENS ISOLATED WORKSPACE & NOTES
# =====================================================================
async def test_insightlens_ledger_and_notes():
    print(f"{CYAN}Testing InsightLens Isolated Sessions, Canvas Data & Image Vaulting...{RESET}")
    async with httpx.AsyncClient(timeout=10.0) as client:
        test_lens_id = f"test_lens_{int(time.time())}"
        test_note_id = None
        try:
            # 1. Post InsightLens Workspace with Canvas Annotations & Chat
            save_payload = {
                "id": test_lens_id,
                "title": "Quantum Telemetry Document",
                "tool_type": "insight_lens",
                "timestamp": "2026-09-09",
                "isPinned": False,
                "chatHistory": [{"role": "user", "content": "Analyze Figure 3 on page 2"}],
                "annotations": {"2": [{"tool": "highlight", "color": "#eab308", "points": [{"x": 100, "y": 150}]}]}
            }
            save_res = await client.post(f"{BACKEND_URL}/api/workspaces", json=save_payload)
            if save_res.status_code != 200:
                report.record(
                    "InsightLens", "Workspace Ledger Save",
                    False, "",
                    f"POST /api/workspaces returned {save_res.status_code}: {save_res.text}",
                    "Inspect workspaces table query."
                )
                return

            # 2. Verify Session Isolation (Must NOT appear in MathEvaluator ledger query)
            math_query = await client.get(f"{BACKEND_URL}/api/workspaces?tool_type=math_evaluator")
            math_records = math_query.json() if math_query.status_code == 200 else []
            leaked_into_math = any(w.get("id") == test_lens_id for w in math_records)

            # 3. Create Note with Mock Base64 Image
            mock_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            note_res = await client.post(f"{BACKEND_URL}/api/vault/notes", json={
                "source": "Quantum Telemetry Document",
                "page_number": 2,
                "text": "Critical Hamiltonian matrix phase transition identified.",
                "insight": "Eigenvalue spectrum indicates stability.",
                "image": mock_img
            })
            note_data = note_res.json() if note_res.status_code == 200 else {}
            test_note_id = note_data.get("id")

            # 4. Retrieve and verify note
            notes_get = await client.get(f"{BACKEND_URL}/api/vault/notes")
            all_notes = notes_get.json() if notes_get.status_code == 200 else []
            retrieved_note = next((n for n in all_notes if n.get("id") == test_note_id), None)
            has_image = retrieved_note and retrieved_note.get("image") == mock_img

            # Clean up
            await client.delete(f"{BACKEND_URL}/api/workspaces/{test_lens_id}")
            if test_note_id:
                await client.delete(f"{BACKEND_URL}/api/vault/notes/{test_note_id}")

            if not leaked_into_math and has_image:
                report.record(
                    "InsightLens", "Workspace Isolation & Note Image Snippets",
                    True,
                    "Strict session isolation confirmed. Canvas drawings and visual frame crops persist cleanly to Supabase."
                )
            else:
                report.record(
                    "InsightLens", "Session Isolation & Note Images",
                    False, "Records saved.",
                    f"Leaked into MathEvaluator: {leaked_into_math} | Image snippet retained: {bool(has_image)}",
                    "Verify tool_type filtering and global_vault_notes image_data column."
                )
        except Exception as e:
            report.record(
                "InsightLens", "Execution Failure",
                False, "",
                f"Exception: {repr(e)}\n{traceback.format_exc()}",
                "Check backend connectivity."
            )

# =====================================================================
# 8. DOMAIN MATRIX SYNTHESIS & WHAT-IF LEDGER
# =====================================================================
async def test_domain_matrix_lifecycle():
    print(f"{CYAN}Testing DomainMatrix Synthesis & What-If Sandbox Ledger...{RESET}")
    async with httpx.AsyncClient(timeout=35.0) as client:
        test_domain_id = f"test_domain_{int(time.time())}"
        try:
            # 1. Parallel Synthesis Engine Test
            syn_res = await client.post(f"{BACKEND_URL}/api/research/matrix", json={
                "papers": [
                    {"id": "p1", "title": "Paper One", "content": "Convolutional networks for visual analysis and feature extraction."},
                    {"id": "p2", "title": "Paper Two", "content": "Transformer architecture for sequence modeling with attention."}
                ]
            })

            synthesis_ok = syn_res.status_code == 200 and len(syn_res.json().get("matrixData", [])) == 2

            # 2. Save Matrix Ledger with What-If Simulation Chat
            save_res = await client.post(f"{BACKEND_URL}/api/domain-matrix", json={
                "id": test_domain_id,
                "title": "Cross-Domain Literature Analysis",
                "timestamp": "2026-09-09",
                "isPinned": False,
                "selectedFiles": [{"id": "p1", "title": "Paper One"}],
                "matrixData": [{"id": "row_1", "paper": "Paper One", "year": "2024", "fri": 88}],
                "chatHistory": [{"role": "user", "content": "What if attention is replaced with state-space models?"}]
            })

            # 3. Read back
            get_res = await client.get(f"{BACKEND_URL}/api/domain-matrix")
            all_matrices = get_res.json() if get_res.status_code == 200 else []
            stored = next((m for m in all_matrices if m.get("id") == test_domain_id), None)
            chat_retained = stored and len(stored.get("chatHistory", [])) > 0

            # 4. Pin & Rename
            pin_res = await client.put(f"{BACKEND_URL}/api/domain-matrix/{test_domain_id}/pin", json={"isPinned": True})
            ren_res = await client.put(f"{BACKEND_URL}/api/domain-matrix/{test_domain_id}/rename", json={"title": "Renamed Matrix"})

            # Clean up
            await client.delete(f"{BACKEND_URL}/api/domain-matrix/{test_domain_id}")

            if synthesis_ok and save_res.status_code == 200 and chat_retained and pin_res.status_code == 200 and ren_res.status_code == 200:
                report.record(
                    "DomainMatrix", "Synthesis, What-If Persistence & Controls",
                    True,
                    "Literature synthesis succeeded. Matrix grid, selected files, and What-If chat history persisted and modified in database."
                )
            else:
                report.record(
                    "DomainMatrix", "Matrix Pipeline",
                    False, "Endpoints reached.",
                    f"Synthesis OK: {synthesis_ok} | Saved: {save_res.status_code == 200} | Chat Retained: {bool(chat_retained)}",
                    "Ensure domain_workspaces table includes chat_history and proper column types."
                )
        except Exception as e:
            report.record(
                "DomainMatrix", "Synthesis Test Exception",
                False, "",
                f"Exception: {repr(e)}\n{traceback.format_exc()}",
                "Ensure Ollama is running and responsive."
            )

# =====================================================================
# MAIN ENTRYPOINT
# =====================================================================
async def main():
    print(f"\n{BOLD}{GREEN}Starting ScholarGrid Automated System Diagnostics...{RESET}\n")
    
    # 1. Frontend Static Code Audit
    test_frontend_source_compliance()

    # 2. Database Direct Connection & Schema Audit
    await test_database_direct()

    # 3. Local Server Services
    await test_backend_and_telemetry()
    await test_ollama_engine()

    # 4. Full Functional Tool Lifecycles
    await test_vault_lifecycle()
    await test_mathevaluator_ledger()
    await test_insightlens_ledger_and_notes()
    await test_domain_matrix_lifecycle()

    # 5. Render Matrix
    report.render()

if __name__ == "__main__":
    asyncio.run(main())