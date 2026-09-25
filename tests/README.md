# ScholarGrid Test Suite

End-to-end automated testing for the ScholarGrid LaTeX Studio system
(React/Vite `:5173` -> FastAPI `:8000` -> Express `:5000` -> Supabase PostgreSQL).

All suites are **non-destructive to the real system**:

- Servers already running (`5173` / `8000` / `5000`) are only *consumed*, never
  restarted, reseeded, or modified.
- Every test-created account uses an email ending in **`@test.local`** and is
  **removed when its suite finishes** (verified by the workflow suite).
- Demo / seeded personas are used **read-only**: login + data-load assertions
  only. Their content is never edited or deleted.

## Suites

| Script                    | Layer | What it covers |
| ------------------------- | ----- | -------------- |
| `test_backend_api.py`     | API   | FastAPI + Express HTTP contracts: auth, latex projects, library, vault notes, profile, quotas. WARNs only for transient/legacy conditions; the live product defects it surfaced (audit offline, Express library POST bug, missing Express `/health`) are now fixed and asserted passing. |
| `test_database.py`        | DB    | PostgreSQL schema, constraints, triggers, cascade deletes, data-integrity checks. |
| `test_frontend_selenium.py` | UI  | Selenium flows against the live Vite app: demo quick-logins, view navigation, settings, fresh `@test.local` registration. |
| `test_user_workflows.py`  | E2E   | The full journeys: per-persona quick login + data loads (LaTeX shared projects, Central Vault files), fresh-account theme snapshot/restore, cross-user isolation (API **and** UI), UI LaTeX create/delete via the New Research Paper modal + trash icon, final cleanup/consistency checks. |
| `test_llm_features.py`    | LLM   | Local SLM endpoints end-to-end: grammar-constrained math-analyze/deep analysis, rigor-audit (+ audit_ledger persistence), flashcards, PyTorch code synthesis, domain matrix, RAG PDF ingest + grounded chat. |
| `test_llm_ui_selenium.py` | UI+LLM| Drives MathEvaluator, DomainMatrix, ScholarAudit (ValidationRigor), and InsightLens in headless Chrome and asserts the DOM reflects REAL local-LLM output (concept decks, matrix rows, audit critique + GRADE, grounded copilot answers with page cites). |
| `test_latex_studio_visual.py` | Visual UI | Interactive headful Chrome test demonstrating live LaTeX Studio features: source code editing, re-compilation, KaTeX math preview, visual editor title/author sync, tabs, and modals. |

## Shared harness

`harness.py` holds everything the suites share: the Selenium `UI` helper class
(React-aware form filling, modal helpers, JS sidebar navigation, warm chunk
loading, screenshot-on-failure), API/auth helper functions (`api_register`,
`get_profile`, `post_profile`, `make_email`), `connect_db` (reads DB credentials
from `living-science-grid/.env` at runtime - secrets are never printed),
`SuiteResult`/`write_report`, and `cleanup_user` (SAVEPOINT-based row removal
per test user).

## Running

Requires Python 3.11 and the three dev servers already running.

```bash
# everything (runs suites in order, emits combined summary)
python tests/run_all_tests.py

# subsets: backend, db, ui, workflows, llm, llmui
python tests/run_all_tests.py --only backend,db

# individual suites (-X utf8 keeps the Windows cp1252 console happy)
python -X utf8 tests/test_backend_api.py
python -X utf8 tests/test_database.py
python -X utf8 tests/test_frontend_selenium.py
python -X utf8 tests/test_user_workflows.py
python -X utf8 tests/test_llm_features.py
python -X utf8 tests/test_llm_ui_selenium.py
python -X utf8 tests/test_latex_studio_visual.py
```

## Reports

Each suite writes two files under `tests/reports/`:

- `<suite>_success_report.md` - human-readable pass/fail with details and WARNs.
- `<suite>_results.json` - machine-readable counts.

The runner adds `ALL_SUITES_SUMMARY.md` / `.json`, and
`USER_WORKFLOWS.md` is the narrated user-journey walkthrough.

## Relocated legacy scripts

Older diagnostic/test scripts were **moved (not deleted)** to
`tests/legacy/root/`. See `tests/legacy/README.md` for the full list and their
original locations. `.vscode/launch.json` was updated to point at the new paths.

## Defects surfaced by these suites — now fixed

Each finding below was reproduced by the suites, then fixed in the product and
re-verified live (see the per-suite success reports):

- ✅ `POST /api/research/audits/new` returned `{"status":"offline"}`. The audit
  endpoints now fall back to the asyncpg pool when the psycopg2 `db_manager`
  is unavailable, so audit ledger rows are persisted (create/list/patch/delete).
- ✅ Express library `POST /api/library` returned 500 (`ON CONFLICT (name,
  parent_id)` — no matching unique constraint, because Postgres treats NULL
  `parent_id` as distinct). Replaced with an `UPDATE`-then-`INSERT` upsert.
- ✅ No Express `/health` endpoint (404) — added. Missing Express
  `/api/latex/pdf-engine` route — now proxied to the FastAPI engine on :8000.
- ✅ **Faculty Professor persona** resolved to `usr_researcher` (shared with the
  Academic Researcher persona). The login provisioning whitelist now includes
  `professor`, so the persona auto-provisions its own `usr_professor` scope.
- ✅ Project `DELETE /api/latex/projects/{id}` did not check ownership and left
  the auto-created `file_system` folder/`.tex` rows behind. The endpoint now
  rejects (403) deletes of other owners' projects when `user_id` is passed and
  removes the project's Central Vault `.tex` copy (folder when empty). The UI
  and workflow suite pass `user_id`.
