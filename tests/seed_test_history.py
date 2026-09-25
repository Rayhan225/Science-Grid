"""Seed the persistent Test History (app DB test_runs table) from the local
test reports in tests/reports/.

Reads every *_results.json plus ALL_SUITES_SUMMARY.json and POSTs them to the
app's own `POST /api/tests/history` endpoint, so the existing 339-case history
is mirrored in the website's Test History view.

Run:  python tests/seed_test_history.py           (uses the live FastAPI)
      python tests/seed_test_history.py --api http://127.0.0.1:8000
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import requests

TESTS_DIR = Path(__file__).resolve().parent
REPORTS = TESTS_DIR / "reports"
API = "http://127.0.0.1:8000"


def load_results(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def script_from_results_name(name: str) -> str:
    # "backend_api_results.json" -> "test_backend_api.py"
    return "test_" + name.replace("_results.json", "") + ".py"


def submit(api: str, record: dict) -> dict:
    r = requests.post(f"{api}/api/tests/history", json=record, timeout=60)
    try:
        return {"status": r.status_code, "body": r.json()}
    except Exception:
        return {"status": r.status_code, "body": r.text[:200]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=API)
    ap.add_argument("--commit", action="store_true",
                    help="POST records (default is dry-run)")
    args = ap.parse_args()
    api = args.api

    results_files = sorted(REPORTS.glob("*_results.json"))
    if not results_files:
        print(f"[seed] No *_results.json files found under {REPORTS}")
        return 1

    records = []
    for rf in results_files:
        data = load_results(rf)
        suite = data.get("suite") or rf.stem
        script = script_from_results_name(rf.name)
        passed = int(data.get("passed") or 0)
        failed = int(data.get("failed") or 0)
        warned = int(data.get("warned") or 0)
        total = int(data.get("total") or 0)
        status = "FAIL" if failed else ("WARN" if failed == 0 and warned else "PASS")
        records.append({
            "suite": suite,
            "status": status,
            "passed": passed,
            "failed": failed,
            "warned": warned,
            "total": total,
            "seconds": 0.0,
            "script": script,
            "results": data,
        })
        print(f"[seed] {rf.name}: {passed}p/{failed}f/{total}t -> {script}")

    # Combined aggregate record
    agg_path = REPORTS / "ALL_SUITES_SUMMARY.json"
    if agg_path.exists():
        agg = load_results(agg_path)
        records.append({
            "suite": "Full Suite",
            "status": "PASS" if agg.get("failed") == 0 else "FAIL",
            "passed": int(agg.get("passed") or 0),
            "failed": int(agg.get("failed") or 0),
            "warned": 0,
            "total": int(agg.get("total") or 0),
            "seconds": 0.0,
            "script": "run_all_tests.py",
            "results": agg,
        })
        print(f"[seed] ALL_SUITES_SUMMARY.json: {agg.get('passed')}p/{agg.get('failed')}f aggregate")

    if not args.commit:
        print(f"\n[seed] Dry run: {len(records)} records ready. Re-run with --commit to POST.")
        return 0

    ok = 0
    for rec in records:
        res = submit(api, rec)
        if res["status"] == 200:
            ok += 1
            print(f"[seed] POST ok  -> {rec['script']} | {rec['suite']}")
        else:
            print(f"[seed] POST err {res['status']} -> {rec['script']} | {res['body'][:160]}")

    print(f"\n[seed] {ok}/{len(records)} records persisted to {api}/api/tests/history")
    return 0 if ok == len(records) else 1


if __name__ == "__main__":
    sys.exit(main())