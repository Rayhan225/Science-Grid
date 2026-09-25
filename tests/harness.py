"""
ScholarGrid E2E Test Harness — shared utilities for the full-stack user test suite.

Provides:
  * Repo / env / URL resolution (reads ../living-science-grid/.env for DB creds)
  * A result collection + Markdown/JSON report writer
  * DB helpers (psycopg2) for direct database verification & cleanup
  * Selenium UI helpers (Chrome headless) for user workflows
  * Pause-style check/assert recording so every suite always produces a report
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid as _uuid
from datetime import datetime
from pathlib import Path

import requests

TESTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TESTS_DIR.parent
LIVING = REPO_ROOT / "living-science-grid"
ENV_FILE = LIVING / ".env"

API_BASE = os.environ.get("SG_API_BASE", "http://127.0.0.1:8000")
EXPRESS_BASE = os.environ.get("SG_EXPRESS_BASE", "http://127.0.0.1:5000")
FRONTEND_URL = os.environ.get("SG_FRONTEND_URL", "http://localhost:5173")
REPORTS_DIR = TESTS_DIR / "reports"
SCREENSHOT_DIR = TESTS_DIR / "screenshots"

TEST_EMAIL_SUFFIX = "@test.local"          # any user we create uses this suffix -> safe cleanup
TEST_PASSWORD = "ScholarGrid#2026$Test"    # shared strong password for created accounts

DEMO_PERSONAS = {
    "professor": {"label": "Faculty Professor", "email": "professor@scholargrid.io", "role": "professor"},
    "researcher": {"label": "Academic Researcher", "email": "researcher@scholargrid.io", "role": "researcher"},
    "student": {"label": "Graduate Student", "email": "student@scholargrid.io", "role": "student"},
    "programmer": {"label": "Research Programmer", "email": "programmer@scholargrid.io", "role": "programmer"},
    "admin": {"label": "Lab Director / Admin", "email": "admin@scholargrid.io", "role": "admin"},
    "reviewer": {"label": "Peer Reviewer", "email": "reviewer@scholargrid.io", "role": "reviewer"},
}

# user_id prefixes used by live "old accounts" seeded in the DB
OLD_ACCOUNT_USER_IDS = ["usr_admin", "usr_researcher", "usr_student", "usr_programmer", "usr_reviewer", "usr_default"]


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
def load_env() -> dict:
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def db_config() -> dict:
    env = load_env()
    return {
        "host": env.get("DB_HOST"),
        "port": int(env.get("DB_PORT", 6543)),
        "user": env.get("DB_USER"),
        "password": env.get("DB_PASSWORD"),
        "dbname": env.get("DB_NAME", "postgres"),
    }


def connect_db(retries: int = 3, gap: float = 1.5):
    """Open a psycopg2 connection, retrying transient connect failures.

    When suites run back-to-back the Supabase pooler occasionally rejects an
    incoming connection; the retry loop absorbs those blips instead of failing
    the whole suite at startup.
    """
    import psycopg2
    last = None
    for attempt in range(retries):
        try:
            return psycopg2.connect(**db_config())
        except Exception as exc:  # noqa: BLE001
            last = exc
            if attempt < retries - 1:
                time.sleep(gap * (attempt + 1))
    raise last


# ---------------------------------------------------------------------------
# Unique test identity helpers
# ---------------------------------------------------------------------------
def make_email(tag: str = "qa") -> str:
    return f"{tag}_{int(time.time() * 1000)}_{_uuid.uuid4().hex[:6]}{TEST_EMAIL_SUFFIX}"


def json_get(url, **kw):
    r = requests.get(url, timeout=60, **kw)
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r, body


def api_register(email=None, name="Seasoned QA Researcher", password=TEST_PASSWORD, role="researcher", **extra):
    email = email or make_email("qa")
    payload = {"email": email, "password": password, "name": name, "role": role, **extra}
    r = requests.post(f"{API_BASE}/api/v1/auth/register", json=payload, timeout=60)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    return r, body


def api_login(email, password=TEST_PASSWORD):
    r = requests.post(f"{API_BASE}/api/v1/auth/login",
                      json={"email": email, "password": password}, timeout=60)
    return r, r.json()


def api_change_password(uid, email, current_password, new_password):
    r = requests.post(f"{API_BASE}/api/v1/auth/change-password",
                      json={"user_id": uid, "email": email,
                            "current_password": current_password,
                            "new_password": new_password}, timeout=60)
    try:
        return r, r.json()
    except Exception:
        return r, {"raw": r.text}


def get_profile(uid):
    r, body = json_get(f"{API_BASE}/api/user/profile?user_id={uid}")
    return r, body


def post_profile(uid, **payload):
    payload = {"id": uid, "user_id": uid, **payload}
    r = requests.post(f"{API_BASE}/api/user/profile", json=payload, timeout=60)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    return r, body


# ---------------------------------------------------------------------------
# DB direct helpers + cleanup
# ---------------------------------------------------------------------------
_PG_TABLES_BY_USER = [
    "latex_project_files", "latex_comments", "latex_references", "latex_versions",
    "latex_vault_backups", "latex_projects", "file_system", "global_vault_notes",
    "insightlens_workspaces", "domain_workspaces", "math_evaluator_sessions",
    "audit_ledger", "student_flashcards", "code_implementations",
    "user_telemetry_logs", "canvas_annotations", "literature_notebook",
    "insight_documents", "papers", "paper_sections", "math_evaluations",
    "document_chunks", "user_memory_graph", "paper_analysis_cache",
]


def cleanup_user(uid: str, conn) -> dict:
    """Best-effort removal of every row owned by a test user. Returns a count map.

    Each risky statement runs inside its own SAVEPOINT so a single missing table
    or column never aborts the whole transaction (which would silently roll back
    the deletions that already ran and report false success).
    """
    removed = {}
    if not uid or uid in OLD_ACCOUNT_USER_IDS:
        return removed

    def _safe(cur, sql, params, key):
        cur.execute("SAVEPOINT sp_clean")
        try:
            cur.execute(sql, params)
            removed[key] = removed.get(key, 0) + cur.rowcount
            cur.execute("RELEASE SAVEPOINT sp_clean")
        except Exception:
            cur.execute("ROLLBACK TO SAVEPOINT sp_clean")

    with conn.cursor() as cur:
        # projects first (cascades most latex children via FK), then tables with user_id
        cur.execute("SAVEPOINT sp_clean")
        try:
            cur.execute("SELECT id FROM latex_projects WHERE user_id = %s", (uid,))
            pids = [r[0] for r in cur.fetchall()]
            cur.execute("RELEASE SAVEPOINT sp_clean")
        except Exception:
            cur.execute("ROLLBACK TO SAVEPOINT sp_clean")
            pids = []
        if pids:
            for tbl in ("latex_project_files", "latex_comments", "latex_references",
                        "latex_versions", "latex_vault_backups"):
                cur.execute("SAVEPOINT sp_clean")
                try:
                    for pid in pids:
                        cur.execute(f"DELETE FROM {tbl} WHERE project_id = %s", (pid,))
                        removed[f"{tbl}(proj)"] = removed.get(f"{tbl}(proj)", 0) + cur.rowcount
                    cur.execute("RELEASE SAVEPOINT sp_clean")
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT sp_clean")
        _safe(cur, "DELETE FROM latex_projects WHERE user_id = %s", (uid,), "latex_projects")
        for tbl in _PG_TABLES_BY_USER:
            _safe(cur, f"DELETE FROM {tbl} WHERE user_id = %s", (uid,), tbl)
        # scholar_profiles is keyed by id only (no user_id column) - never touch
        # user_id here or it aborts the transaction and silently rolls back cleanup.
        _safe(cur, "DELETE FROM scholar_profiles WHERE id = %s", (uid,), "scholar_profiles")
        _safe(cur, "DELETE FROM users WHERE id = %s", (uid,), "users")
    conn.commit()
    return removed


def db_count(cur, table, where="", params=()) -> int:
    cur.execute(f"SELECT count(*) FROM {table} {where}", params)
    return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Result collection + reports
# ---------------------------------------------------------------------------
class SuiteResult:
    def __init__(self, suite_name: str):
        self.suite_name = suite_name
        self.cases: list[dict] = []
        self.section = "General"

    def start_section(self, title: str):
        self.section = title

    def record(self, name: str, passed: bool, detail: str = "", section: str | None = None,
               warn: bool = False):
        status = "PASS" if passed else ("WARN" if warn else "FAIL")
        self.cases.append({
            "id": f"{self.suite_name}-{len(self.cases) + 1:03d}",
            "section": section or self.section,
            "name": name,
            "status": status,
            "detail": detail,
        })
        flag = "PASS" if status == "PASS" else (">  WARN" if status == "WARN" else "FAIL")
        print(f"  [{flag}] {name}")
        if status != "PASS":
            print(f"        {detail[:400]}")

    def check(self, name, cond, detail="", section=None):
        self.record(name, bool(cond), detail, section)

    def counts(self):
        ok = sum(1 for c in self.cases if c["status"] == "PASS")
        fail = sum(1 for c in self.cases if c["status"] == "FAIL")
        warn = sum(1 for c in self.cases if c["status"] == "WARN")
        return ok, fail, warn


def _infer_suite_script(json_path: Path | None) -> str:
    """Map a results JSON filename back to its suite script name (best-effort)."""
    try:
        if json_path is None:
            return ""
        stem = Path(json_path).stem  # e.g. llm_features_results
        key = stem.replace("_results", "")  # e.g. llm_features
        return f"test_{key}.py"
    except Exception:  # noqa: BLE001
        return ""


def _submit_test_run(record: dict) -> bool:
    """Best-effort POST of a suite run to the app's persistent Test History API."""
    try:
        r = requests.post(f"{API_BASE}/api/tests/history", json=record, timeout=30)
        return r.status_code == 200
    except Exception:  # noqa: BLE001
        return False


