# Database Testing — Success Report

- **Timestamp:** 2026-09-24 03:31:43
- **Host:** DESKTOP-I8UOC9J
- **API backend:** http://127.0.0.1:8000
- **Express backend:** http://127.0.0.1:5000
- **Frontend:** http://localhost:5173
- **Result:** ✅ ALL PASS
- **Passed:** 46  **Failed:** 0  **Warnings:** 0  **Total:** 46

| Status | Test | Detail |
|--------|------|--------|
| ✅ PASS | `Database Testing-001` All 25 core tables exist | 36 tables total |
| ✅ PASS | `Database Testing-002` Seeded demo persona logins exist in users table | found=['usr_default', 'usr_programmer', 'usr_researcher', 'usr_reviewer', 'usr_student'] (admin@scholargrid.io -> usr_default; legacy content owner 'usr_admin' lives in data tables, not users) |
| ✅ PASS | `Database Testing-003` Legacy admin content scope 'usr_admin' holds shared vault files | 30 files under usr_admin |
| ✅ PASS | `Database Testing-004` Isolation-critical tables carry a user_id column | user_id present on all expected tables |
| ✅ PASS | `Database Testing-005` Persona scholar_profiles link to users.id | profiles=['usr_admin', 'usr_programmer', 'usr_researcher', 'usr_reviewer', 'usr_student']; orphaned=['usr_admin'] (usr_admin expected: legacy content-scope owner without a users row) |
| ✅ PASS | `Database Testing-006` New account 'file_system' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-007` New account 'global_vault_notes' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-008` New account 'insightlens_workspaces' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-009` New account 'domain_workspaces' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-010` New account 'math_evaluator_sessions' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-011` New account 'audit_ledger' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-012` New account 'student_flashcards' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-013` New account 'code_implementations' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-014` New account 'latex_projects' starts with 0 rows | 0 rows |
| ✅ PASS | `Database Testing-015` All user-scoped collections empty for a brand-new account | 0 rows everywhere except shared admin/global content |
| ✅ PASS | `Database Testing-016` Register created the users row | 1 row(s) |
| ✅ PASS | `Database Testing-017` Register created the scholar_profiles row | 1 row(s) |
| ✅ PASS | `Database Testing-018` Created a vault note via API | note id=89 |
| ✅ PASS | `Database Testing-019` Vault note row persisted in DB with correct user_id | DB rows=1 |
| ✅ PASS | `Database Testing-020` Vault note re-read from API | listed=True |
| ✅ PASS | `Database Testing-021` Created a LaTeX project via API | pid=proj_1790199088778 |
| ✅ PASS | `Database Testing-022` LaTeX project row persisted in DB with correct user_id | DB rows=1 |
| ✅ PASS | `Database Testing-023` Project seeded main.tex + references.bib in DB | 2 files |
| ✅ PASS | `Database Testing-024` Project seeded initial commit in latex_versions | 1 versions |
| ✅ PASS | `Database Testing-025` Theme saved into scholar_profiles.theme | db theme=topography-dark |
| ✅ PASS | `Database Testing-026` Bio saved into scholar_profiles.bio | db bio=DBTEST bio value |
| ✅ PASS | `Database Testing-027` Old account 'usr_admin' retains shared admin vault files (30 rows) | 30 rows (min 25) |
| ✅ PASS | `Database Testing-028` Old account 'usr_admin' retains shared admin vault notes (2 rows) | 2 rows (min 2) |
| ✅ PASS | `Database Testing-029` Old account 'usr_admin' retains shared admin latex projects (2 rows) | 2 rows (min 1) |
| ✅ PASS | `Database Testing-030` Old account 'usr_admin' retains admin math sessions (5 rows) | 5 rows (min 3) |
| ✅ PASS | `Database Testing-031` Old account 'usr_admin' retains admin scholar audits (12 rows) | 12 rows (min 8) |
| ✅ PASS | `Database Testing-032` Old account 'usr_admin' retains admin flashcards (16 rows) | 16 rows (min 10) |
| ✅ PASS | `Database Testing-033` Old account 'usr_researcher' retains researcher vault files (5 rows) | 5 rows (min 3) |
| ✅ PASS | `Database Testing-034` Old account 'usr_researcher' retains researcher insight lens workspaces (1 rows) | 1 rows (min 1) |
| ✅ PASS | `Database Testing-035` Old account 'usr_researcher' retains researcher math sessions (2 rows) | 2 rows (min 1) |
| ✅ PASS | `Database Testing-036` Old account 'usr_researcher' retains researcher scholar audits (6 rows) | 6 rows (min 4) |
| ✅ PASS | `Database Testing-037` Old account 'usr_researcher' retains researcher flashcards (8 rows) | 8 rows (min 5) |
| ✅ PASS | `Database Testing-038` Old account 'usr_student' retains student vault files (2 rows) | 2 rows (min 1) |
| ✅ PASS | `Database Testing-039` Old account 'usr_student' retains student vault notes (2 rows) | 2 rows (min 1) |
| ✅ PASS | `Database Testing-040` Old account 'usr_student' retains student flashcards (12 rows) | 12 rows (min 8) |
| ✅ PASS | `Database Testing-041` Old account 'usr_student' retains student domain matrices (2 rows) | 2 rows (min 1) |
| ✅ PASS | `Database Testing-042` Old account 'usr_reviewer' retains reviewer vault files (1 rows) | 1 rows (min 1) |
| ✅ PASS | `Database Testing-043` Old account 'usr_admin' has a persisted theme in scholar_profiles | theme=solar-flare |
| ✅ PASS | `Database Testing-044` Old account 'usr_researcher' has a persisted theme in scholar_profiles | theme=obsidian-core |
| ✅ PASS | `Database Testing-045` Notes: user B cannot see user A's private note | A's note id=90, B sees 14 notes (shared admin/global included) |
| ✅ PASS | `Database Testing-046` LaTeX: user B cannot see user A's private project | A's project id=proj_1790199092194; B sees 2 projects (incl. shared admin templates) |

---
*Generated by the ScholarGrid E2E test harness. See `tests/README.md` for how to re-run.*