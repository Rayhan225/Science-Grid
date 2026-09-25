"""Run every ScholarGrid test suite in order and emit a combined summary.

Suites run (in order):
  1. tests/test_backend_api.py        - FastAPI + Express HTTP contracts (API only)
  2. tests/test_database.py           - Postgres schema, constraints, triggers, RLS-ish checks
  3. tests/test_frontend_selenium.py  - Selenium UI flows on the live Vite app (fresh @test.local users)
  4. tests/test_user_workflows.py     - End-to-end persona + fresh-user journeys (UI + API + DB)
  5. tests/test_llm_features.py       - Local SLM LLM endpoints + JSON grammar + DB persistence
  6. tests/test_llm_ui_selenium.py    - Selenium: LLM-native views render real local-LLM output

Each suite runs in its own subprocess with `-X utf8` (Windows console is cp1252).
The suites are designed not to disturb each other: demo/seeded accounts are
read-only from the tests' perspective, and every `@test.local` account created
by a suite is removed by that suite when it finishes.

Run:  python tests/run_all_tests.py
      python tests/run_all_tests.py --only backend,db   # subsets: backend, db, ui, workflows, llm
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import requests

TESTS_DIR = Path(__file__).resolve().parent
ROOT = TESTS_DIR.parent
REPORTS = TESTS_DIR / "reports"
PY = sys.executable
API_BASE = "http://127.0.0.1:8000"

SUITES = [
    ("backend", "Backend API Suite", "test_backend_api.py", "backend_api_results.json",
     "FastAPI :8000 + Express :5000 HTTP endpoint contracts (pytest-free custom runner)"),
    ("db", "Database Suite", "test_database.py", "database_results.json",
     "PostgreSQL schema, constraints, triggers, and data-integrity checks"),
    ("ui", "Frontend Selenium Suite", "test_frontend_selenium.py", "frontend_selenium_results.json",
     "Selenium UI flows against the live Vite app with fresh @test.local users"),
    ("workflows", "User Workflow Suite", "test_user_workflows.py", "user_workflows_results.json",
     "Persona logins + fresh-user LaTeX create/delete, isolation, theme, cleanup (UI+API+DB)"),
    ("llm", "LLM Features Suite", "test_llm_features.py", "llm_features_results.json",
     "Local SLM endpoints: grammar-constrained math-analyze, rigor-audit, flashcards, PyTorch code, matrix, RAG chat"),
    ("llmui", "LLM-Powered UI Suite", "test_llm_ui_selenium.py", "llm_ui_selenium_results.json",
     "Selenium: MathEvaluator/DomainMatrix/ScholarAudit/InsightLens render real local-LLM output"),
]


def run_suite(script: str, results_json_name: str) -> dict:
    """Run one suite subprocess, capture stdout, and read its results JSON."""
    path = TESTS_DIR / script
    started = time.time()
    print(f"\n{'='*78}\nRUN  {script}\n{'='*78}", flush=True)
    proc = subprocess.run(
        [PY, "-X", "utf8", str(path)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    elapsed = time.time() - started
    out = (proc.stdout or "") + (proc.stderr or "")
    # echo suite output live (it was captured, so print it now)
    for line in out.splitlines():
        print(line, flush=True)

    results_json = REPORTS / results_json_name
    data = None
    if results_json.exists():
        try:
            data = json.loads(results_json.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            data = None

    if data and "passed" in data:
        passed = int(data.get("passed", 0))
        failed = int(data.get("failed", 0))
        total = int(data.get("total", passed + failed))
        status = "PASS" if failed == 0 else "FAIL"
    else:
        passed = failed = total = 0
        status = "PASS" if proc.returncode == 0 else "FAIL"
        total = passed + failed

    return {
        "script": script,
        "results_json_name": results_json_name,
        "status": status,
        "exit_code": proc.returncode,
        "passed": passed,
        "failed": failed,
        "total": total,
        "seconds": round(elapsed, 1),
        "results_json": str(results_json) if results_json.exists() else "",
        "ok": status == "PASS",
    }


def utf8() -> str:
    return "utf8"


def write_combined_report(rows: list[dict]) -> Path:
    REPORTS.mkdir(parents=True, exist_ok=True)
    md = REPORTS / "ALL_SUITES_SUMMARY.md"
    total_pass = sum(r["passed"] for r in rows)
    total_fail = sum(r["failed"] for r in rows)
    total_cases = total_pass + total_fail
    total_sec = round(sum(r["seconds"] for r in rows), 1)
    all_ok = all(r["ok"] for r in rows)

    # Persist the combined sweep into the app's persistent Test History API
    # (best-effort, non-fatal: local reports remain the source of truth).
    try:
        requests.post(f"{API_BASE}/api/tests/history", json=[{
            "suite": "Full Suite",
            "status": "PASS" if all_ok else "FAIL",
            "passed": total_pass, "failed": total_fail, "warned": 0,
            "total": total_cases, "seconds": total_sec,
            "script": "run_all_tests.py",
            "results": {
                "overall": "ALL SUITES PASSED" if all_ok else "FAILURES PRESENT",
                "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
                "passed": total_pass, "failed": total_fail, "total": total_cases,
                "wall_seconds": total_sec,
                "suites": [{
                    "script": r["script"], "status": r["status"],
                    "passed": r["passed"], "failed": r["failed"],
                    "total": r["total"], "seconds": r["seconds"],
                } for r in rows],
            },
        }], timeout=30)
    except Exception:  # noqa: BLE001
        pass

    lines = [
        "# ScholarGrid - Full Test Suite Summary",
        "",
        f"**Overall:** {'ALL SUITES PASSED' if all_ok else 'FAILURES PRESENT'}",
        f"- Cases: {total_pass} passed / {total_fail} failed / {total_cases} total",
        f"- Wall time: {total_sec}s",
        f"- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "| Suite | Script | Result | Passed | Failed | Total | Seconds |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for r in rows:
        lines.append(
            f"| {r['script']} | `{r['script']}` | {'PASS' if r['ok'] else 'FAIL'} "
            f"| {r['passed']} | {r['failed']} | {r['total']} | {r['seconds']} |"
        )
    lines += [
        "",
        "## Per-suite reports",
        "",
    ]
    for r in rows:
        base = (r.get("results_json_name") or "x_results.json").replace("_results.json", "")
        lines.append(f"- `{r['script']}`: `tests/reports/{base}_success_report.md`")
    lines += [
        "",
        "## User-workflow walkthrough",
        "",
        "See `tests/reports/USER_WORKFLOWS.md` for the narrated end-to-end",
        "persona and fresh-account journeys covered by the workflow suite.",
        "",
    ]
    md.write_text("\n".join(lines), encoding="utf-8")

    (REPORTS / "ALL_SUITES_SUMMARY.json").write_text(
        json.dumps({"generated": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "passed": total_pass, "failed": total_fail,
                    "total": total_cases, "suites": rows}, indent=2),
        encoding="utf-8")
    return md


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="",
                    help="comma list of suite keys: backend,db,ui,workflows,llm,llmui")
    args = ap.parse_args()
    wanted = [s.strip() for s in args.only.split(",") if s.strip()]
    selected = [s for s in SUITES if not wanted or s[0] in wanted]
    if not selected:
        print("No suites matched --only:", args.only)
        return 2

    print("=" * 78)
    print("ScholarGrid - running test suites:")
    for key, name, script, _res, _desc in selected:
        print(f"  - {key:<10} {script}")
    print("=" * 78)

    rows = []
    t0 = time.time()
    for key, _name, script, res, _desc in selected:
        rows.append(run_suite(script, res))
    wall = round(time.time() - t0, 1)

    md = write_combined_report(rows)

    print("\n" + "=" * 78)
    print("COMBINED SUMMARY")
    print("=" * 78)
    for r in rows:
        flag = "PASS" if r["ok"] else "FAIL"
        print(f"  {flag}  {r['script']:<34} {r['passed']:>3}p {r['failed']:>3}f "
              f"{r['total']:>3}t  {r['seconds']:>6.1f}s")
    tp = sum(r["passed"] for r in rows)
    tf = sum(r["failed"] for r in rows)
    print(f"  {'TOTAL':<40} {tp:>3}p {tf:>3}f {tp+tf:>3}t  {wall:>6.1f}s")
    print(f"\nCombined report: {md}")
    print("Workflow walkthrough: tests/reports/USER_WORKFLOWS.md")
    return 1 if any(not r["ok"] for r in rows) else 0


if __name__ == "__main__":
    sys.exit(main())