def write_report(result: SuiteResult, md_path: Path | str, json_path: Path | str | None = None):
    if isinstance(md_path, str):
        if not md_path.endswith(".md"):
            md_path = Path(__file__).resolve().parent / "reports" / f"{md_path}.md"
        else:
            md_path = Path(md_path)
    if isinstance(json_path, str):
        if not json_path.endswith(".json"):
            json_path = Path(__file__).resolve().parent / "reports" / f"{json_path}.json"
        else:
            json_path = Path(json_path)
    ok, fail, warn = result.counts()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Persist this run into the app's PostgreSQL test_runs table (best-effort,
    # never fails the suite if the API is momentarily unreachable).
    try:
        _submit_test_run({
            "suite": result.suite_name or "ScholarGrid Suite",
            "status": "FAIL" if fail else ("WARN" if fail == 0 and warn else "PASS"),
            "passed": ok, "failed": fail, "warned": warn,
            "total": len(result.cases),
            "script": _infer_suite_script(json_path),
            "results": {
                "suite": result.suite_name,
                "generated": now,
                "passed": ok, "failed": fail, "warned": warn,
                "total": len(result.cases),
                "cases": result.cases,
            },
        })
    except Exception:  # noqa: BLE001
        pass
    lines = [
        f"# {result.suite_name} — Success Report",
        "",
        f"- **Timestamp:** {now}",
        f"- **Host:** {os.uname().nodename if hasattr(os, 'uname') else os.environ.get('COMPUTERNAME', 'unknown')}",
        f"- **API backend:** {API_BASE}",
        f"- **Express backend:** {EXPRESS_BASE}",
        f"- **Frontend:** {FRONTEND_URL}",
        f"- **Result:** {'✅ ALL PASS' if fail == 0 else '❌ FAILURES PRESENT'}",
        f"- **Passed:** {ok}  **Failed:** {fail}  **Warnings:** {warn}  **Total:** {len(result.cases)}",
        "",
        "| Status | Test | Detail |",
        "|--------|------|--------|",
    ]
    for c in result.cases:
        icon = "✅" if c["status"] == "PASS" else ("⚠️" if c["status"] == "WARN" else "❌")
        detail = (c["detail"] or "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {icon} {c['status']} | `{c['id']}` {c['name']} | {detail} |")
    lines.append("")
    lines.append("---")
    lines.append("*Generated by the ScholarGrid E2E test harness. See `tests/README.md` for how to re-run.*")
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text("\n".join(lines), encoding="utf-8")
    if json_path:
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps({
            "suite": result.suite_name, "generated": now,
            "passed": ok, "failed": fail, "warned": warn, "total": len(result.cases),
            "cases": result.cases,
        }, indent=2), encoding="utf-8")
    return ok, fail


