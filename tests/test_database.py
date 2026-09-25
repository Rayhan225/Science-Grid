"""
ScholarGrid — Database Test Suite (direct Supabase PostgreSQL verification).

Covers:
  * Core schema tables exist (users, scholar_profiles, latex_*, file_system,
    global_vault_notes, workspaces, domain_workspaces, math sessions, audits…)
  * Registering an account creates its `users` + `scholar_profiles` rows
  * Per-user rows are tagged with the correct user_id (data isolation in DB)
  * Brand-new account has ZERO user-scoped rows (everything starts fresh)
  * Old accounts (seeded demo personas) retain their data in the DB
  * Settings round-trip stored in scholar_profiles (theme/bio)
  * Full persistence round-trip: API write -> DB row -> API read

Run:  python tests/test_database.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
from harness import (API_BASE, TEST_PASSWORD, connect_db, cleanup_user, db_count,
                      get_profile, make_email, post_profile, write_report, SuiteResult)

RES = SuiteResult("Database Testing")
_report_md = Path(__file__).resolve().parent / "reports" / "database_success_report.md"
_report_json = Path(__file__).resolve().parent / "reports" / "database_results.json"

REQUIRED_TABLES = [
    "users", "scholar_profiles", "latex_projects", "latex_project_files",
    "latex_versions", "latex_references", "latex_comments", "latex_vault_backups",
    "file_system", "global_vault_notes", "workspaces", "insightlens_workspaces",
    "math_evaluator_sessions", "domain_workspaces", "audit_ledger",
    "student_flashcards", "code_implementations", "user_telemetry_logs",
    "papers", "paper_sections", "math_evaluations", "document_chunks",
    "academic_layouts", "canvas_annotations", "literature_notebook",
]


def test_schema(conn, cur):
    RES.start_section("Schema & Table Existence")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    present = {r[0] for r in cur.fetchall()}
    missing = [t for t in REQUIRED_TABLES if t not in present]
    RES.record(f"All {len(REQUIRED_TABLES)} core tables exist", not missing,
               f"missing={missing}" if missing else f"{len(present)} tables total")

    # users table seeded demo accounts (admin login resolves to usr_default)
    cur.execute("SELECT id FROM users WHERE id IN ('usr_default','usr_researcher','usr_student','usr_programmer','usr_reviewer','usr_admin')")
    seeded = {r[0] for r in cur.fetchall()}
    RES.record("Seeded demo persona logins exist in users table", seeded == {
        "usr_default", "usr_researcher", "usr_student", "usr_programmer", "usr_reviewer"},
        f"found={sorted(seeded)} (admin@scholargrid.io -> usr_default; "
        "legacy content owner 'usr_admin' lives in data tables, not users)")

    # legacy shared-admin content owner (file_system, vault notes, latex projects)
    cur.execute("SELECT count(*) FROM file_system WHERE user_id = 'usr_admin'")
    admin_files = cur.fetchone()[0]
    RES.record("Legacy admin content scope 'usr_admin' holds shared vault files",
               admin_files > 0, f"{admin_files} files under usr_admin")

    # check user_id columns exist on the isolation-critical tables
    # (scholar_profiles is keyed by id === users.id, no user_id column by design)
    cur.execute("""SELECT column_name, table_name FROM information_schema.columns
                   WHERE table_schema='public' AND column_name='user_id'""")
    with_uid = {r[1] for r in cur.fetchall()}
    expected_with_uid = {"latex_projects", "file_system", "global_vault_notes",
                         "insightlens_workspaces", "domain_workspaces",
                         "math_evaluator_sessions", "audit_ledger",
                         "student_flashcards", "code_implementations"}
    missing_uid = expected_with_uid - with_uid
    RES.record("Isolation-critical tables carry a user_id column", not missing_uid,
               f"missing user_id on: {sorted(missing_uid)}" if missing_uid else "user_id present on all expected tables")
    # scholar_profiles is keyed by id (=== users.id), so profile rows link via id
    cur.execute("""SELECT sp.id FROM scholar_profiles sp
                   WHERE sp.id IN ('usr_default','usr_admin','usr_researcher',
                                   'usr_student','usr_programmer','usr_reviewer')
                   ORDER BY sp.id""")
    profile_ids = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM users WHERE id = ANY(%s)", (profile_ids,))
    user_ids = {r[0] for r in cur.fetchall()}
    orphans = [pid for pid in profile_ids if pid not in user_ids]
    RES.record("Persona scholar_profiles link to users.id",
               set(orphans) <= {"usr_admin"},
               f"profiles={profile_ids}; orphaned={orphans} "
               "(usr_admin expected: legacy content-scope owner without a users row)")


def test_new_account_fresh(conn, uid, email):
    RES.start_section("New Account -> Everything Starts Fresh (DB rows)")
    cur = conn.cursor()
    tables = {
        "file_system": "file_system",
        "global_vault_notes": "global_vault_notes",
        "insightlens_workspaces": "insightlens_workspaces",
        "domain_workspaces": "domain_workspaces",
        "math_evaluator_sessions": "math_evaluator_sessions",
        "audit_ledger": "audit_ledger",
        "student_flashcards": "student_flashcards",
        "code_implementations": "code_implementations",
        "latex_projects": "latex_projects",
    }
    all_zero = True
    for label, table in tables.items():
        try:
            n = db_count(cur, table, f"WHERE user_id = %s", (uid,))
        except Exception as e:
            n = -1
            all_zero = False
            RES.record(f"New account '{label}' has {n} rows (should be 0)", False, str(e)[:200])
            continue
        all_zero = all_zero and n == 0
        RES.record(f"New account '{label}' starts with 0 rows", n == 0, f"{n} rows")
    RES.record("All user-scoped collections empty for a brand-new account", all_zero,
               "0 rows everywhere except shared admin/global content")

    # users + scholar_profiles rows created for the new user
    n_users = db_count(cur, "users", "WHERE id = %s", (uid,))
    try:
        n_prof = db_count(cur, "scholar_profiles", "WHERE id = %s", (uid,))
    except Exception:
        n_prof = 0
        conn.rollback()
    RES.record("Register created the users row", n_users == 1, f"{n_users} row(s)")
    RES.record("Register created the scholar_profiles row", n_prof >= 1, f"{n_prof} row(s)")


def test_persist_roundtrip(conn, uid):
    RES.start_section("Persistence Round-Trip (API -> DB -> API)")
    cur = conn.cursor()

    # Write a vault note via API, confirm row in DB, confirm re-read via API
    r = requests.post(f"{API_BASE}/api/vault/notes",
                      json={"title": "DBTEST Persistence Note", "source": "DB Suite",
                            "text": "persist me", "insight": "roundtrip", "user_id": uid}, timeout=60)
    nid = r.json().get("id") if r.status_code == 200 else None
    RES.record("Created a vault note via API", bool(nid), f"note id={nid}")
    if nid:
        n_db = db_count(cur, "global_vault_notes",
                        "WHERE id = %s AND user_id = %s AND title = 'DBTEST Persistence Note'", (nid, uid))
        RES.record("Vault note row persisted in DB with correct user_id", n_db == 1,
                   f"DB rows={n_db}")
        r = requests.get(f"{API_BASE}/api/vault/notes?user_id={uid}", timeout=60)
        items = r.json() if isinstance(r.json(), list) else []
        RES.record("Vault note re-read from API", any(i.get("id") == nid for i in items),
                   f"listed={any(i.get('id') == nid for i in items)}")

    # LaTeX project -> DB row -> list
    r = requests.post(f"{API_BASE}/api/latex/projects/new",
                      json={"title": "DBTEST Persistence Paper", "template": "standard_article",
                            "user_id": uid}, timeout=60)
    pid = r.json().get("id") if r.status_code in (200, 201) else None
    RES.record("Created a LaTeX project via API", bool(pid), f"pid={pid}")
    if pid:
        n_db = db_count(cur, "latex_projects",
                        "WHERE id = %s AND user_id = %s AND title = 'DBTEST Persistence Paper'", (pid, uid))
        RES.record("LaTeX project row persisted in DB with correct user_id", n_db == 1, f"DB rows={n_db}")
        n_files = db_count(cur, "latex_project_files", "WHERE project_id = %s", (pid,))
        RES.record("Project seeded main.tex + references.bib in DB", n_files >= 2, f"{n_files} files")
        n_ver = db_count(cur, "latex_versions", "WHERE project_id = %s", (pid,))
        RES.record("Project seeded initial commit in latex_versions", n_ver >= 1, f"{n_ver} versions")

    # Settings round trip in scholar_profiles
    r, _ = post_profile(uid, theme="topography-dark", bio="DBTEST bio value")
    cur.execute("SELECT theme, bio FROM scholar_profiles WHERE id = %s", (uid,))
    row = cur.fetchone()
    RES.record("Theme saved into scholar_profiles.theme", bool(row and row[0] == "topography-dark"),
               f"db theme={row[0] if row else None}")
    RES.record("Bio saved into scholar_profiles.bio", bool(row and row[1] == "DBTEST bio value"),
               f"db bio={row[1] if row else None}")
    conn.commit()

    # Restore defaults so nothing lingers
    post_profile(uid, theme="obsidian-core", bio="")
    return nid, pid


def test_old_accounts_keep_data(conn):
    RES.start_section("Old Accounts Retain Their Data in the Database")
    cur = conn.cursor()
    expectations = [
        # (user_id, table, min_rows, label) -- minimums below verified live counts
        ("usr_admin", "file_system", 25, "shared admin vault files"),
        ("usr_admin", "global_vault_notes", 2, "shared admin vault notes"),
        ("usr_admin", "latex_projects", 1, "shared admin latex projects"),
        ("usr_admin", "math_evaluator_sessions", 3, "admin math sessions"),
        ("usr_admin", "audit_ledger", 8, "admin scholar audits"),
        ("usr_admin", "student_flashcards", 10, "admin flashcards"),
        ("usr_researcher", "file_system", 3, "researcher vault files"),
        ("usr_researcher", "insightlens_workspaces", 1, "researcher insight lens workspaces"),
        ("usr_researcher", "math_evaluator_sessions", 1, "researcher math sessions"),
        ("usr_researcher", "audit_ledger", 4, "researcher scholar audits"),
        ("usr_researcher", "student_flashcards", 5, "researcher flashcards"),
        ("usr_student", "file_system", 1, "student vault files"),
        ("usr_student", "global_vault_notes", 1, "student vault notes"),
        ("usr_student", "student_flashcards", 8, "student flashcards"),
        ("usr_student", "domain_workspaces", 1, "student domain matrices"),
        ("usr_reviewer", "file_system", 1, "reviewer vault files"),
    ]
    for uid, table, minimum, label in expectations:
        try:
            n = db_count(cur, table, f"WHERE user_id = %s", (uid,))
        except Exception as e:
            RES.record(f"Old account '{uid}' {label} present", False, str(e)[:150])
            conn.rollback()
            continue
        RES.record(f"Old account '{uid}' retains {label} ({n} rows)", n >= minimum,
                   f"{n} rows (min {minimum})")

    # old accounts load profile settings (theme) in their scholar_profiles row
    for uid, expected_theme in [("usr_admin", "solar-flare"), ("usr_researcher", "obsidian-core")]:
        cur.execute("SELECT theme FROM scholar_profiles WHERE id = %s", (uid,))
        row = cur.fetchone()
        RES.record(f"Old account '{uid}' has a persisted theme in scholar_profiles",
                   bool(row and row[0]), f"theme={row[0] if row else None}")


def test_shared_vs_user_scoped(conn, uid_new, uid_other):
    """User B must never see user A's private rows (only shared admin/global content)."""
    RES.start_section("Data Isolation: other users' private data is not visible")
    cur = conn.cursor()

    # A owns one note; B's API list must not include user A's note
    r = requests.post(f"{API_BASE}/api/vault/notes",
                      json={"title": "ISOLATION-Private-Note-A", "source": "iso",
                            "text": "private", "user_id": uid_new}, timeout=60)
    nid = r.json().get("id") if r.status_code == 200 else None
    r = requests.get(f"{API_BASE}/api/vault/notes?user_id={uid_other}", timeout=60)
    items = r.json() if isinstance(r.json(), list) else []
    RES.record("Notes: user B cannot see user A's private note",
               all(i.get("id") != nid for i in items),
               f"A's note id={nid}, B sees {len(items)} notes (shared admin/global included)")

    # A owns a latex project; B's list must not include it (only own + shared admin)
    r = requests.post(f"{API_BASE}/api/latex/projects/new",
                      json={"title": "ISOLATION-Private-Paper-A", "template": "standard_article",
                            "user_id": uid_new}, timeout=60)
    pid = r.json().get("id") if r.status_code in (200, 201) else None
    r = requests.get(f"{API_BASE}/api/latex/projects?user_id={uid_other}", timeout=60)
    projects = r.json() if isinstance(r.json(), list) else []
    leaked = [p for p in projects if p.get("id") == pid]
    RES.record("LaTeX: user B cannot see user A's private project",
               not leaked,
               f"A's project id={pid}; B sees {len(projects)} projects (incl. shared admin templates)")
    conn.commit()
    return nid, pid