# ---------------------------------------------------------------------------
# Selenium UI helpers
# ---------------------------------------------------------------------------
def _chrome_options(headless=True):
    from selenium.webdriver.chrome.options import Options
    o = Options()
    if headless:
        o.add_argument("--headless=new")
    o.add_argument("--window-size=1680,1050")
    o.add_argument("--disable-gpu")
    o.add_argument("--no-sandbox")
    o.add_argument("--disable-dev-shm-usage")
    o.add_argument("--disable-extensions")
    o.add_argument("--ignore-certificate-errors")
    o.add_experimental_option("excludeSwitches", ["enable-logging"])
    return o


class UI:
    """Thin wrapper around a Selenium Chrome driver with schema-agnostic helpers."""

    def __init__(self, headless=True, implicit_wait=15, screenshot_dir=SCREENSHOT_DIR):
        from selenium.webdriver import Chrome
        self.driver = Chrome(options=_chrome_options(headless))
        self.driver.implicitly_wait(implicit_wait)
        self.screenshot_dir = Path(screenshot_dir)
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        self.remember_email = None

    # --- element discovery -------------------------------------------------
    def by_text(self, text, tag="button", timeout=15):
        """Wait for an element whose rendered text equals/contains `text`."""
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        loc = (By.XPATH, f"//{tag}[contains(normalize-space(.), '{_x(text)}')]")
        return WebDriverWait(self.driver, timeout).until(EC.element_to_be_clickable(loc))

    def by_css(self, css, timeout=15):
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return WebDriverWait(self.driver, timeout).until(EC.element_to_be_clickable((By.CSS_SELECTOR, css)))

    def by_placeholder(self, placeholder, timeout=15):
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH, f"//input[@placeholder='{_x(placeholder)}']")))

    def find_visible(self, css, timeout=15):
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, css)))

    def text_present(self, text, timeout=20, tag=None):
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        xp = f"//*[contains(normalize-space(.), '{_x(text)}')]"
        if tag:
            xp = f"//{tag}[contains(normalize-space(.), '{_x(text)}')]"
        WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located((By.XPATH, xp)))
        return True

    def heading_present(self, text):
        """Single non-waiting check whether `text` is in the DOM right now."""
        from selenium.webdriver.common.by import By
        try:
            self.driver.find_element(
                By.XPATH, f"//*[contains(normalize-space(.), '{_x(text)}')]")
            return True
        except Exception:  # noqa: BLE001
            return False

    def title_present(self, text, timeout=20):
        return self.text_present(text, timeout, tag="h1") or self.text_present(text, timeout)

    def wait_url_contains(self, token, timeout=20):
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        WebDriverWait(self.driver, timeout).until(lambda d: token in d.current_url)
        return True

    def shot(self, name):
        try:
            self.driver.save_screenshot(str(self.screenshot_dir / f"{name}.png"))
        except Exception:
            pass

    def local_get(self, key):
        return self.driver.execute_script(f"return localStorage.getItem('{key}');")

    def local_set(self, key, value):
        self.driver.execute_script(f"localStorage.setItem('{key}', {json.dumps(value)});")

    def local_clear_all(self):
        self.driver.execute_script("localStorage.clear();")

    def refresh(self):
        self.driver.refresh()
        time.sleep(1.5)

    # --- workflow helpers (auth / nav / settings forms) --------------------
    def bind_remember_email(self, email):
        """Store the email of the account under test for later re-login steps."""
        self.remember_email = email

    def click_visible_text(self, text, tag=None, timeout=10):
        """Click the first *visible* element whose text contains `text`.
        Returns True when a click happened, False otherwise (no raise)."""
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        try:
            els = self.driver.find_elements(
                By.XPATH, f"//{tag or '*'}[contains(normalize-space(.), '{_x(text)}')]")
        except Exception:  # noqa: BLE001
            return False
        visible = []
        for el in els:
            try:
                if el.is_displayed():
                    visible.append(el)
            except Exception:  # noqa: BLE001
                continue
        if not visible:
            # element may render later: wait for a clickable match
            try:
                target = WebDriverWait(self.driver, timeout).until(EC.element_to_be_clickable(
                    (By.XPATH, f"//{tag or '*'}[normalize-space(.)='{_x(text)}']")))
                target.click()
                return True
            except Exception:  # noqa: BLE001
                return False
        # prefer the deepest-nested visible match so we hit the real control
        target = max(visible, key=lambda e: _xpath_depth(self.driver, e))
        try:
            target.click()
            return True
        except Exception:  # noqa: BLE001
            return False

    def modal_click(self, text, timeout=10):
        """Click a button inside the auth modal (div.fixed.inset-0) with text `text`."""
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        loc = (By.XPATH, "//div[contains(@class,'fixed') and contains(@class,'inset-0')]"
                         f"//button[contains(normalize-space(.), '{_x(text)}')]")
        WebDriverWait(self.driver, timeout).until(EC.element_to_be_clickable(loc)).click()
        return True

    def wait_until_login_settled(self, timeout=30):
        """Wait until the app stored a session token and the Command Matrix is rendered."""
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        WebDriverWait(self.driver, timeout).until(
            lambda d: bool(self.local_get("sg_token")))
        try:
            WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located(
                (By.XPATH, "//*[contains(normalize-space(.), 'ScholarGrid Research Command.')]")))
        except Exception:
            self.shot("login_settled_timeout")
            try:
                snippet = self.driver.find_element(By.TAG_NAME, "body").text[:400].replace("\n", " | ")
            except Exception:  # noqa: BLE001
                snippet = "(no body)"
            raise TimeoutError(f"Command Matrix never rendered after login. Body: {snippet}")
        time.sleep(0.5)
        return True

    def current_uid(self):
        """Read the logged-in user id from localStorage sg_user / sg_current_user."""
        for key in ("sg_user", "sg_current_user"):
            raw = self.local_get(key)
            if raw:
                try:
                    data = json.loads(raw)
                except Exception:  # noqa: BLE001
                    data = None
                if isinstance(data, dict) and data.get("id"):
                    return str(data["id"])
        return None

    def sign_out(self, timeout=45):
        """Sign out through Settings -> 'Sign Out Session' and wait for the landing page."""
        from selenium.webdriver.support.ui import WebDriverWait
        if not self.local_get("sg_token"):
            return True
        self.goto_view("Settings & Profile", "Settings & Profile Hub", timeout=timeout)
        try:
            self.by_text("Sign Out Session", tag="button", timeout=20).click()
        except Exception:  # noqa: BLE001
            self.click_visible_text("Sign Out Session", timeout=15)
        WebDriverWait(self.driver, timeout).until(
            lambda d: not bool(self.local_get("sg_token")))
        time.sleep(0.5)
        return True

    def sign_out_if_logged_in(self, timeout=30):
        if self.local_get("sg_token"):
            return self.sign_out(timeout=timeout)
        return True

    def goto_view(self, title, heading, timeout=90):
        """Click a sidebar button by its `title` attr, then wait for `heading` text.
        Uses a JS stub-click (hover-driven layout shifts make Selenium's native
        click unreliable on the collapsed sidebar). When the current view uses the
        isolated sidebar (Settings / Global Vault) 'Command Matrix' is replaced by
        'Return Matrix', so we fall back to it. Returns True when the view rendered.
        Polls for the heading so slow first-time Vite chunk transforms are tolerated."""
        from selenium.webdriver.common.by import By
        try:
            deadline = time.time() + timeout
            if not self._click_nav_button(title):
                if title == "Command Matrix":
                    self._click_nav_button("Return Matrix")
            while time.time() < deadline:
                try:
                    self.driver.find_element(
                        By.XPATH, f"//*[contains(normalize-space(.), '{_x(heading)}')]")
                    return True
                except Exception:  # noqa: BLE001
                    time.sleep(2.0)
            return False
        except Exception:  # noqa: BLE001
            return False

    def _click_nav_button(self, title, timeout=5):
        """Find a sidebar button whose `title` attr equals `title` and stub-click it."""
        try:
            js = ("""
                const pick = arguments[0];
                const btns = document.querySelectorAll('button');
                const target = [...btns].find(b => pick === (b.getAttribute('title')||'').trim());
                if (!target) return 'NOBTN';
                target.click();
                return 'clicked';
            """)
            return self.driver.execute_script(js, title) == "clicked"
        except Exception:  # noqa: BLE001
            return False

    def _field_by_label(self, label, tag="input", timeout=15):
        """Locate an input/textarea whose nearest ancestor group carries `label`.
        Returns a Selenium WebElement. Finds the label by text, then walks up
        the DOM until an element of `tag` appears (the field's own wrapper)."""
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        label_el = WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located(
            (By.XPATH, f"//label[contains(normalize-space(.), '{_x(label)}')]")))
        el = self.driver.execute_script("""
            const label = arguments[0];
            const tag = arguments[1];
            let node = label;
            for (let i = 0; i < 8 && node; i++) {
                node = node.parentElement;
                if (!node) break;
                const inp = node.querySelector(tag + ':not([disabled])');
                if (inp) return inp;
            }
            return null;
        """, label_el, tag)
        if not el:
            raise LookupError(f"No <{tag}> found near label '{label}'")
        return el

    def _set_value(self, el, value):
        """Type into a React-controlled input/textarea using the native value setter
        so React state is updated, then fire input + change events."""
        proto = "HTMLTextAreaElement" if el.tag_name.upper() == "TEXTAREA" else "HTMLInputElement"
        self.driver.execute_script(f"""
            const el = arguments[0];
            const proto = {proto}.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, arguments[1]);
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
        """, el, value)

    def fill_label_input(self, label, value):
        el = self._field_by_label(label, "input")
        el.clear()
        self._set_value(el, value)
        return el

    def fill_label_textarea(self, label, value):
        el = self._field_by_label(label, "textarea")
        el.clear()
        self._set_value(el, value)
        return el

    def warm_view_chunks(self, timeout=120):
        """Force-fetch the lazy view modules so later nav clicks render instantly.
        Vite transforms these on-demand; doing it up front decouples navigation
        assertions from first-request slowness under heavy machine load."""
        from selenium.webdriver.support.ui import WebDriverWait
        js = """
            return Promise.all([
                import('/src/components/LatexStudio.jsx'),
                import('/src/components/InsightLens.jsx'),
                import('/src/components/DomainMatrix.jsx'),
                import('/src/components/MathEvaluator.jsx'),
                import('/src/components/ValidationRigor.jsx'),
                import('/src/components/CentralVault.jsx'),
                import('/src/components/Settings.jsx'),
                import('/src/components/Dashboard.jsx'),
            ]).then(() => 'warmed').catch(e => 'ERR ' + (e && e.message));
        """
        deadline = time.time() + timeout
        result = None
        while time.time() < deadline:
            result = self.driver.execute_script(js)
            if result == "warmed":
                return True
            time.sleep(1.0)
        return result == "warmed"

    def quit(self):
        try:
            self.driver.quit()
        except Exception:
            pass


def _x(s: str) -> str:
    return (s or "").replace("'", "\\'").replace('"', "&quot;")


def _xpath_depth(driver, el) -> int:
    """DOM depth of an element, computed in-browser (used to prefer the deepest
    matching node when several elements share the same text)."""
    try:
        return int(driver.execute_script(
            "let d=0;let n=arguments[0];while(n){d++;n=n.parentElement;}return d;", el))
    except Exception:  # noqa: BLE001
        return 0


# ---------------------------------------------------------------------------
# Wait-until helper for API/DB conditions
# ---------------------------------------------------------------------------
def wait_until(fn, timeout=30, interval=1.0, msg="condition failed"):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            v = fn()
            if v:
                return v
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(interval)
    raise TimeoutError(f"{msg} (last error: {last})")