def main():
    conn = None
    cur = None
    uid_a, uid_b = None, None
    created = []
    try:
        conn = connect_db()
        cur = conn.cursor()
        # create two brand-new users through the real registration API
        email_a = make_email("qadb")
        r = requests.post(f"{API_BASE}/api/v1/auth/register",
                          json={"email": email_a, "password": TEST_PASSWORD,
                                "name": "DB Tester A", "role": "researcher"}, timeout=60)
        uid_a = r.json().get("user", {}).get("id")
        created.append(uid_a)

        email_b = make_email("qdb")
        r = requests.post(f"{API_BASE}/api/v1/auth/register",
                          json={"email": email_b, "password": TEST_PASSWORD,
                                "name": "DB Tester B", "role": "researcher"}, timeout=60)
        uid_b = r.json().get("user", {}).get("id")
        created.append(uid_b)

        test_schema(conn, cur)
        test_new_account_fresh(conn, uid_a, email_a)
        test_persist_roundtrip(conn, uid_a)
        # old-account section uses read-only checks on seeded personas
        test_old_accounts_keep_data(conn)
        test_shared_vs_user_scoped(conn, uid_a, uid_b)
    except Exception as e:  # noqa: BLE001
        import traceback
        RES.record("Suite execution completed without crash", False, traceback.format_exc(limit=6)[-1500:])
    finally:
        if conn and created:
            for uid in created:
                try:
                    removed = cleanup_user(uid, conn)
                    print(f"cleanup {uid}: {removed}")
                except Exception as e:  # noqa: BLE001
                    print("cleanup skipped:", uid, e)
        if conn:
            conn.close()

    ok, fail = write_report(RES, _report_md, _report_json)
    print(f"\nDatabase suite: {ok} passed, {fail} failed, {len(RES.cases)} total")
    print(f"Report: {_report_md}")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()