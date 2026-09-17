# server/db_manager.py
# ═══════════════════════════════════════════════════════════════════
# Database Manager — PostgreSQL JSONB persistence for research pipeline
# psycopg2 + RealDictCursor · parameterized SQL · zero disk I/O
# ═══════════════════════════════════════════════════════════════════
import os
import json
import uuid
from typing import Any, Dict, List, Optional
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from psycopg2.extras import RealDictCursor

from psycopg2 import pool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.nxarpilggbxfoyfkywey:RayhanSourov%40123"
    "@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    "?sslmode=require"
)

_connection = None
_pool = None


def get_pool():
    """Retrieve or initialize the ThreadedConnectionPool."""
    global _pool
    if _pool is None:
        try:
            _pool = pool.ThreadedConnectionPool(minconn=2, maxconn=10, dsn=DATABASE_URL)
            print("[OK] [DB Manager] Initialized ThreadedConnectionPool (min=2, max=10).")
        except Exception as e:
            print(f"[WARN] [DB Manager] Connection pool init failed: {e}")
            _pool = None
    return _pool


def get_connection():
    """Get or create the fallback standalone database connection."""
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(DATABASE_URL)
        _connection.autocommit = True
        print("[OK] [DB Manager] Connected to PostgreSQL.")
    return _connection


@contextmanager
def get_cursor():
    """Context manager for a pooled database cursor with auto commit/rollback."""
    p = get_pool()
    conn = None
    borrowed_from_pool = False
    if p is not None:
        try:
            conn = p.getconn()
            conn.autocommit = True
            borrowed_from_pool = True
        except Exception:
            conn = None

    if conn is None:
        conn = get_connection()
        borrowed_from_pool = False

    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cursor
    except Exception:
        if not conn.autocommit:
            conn.rollback()
        raise
    finally:
        cursor.close()
        if borrowed_from_pool and p is not None and conn is not None:
            try:
                p.putconn(conn)
            except Exception:
                pass


def init_tables():
    """Create the four core research tables with native JSONB columns."""
    with get_cursor() as cur:
        cur.execute("""
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
            CREATE EXTENSION IF NOT EXISTS "vector";

            CREATE TABLE IF NOT EXISTS papers (
                paper_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                abstract TEXT,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS paper_sections (
                section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                paper_id UUID NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
                section_type TEXT NOT NULL,
                raw_content TEXT,
                bounding_box JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS math_evaluations (
                eval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                paper_id UUID NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
                raw_formula TEXT,
                ast_tree JSONB,
                rust_signature TEXT,
                state_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS audit_ledger (
                audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                paper_id UUID REFERENCES papers(paper_id) ON DELETE CASCADE,
                title TEXT,
                is_pinned BOOLEAN DEFAULT FALSE,
                rigor_score NUMERIC,
                verification_passed BOOLEAN DEFAULT FALSE,
                audit_flags JSONB DEFAULT '[]'::jsonb,
                review_summary TEXT,
                plagiarism_data JSONB DEFAULT '{}'::jsonb,
                terminology_data JSONB DEFAULT '{}'::jsonb,
                detailed_rigor JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            ALTER TABLE audit_ledger ALTER COLUMN paper_id DROP NOT NULL;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS title TEXT;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS plagiarism_data JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS terminology_data JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS detailed_rigor JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
            ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS file_id VARCHAR(100);
            ALTER TABLE papers ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);

            CREATE TABLE IF NOT EXISTS document_chunks (
                chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                paper_id UUID REFERENCES papers(paper_id) ON DELETE CASCADE,
                file_id VARCHAR(100),
                chunk_index INT NOT NULL,
                page_number INT DEFAULT 1,
                section_title TEXT,
                content TEXT NOT NULL,
                token_count INT DEFAULT 0,
                embedding vector(384),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_chunks_paper ON document_chunks(paper_id);
            CREATE INDEX IF NOT EXISTS idx_chunks_file ON document_chunks(file_id);

            CREATE TABLE IF NOT EXISTS user_memory_graph (
                memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(100) NOT NULL,
                memory_type VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                embedding vector(384),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_user_mem_uid ON user_memory_graph(user_id);

            CREATE TABLE IF NOT EXISTS paper_analysis_cache (
                cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                paper_id UUID REFERENCES papers(paper_id) ON DELETE CASCADE,
                analysis_type VARCHAR(50) NOT NULL,
                cached_data JSONB NOT NULL DEFAULT '{}'::jsonb,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_paper_analysis UNIQUE (paper_id, analysis_type)
            );
        """)

        # Fast HNSW vector indexes for sub-millisecond cosine similarity search
        try:
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
                ON document_chunks USING hnsw (embedding vector_cosine_ops);
                CREATE INDEX IF NOT EXISTS idx_user_mem_embedding_hnsw 
                ON user_memory_graph USING hnsw (embedding vector_cosine_ops);
            """)
        except Exception as hnsw_err:
            print(f"[INFO] [DB Manager] HNSW index notice: {hnsw_err}")

    print(
        "[OK] [DB Manager] Core research and vector tables verified "
        "(papers, paper_sections, math_evaluations, audit_ledger, document_chunks, user_memory_graph, paper_analysis_cache)."
    )


# ══════════════════════════════════════════════════════════════
# PAPERS CRUD
# ══════════════════════════════════════════════════════════════

def insert_paper(title: str, abstract: str = None, metadata: dict = None, user_id: str = None) -> str:
    """Insert a paper record and return its UUID."""
    paper_id = str(uuid.uuid4())
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO papers (paper_id, title, abstract, metadata, user_id)
               VALUES (%s, %s, %s, %s::jsonb, %s)
               RETURNING paper_id""",
            (paper_id, title, abstract, json.dumps(metadata or {}), user_id)
        )
        row = cur.fetchone()
        return str(row["paper_id"])


def get_paper(paper_id: str) -> Optional[Dict]:
    """Fetch a single paper by UUID."""
    with get_cursor() as cur:
        cur.execute("SELECT * FROM papers WHERE paper_id = %s", (paper_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_all_papers(user_id: Optional[str] = None) -> List[Dict]:
    """Fetch all papers, newest first, optionally scoped by user_id."""
    with get_cursor() as cur:
        if user_id and user_id != 'usr_admin':
            cur.execute("SELECT * FROM papers WHERE user_id = %s OR user_id IS NULL ORDER BY created_at DESC", (user_id,))
        else:
            cur.execute("SELECT * FROM papers ORDER BY created_at DESC")
        return [dict(r) for r in cur.fetchall()]


def update_paper_metadata(paper_id: str, metadata: dict) -> bool:
    """Merge-update a paper's JSONB metadata field."""
    with get_cursor() as cur:
        cur.execute(
            "UPDATE papers SET metadata = %s::jsonb WHERE paper_id = %s",
            (json.dumps(metadata), paper_id)
        )
        return cur.rowcount > 0


# ══════════════════════════════════════════════════════════════
# PAPER SECTIONS CRUD
# ══════════════════════════════════════════════════════════════

def insert_section(
    paper_id: str,
    section_type: str,
    raw_content: str = None,
    bounding_box: dict = None,
) -> str:
    """Insert a paper section and return its UUID."""
    section_id = str(uuid.uuid4())
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO paper_sections
                   (section_id, paper_id, section_type, raw_content, bounding_box)
               VALUES (%s, %s, %s, %s, %s::jsonb)
               RETURNING section_id""",
            (
                section_id, paper_id, section_type, raw_content,
                json.dumps(bounding_box) if bounding_box else None,
            )
        )
        row = cur.fetchone()
        return str(row["section_id"])


def get_sections_by_paper(paper_id: str) -> List[Dict]:
    """Fetch all sections for a paper, in insertion order."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM paper_sections WHERE paper_id = %s ORDER BY created_at",
            (paper_id,)
        )
        return [dict(r) for r in cur.fetchall()]


# ══════════════════════════════════════════════════════════════
# MATH EVALUATIONS CRUD
# ══════════════════════════════════════════════════════════════

def insert_math_evaluation(
    paper_id: str,
    raw_formula: str,
    ast_tree: dict = None,
    rust_signature: str = None,
    state_data: dict = None,
) -> str:
    """Insert a math evaluation and return its UUID."""
    eval_id = str(uuid.uuid4())
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO math_evaluations
                   (eval_id, paper_id, raw_formula, ast_tree, rust_signature, state_data)
               VALUES (%s, %s, %s, %s::jsonb, %s, %s::jsonb)
               RETURNING eval_id""",
            (
                eval_id, paper_id, raw_formula,
                json.dumps(ast_tree) if ast_tree else None,
                rust_signature,
                json.dumps(state_data or {}),
            )
        )
        row = cur.fetchone()
        return str(row["eval_id"])


def get_evaluations_by_paper(paper_id: str) -> List[Dict]:
    """Fetch all math evaluations for a paper."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM math_evaluations WHERE paper_id = %s ORDER BY created_at",
            (paper_id,)
        )
        return [dict(r) for r in cur.fetchall()]


# ══════════════════════════════════════════════════════════════
# AUDIT LEDGER CRUD
# ══════════════════════════════════════════════════════════════

def insert_audit(
    paper_id: Optional[str] = None,
    title: Optional[str] = None,
    is_pinned: bool = False,
    rigor_score: float = None,
    verification_passed: bool = False,
    audit_flags: list = None,
    review_summary: str = None,
    plagiarism_data: dict = None,
    terminology_data: dict = None,
    detailed_rigor: dict = None,
    user_id: Optional[str] = None,
    file_id: Optional[str] = None,
) -> str:
    valid_paper_id = None
    if paper_id:
        try:
            uuid.UUID(str(paper_id))
            valid_paper_id = str(paper_id)
        except (ValueError, AttributeError):
            valid_paper_id = None

    with get_cursor() as cur:
        # If valid_paper_id provided, ensure paper exists in papers table
        if valid_paper_id:
            cur.execute("SELECT 1 FROM papers WHERE paper_id = %s", (valid_paper_id,))
            if not cur.fetchone():
                valid_paper_id = None

        # Check for existing audit for this paper title and user to prevent duplicates
        clean_t = (title or "").strip()
        base_t = clean_t.replace(".pdf", "").replace(".PDF", "").strip()
        if user_id and user_id != 'usr_admin':
            cur.execute("""SELECT audit_id FROM audit_ledger 
                           WHERE (LOWER(REPLACE(title, '.pdf', '')) = LOWER(%s) 
                                  OR LOWER(title) = LOWER(%s)
                                  OR (file_id IS NOT NULL AND file_id = %s))
                           AND user_id = %s""", (base_t, clean_t, file_id, user_id))
        else:
            cur.execute("""SELECT audit_id FROM audit_ledger 
                           WHERE (LOWER(REPLACE(title, '.pdf', '')) = LOWER(%s) 
                              OR LOWER(title) = LOWER(%s)
                              OR (file_id IS NOT NULL AND file_id = %s))
                           AND (user_id IS NULL OR user_id = 'usr_admin')""", (base_t, clean_t, file_id))
        existing = cur.fetchone()

        if existing:
            existing_id = str(existing["audit_id"])
            cur.execute(
                """UPDATE audit_ledger
                   SET rigor_score = %s, verification_passed = %s, audit_flags = %s::jsonb,
                       review_summary = %s, plagiarism_data = %s::jsonb, terminology_data = %s::jsonb,
                       detailed_rigor = %s::jsonb, file_id = COALESCE(%s, file_id), created_at = NOW()
                   WHERE audit_id = %s RETURNING audit_id""",
                (
                    rigor_score, verification_passed, json.dumps(audit_flags or []),
                    review_summary, json.dumps(plagiarism_data or {}), json.dumps(terminology_data or {}),
                    json.dumps(detailed_rigor or {}), file_id, existing_id
                )
            )
            return existing_id

        audit_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO audit_ledger
                   (audit_id, paper_id, title, is_pinned, rigor_score, verification_passed,
                    audit_flags, review_summary, plagiarism_data, terminology_data, detailed_rigor, user_id, file_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s)
               RETURNING audit_id""",
            (
                audit_id, valid_paper_id, title, is_pinned, rigor_score, verification_passed,
                json.dumps(audit_flags or []),
                review_summary,
                json.dumps(plagiarism_data or {}),
                json.dumps(terminology_data or {}),
                json.dumps(detailed_rigor or {}),
                user_id,
                file_id,
            )
        )
        row = cur.fetchone()
        return str(row["audit_id"])


def create_audit(title: str = "New Rigor Audit Ledger", paper_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """Create an empty audit ledger session and return its UUID."""
    return insert_audit(
        paper_id=paper_id,
        title=title,
        rigor_score=0.0,
        verification_passed=False,
        audit_flags=[],
        review_summary="Pending audit execution.",
        user_id=user_id
    )


def rename_audit(audit_id: str, new_title: str) -> bool:
    """Rename an audit ledger record."""
    with get_cursor() as cur:
        cur.execute(
            "UPDATE audit_ledger SET title = %s WHERE audit_id = %s RETURNING audit_id",
            (new_title, audit_id)
        )
        return cur.fetchone() is not None


def pin_audit(audit_id: str, is_pinned: bool) -> bool:
    """Toggle or set pin status of an audit record."""
    with get_cursor() as cur:
        cur.execute(
            "UPDATE audit_ledger SET is_pinned = %s WHERE audit_id = %s RETURNING audit_id",
            (is_pinned, audit_id)
        )
        return cur.fetchone() is not None


def update_audit(
    audit_id: str,
    title: Optional[str] = None,
    is_pinned: Optional[bool] = None,
    rigor_score: Optional[float] = None,
    verification_passed: Optional[bool] = None,
    audit_flags: Optional[list] = None,
    review_summary: Optional[str] = None,
    plagiarism_data: Optional[dict] = None,
    terminology_data: Optional[dict] = None,
    detailed_rigor: Optional[dict] = None,
) -> bool:
    """Update fields on an audit record."""
    fields = []
    vals = []
    if title is not None:
        fields.append("title = %s")
        vals.append(title)
    if is_pinned is not None:
        fields.append("is_pinned = %s")
        vals.append(is_pinned)
    if rigor_score is not None:
        fields.append("rigor_score = %s")
        vals.append(rigor_score)
    if verification_passed is not None:
        fields.append("verification_passed = %s")
        vals.append(verification_passed)
    if audit_flags is not None:
        fields.append("audit_flags = %s::jsonb")
        vals.append(json.dumps(audit_flags))
    if review_summary is not None:
        fields.append("review_summary = %s")
        vals.append(review_summary)
    if plagiarism_data is not None:
        fields.append("plagiarism_data = %s::jsonb")
        vals.append(json.dumps(plagiarism_data))
    if terminology_data is not None:
        fields.append("terminology_data = %s::jsonb")
        vals.append(json.dumps(terminology_data))
    if detailed_rigor is not None:
        fields.append("detailed_rigor = %s::jsonb")
        vals.append(json.dumps(detailed_rigor))

    if not fields:
        return False

    vals.append(audit_id)
    sql = f"UPDATE audit_ledger SET {', '.join(fields)} WHERE audit_id = %s RETURNING audit_id"
    with get_cursor() as cur:
        cur.execute(sql, tuple(vals))
        return cur.fetchone() is not None


def get_all_audits(user_id: Optional[str] = None) -> List[Dict]:
    """Fetch all audits joined with paper title, pinned first, then newest first."""
    with get_cursor() as cur:
        if user_id and user_id != 'usr_admin':
            cur.execute(
                """SELECT a.*, p.title as paper_title
                   FROM audit_ledger a
                   LEFT JOIN papers p ON a.paper_id = p.paper_id
                   WHERE a.user_id = %s
                   ORDER BY a.is_pinned DESC NULLS LAST, a.created_at DESC""",
                (user_id,)
            )
        else:
            cur.execute(
                """SELECT a.*, p.title as paper_title
                   FROM audit_ledger a
                   LEFT JOIN papers p ON a.paper_id = p.paper_id
                   WHERE a.user_id = 'usr_admin' OR a.user_id IS NULL
                   ORDER BY a.is_pinned DESC NULLS LAST, a.created_at DESC"""
            )
        return [dict(r) for r in cur.fetchall()]


def get_audit(audit_id: str) -> Optional[Dict]:
    """Fetch a single audit by UUID."""
    with get_cursor() as cur:
        cur.execute(
            """SELECT a.*, p.title as paper_title
               FROM audit_ledger a
               LEFT JOIN papers p ON a.paper_id = p.paper_id
               WHERE a.audit_id = %s""",
            (audit_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def delete_audit(audit_id: str) -> bool:
    """Delete an audit record by UUID."""
    with get_cursor() as cur:
        cur.execute("DELETE FROM audit_ledger WHERE audit_id = %s RETURNING audit_id", (audit_id,))
        return cur.fetchone() is not None


def get_audits_by_paper(paper_id: str) -> List[Dict]:
    """Fetch all audits for a paper, newest first."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT * FROM audit_ledger WHERE paper_id = %s ORDER BY created_at DESC",
            (paper_id,)
        )
        return [dict(r) for r in cur.fetchall()]


def get_latest_audit(paper_id: str) -> Optional[Dict]:
    """Fetch the most recent audit for a paper."""
    with get_cursor() as cur:
        cur.execute(
            """SELECT * FROM audit_ledger
               WHERE paper_id = %s ORDER BY created_at DESC LIMIT 1""",
            (paper_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_role_telemetry(user_id: Optional[str] = None, role: str = "researcher") -> Dict[str, Any]:
    """
    Fetch role-tailored database telemetry and chart distributions for a specific account.
    All metrics are strictly parameterized and isolated by user_id.
    """
    norm_role = (role or "researcher").lower().strip()
    uid = user_id or "usr_admin"

    counts = {
        "vault": 0, "workspaces": 0, "domain": 0, "math": 0,
        "audits": 0, "flashcards": 0, "mastered": 0, "code": 0, "notes": 0, "avg_rigor": 89.2
    }

    try:
        with get_cursor() as cur:
            if uid and uid != "usr_admin":
                cur.execute("SELECT count(*) as c FROM file_system WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["vault"] = r["c"]

                cur.execute("SELECT count(*) as c FROM insightlens_workspaces WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["workspaces"] = r["c"]

                cur.execute("SELECT count(*) as c FROM domain_workspaces WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["domain"] = r["c"]

                cur.execute("SELECT count(*) as c FROM math_evaluator_sessions WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["math"] = r["c"]

                cur.execute("SELECT count(*) as c FROM audit_ledger WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["audits"] = r["c"]

                cur.execute("SELECT count(*) as c FROM code_implementations WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["code"] = r["c"]

                cur.execute("SELECT count(*) as c FROM student_flashcards WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r: counts["flashcards"] = r["c"]

                cur.execute("SELECT count(*) as c FROM student_flashcards WHERE user_id = %s AND mastery_level = 2", (uid,))
                r = cur.fetchone()
                if r: counts["mastered"] = r["c"]

                try:
                    cur.execute("SELECT count(*) as c FROM global_vault_notes WHERE user_id = %s", (uid,))
                    r = cur.fetchone()
                    if r: counts["notes"] = r["c"]
                except Exception:
                    pass

                cur.execute("SELECT AVG(rigor_score) as avg_r FROM audit_ledger WHERE user_id = %s", (uid,))
                r = cur.fetchone()
                if r and r["avg_r"] is not None:
                    counts["avg_rigor"] = round(float(r["avg_r"]), 1)
            else:
                cur.execute("SELECT count(*) as c FROM file_system")
                r = cur.fetchone()
                if r: counts["vault"] = r["c"]

                cur.execute("SELECT count(*) as c FROM insightlens_workspaces")
                r = cur.fetchone()
                if r: counts["workspaces"] = r["c"]

                cur.execute("SELECT count(*) as c FROM domain_workspaces")
                r = cur.fetchone()
                if r: counts["domain"] = r["c"]

                cur.execute("SELECT count(*) as c FROM math_evaluator_sessions")
                r = cur.fetchone()
                if r: counts["math"] = r["c"]

                cur.execute("SELECT count(*) as c FROM audit_ledger")
                r = cur.fetchone()
                if r: counts["audits"] = r["c"]

                cur.execute("SELECT count(*) as c FROM code_implementations")
                r = cur.fetchone()
                if r: counts["code"] = r["c"]

                cur.execute("SELECT count(*) as c FROM student_flashcards")
                r = cur.fetchone()
                if r: counts["flashcards"] = r["c"]

                cur.execute("SELECT count(*) as c FROM student_flashcards WHERE mastery_level = 2")
                r = cur.fetchone()
                if r: counts["mastered"] = r["c"]

                try:
                    cur.execute("SELECT count(*) as c FROM global_vault_notes")
                    r = cur.fetchone()
                    if r: counts["notes"] = r["c"]
                except Exception:
                    pass
    except Exception as e:
        print(f"[WARN] [DB Manager] Telemetry fetch error: {e}")

    # Build role-specific visualization payload
    if norm_role == "professor":
        return {
            "status": "success",
            "role": "professor",
            "graphTitle": "Faculty Supervision & Peer Review Distribution",
            "graphSub": "Supervised audits, student decks, curated papers & synthesis",
            "chartData": [
                {"name": "Audits", "count": counts["audits"], "label": "Audits Supervised"},
                {"name": "Decks", "count": counts["flashcards"], "label": "Student Study Decks"},
                {"name": "Papers", "count": counts["vault"], "label": "Curated Manuscripts"},
                {"name": "Matrices", "count": counts["domain"], "label": "Synthesis Matrices"},
                {"name": "Notes", "count": counts["notes"], "label": "Faculty Advisory Notes"}
            ]
        }
    elif norm_role == "programmer":
        return {
            "status": "success",
            "role": "programmer",
            "graphTitle": "Algorithmic Implementation & Model Benchmarks",
            "graphSub": "PyTorch extractions, WASM sessions, mathematical nodes & repos",
            "chartData": [
                {"name": "PyTorch", "count": counts["code"], "label": "PyTorch Modules"},
                {"name": "WASM", "count": counts["math"], "label": "WASM Math Sessions"},
                {"name": "Workspaces", "count": counts["workspaces"], "label": "Active Code Workspaces"},
                {"name": "Vault", "count": counts["vault"], "label": "Repository Files"},
                {"name": "Alg Notes", "count": counts["notes"], "label": "Algorithm Snippets"}
            ]
        }
    elif norm_role == "student":
        return {
            "status": "success",
            "role": "student",
            "graphTitle": "Curricular Mastery & Study Decks",
            "graphSub": "Study flashcards, mastered concepts, active papers & math evaluations",
            "chartData": [
                {"name": "Flashcards", "count": counts["flashcards"], "label": "Total Flashcards"},
                {"name": "Mastered", "count": counts["mastered"], "label": "Mastered Concepts"},
                {"name": "Papers", "count": counts["vault"], "label": "Study Papers"},
                {"name": "Math Work", "count": counts["math"], "label": "Formulas Tested"},
                {"name": "Study Notes", "count": counts["notes"], "label": "Personal Notes"}
            ]
        }
    elif norm_role == "reviewer":
        return {
            "status": "success",
            "role": "reviewer",
            "graphTitle": "Methodological Verification & Audit Spread",
            "graphSub": "Manuscript audits, rigor integrity flags, comparative matrices & notes",
            "chartData": [
                {"name": "Audits", "count": counts["audits"], "label": "Forensic Audits"},
                {"name": "Rigor %", "count": int(counts["avg_rigor"]), "label": "Avg Rigor Score"},
                {"name": "Papers", "count": counts["vault"], "label": "Assigned Papers"},
                {"name": "Matrices", "count": counts["domain"], "label": "Literature Checks"},
                {"name": "Reports", "count": counts["notes"], "label": "Audit Reports"}
            ]
        }
    else:  # researcher
        return {
            "status": "success",
            "role": "researcher",
            "graphTitle": "Research Artifact Matrix",
            "graphSub": "Vault papers, live workspaces, literature matrices & math evaluations",
            "chartData": [
                {"name": "Papers", "count": counts["vault"], "label": "Vault Manuscripts"},
                {"name": "Workspaces", "count": counts["workspaces"], "label": "InsightLens Sessions"},
                {"name": "Matrices", "count": counts["domain"], "label": "Domain Matrices"},
                {"name": "Math Nodes", "count": counts["math"], "label": "WASM Formulations"},
                {"name": "Audits", "count": counts["audits"], "label": "ScholarAudits"}
            ]
        }


# ══════════════════════════════════════════════════════════════
# DOCUMENT CHUNKS & VECTOR RAG (pgvector)
# ══════════════════════════════════════════════════════════════

def insert_document_chunk(
    paper_id: Optional[str],
    file_id: Optional[str],
    chunk_index: int,
    page_number: int,
    section_title: str,
    content: str,
    token_count: int,
    embedding: Optional[List[float]],
    metadata: Optional[Dict] = None
) -> str:
    """Insert a single document chunk with pgvector embedding."""
    chunk_id = str(uuid.uuid4())
    emb_str = str(embedding) if embedding is not None else None
    valid_paper_id = None
    if paper_id:
        try:
            valid_paper_id = str(uuid.UUID(str(paper_id)))
        except (ValueError, AttributeError):
            valid_paper_id = None
            if metadata is not None:
                metadata["raw_paper_id"] = str(paper_id)

    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO document_chunks 
               (chunk_id, paper_id, file_id, chunk_index, page_number, section_title, content, token_count, embedding, metadata)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s::jsonb)
               RETURNING chunk_id""",
            (
                chunk_id, valid_paper_id, str(file_id) if file_id is not None else None, chunk_index, page_number, section_title,
                content, token_count, emb_str, json.dumps(metadata or {})
            )
        )
        row = cur.fetchone()
        return str(row["chunk_id"])


def insert_document_chunks_batch(chunks: List[Dict]) -> int:
    """Insert a batch of document chunks efficiently using executemany."""
    if not chunks:
        return 0
    with get_cursor() as cur:
        args = []
        for c in chunks:
            cid = str(c.get("chunk_id") or uuid.uuid4())
            emb = c.get("embedding")
            emb_str = str(list(emb)) if emb is not None else None
            meta = dict(c.get("metadata") or {})
            pid = c.get("paper_id")
            valid_pid = None
            if pid:
                try:
                    valid_pid = str(uuid.UUID(str(pid)))
                except (ValueError, AttributeError):
                    valid_pid = None
                    meta["raw_paper_id"] = str(pid)

            fid = c.get("file_id")
            args.append((
                cid,
                valid_pid,
                str(fid) if fid is not None else None,
                int(c.get("chunk_index", 0)),
                int(c.get("page_number", 1)),
                c.get("section_title") or "General",
                c.get("content", ""),
                int(c.get("token_count", 0)),
                emb_str,
                json.dumps(meta)
            ))
        psycopg2.extras.execute_values(
            cur,
            """INSERT INTO document_chunks 
               (chunk_id, paper_id, file_id, chunk_index, page_number, section_title, content, token_count, embedding, metadata)
               VALUES %s""",
            args,
            template="(%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s::jsonb)"
        )
        return len(chunks)


def search_document_chunks(
    query_embedding: List[float],
    paper_id: Optional[str] = None,
    file_id: Optional[str] = None,
    top_k: int = 5,
    min_similarity: float = 0.0
) -> List[Dict]:
    """
    Search document chunks via pgvector cosine distance (<=>).
    Returns chunks ordered by similarity descending.
    """
    emb_str = str(list(query_embedding))
    conditions = ["embedding IS NOT NULL"]
    params = [emb_str]

    if paper_id:
        conditions.append("paper_id = %s")
        params.append(paper_id)
    if file_id:
        conditions.append("file_id = %s")
        params.append(file_id)

    params.extend([emb_str, min_similarity, top_k])

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT chunk_id, paper_id, file_id, chunk_index, page_number, 
               section_title, content, token_count, metadata, created_at,
               (1 - (embedding <=> %s::vector)) AS similarity
        FROM document_chunks
        WHERE {where_clause}
          AND (1 - (embedding <=> %s::vector)) >= %s
        ORDER BY embedding <=> %s::vector ASC
        LIMIT %s
    """
    # Need emb_str twice for similarity calculation and once for ordering
    # Rebuild params cleanly
    final_params = [emb_str] # for select similarity
    for c in conditions[1:]: # skip first condition 'embedding IS NOT NULL'
        pass
    
    # Clean parameterized query
    query_params = [emb_str]
    filter_sql = ""
    if paper_id:
        valid_pid = None
        try:
            valid_pid = str(uuid.UUID(str(paper_id)))
        except (ValueError, AttributeError):
            valid_pid = None
        if valid_pid:
            filter_sql += " AND paper_id = %s"
            query_params.append(valid_pid)
        else:
            filter_sql += " AND metadata->>'raw_paper_id' = %s"
            query_params.append(str(paper_id))

    if file_id:
        filter_sql += " AND file_id = %s"
        query_params.append(str(file_id))

    query_params.extend([emb_str, min_similarity, emb_str, top_k])

    final_sql = f"""
        SELECT chunk_id, paper_id, file_id, chunk_index, page_number, 
               section_title, content, token_count, metadata, created_at,
               (1.0 - (embedding <=> %s::vector)) AS similarity
        FROM document_chunks
        WHERE embedding IS NOT NULL {filter_sql}
          AND (1.0 - (embedding <=> %s::vector)) >= %s
        ORDER BY embedding <=> %s::vector ASC
        LIMIT %s
    """

    with get_cursor() as cur:
        cur.execute(final_sql, tuple(query_params))
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def get_chunks_by_paper(paper_id: str) -> List[Dict]:
    """Retrieve all chunks for a specific paper ordered by chunk_index."""
    valid_pid = None
    if paper_id:
        try:
            valid_pid = str(uuid.UUID(str(paper_id)))
        except (ValueError, AttributeError):
            valid_pid = None

    with get_cursor() as cur:
        if valid_pid:
            cur.execute(
                """SELECT chunk_id, paper_id, file_id, chunk_index, page_number,
                          section_title, content, token_count, metadata, created_at
                   FROM document_chunks
                   WHERE paper_id = %s
                   ORDER BY chunk_index ASC""",
                (valid_pid,)
            )
        else:
            cur.execute(
                """SELECT chunk_id, paper_id, file_id, chunk_index, page_number,
                          section_title, content, token_count, metadata, created_at
                   FROM document_chunks
                   WHERE metadata->>'raw_paper_id' = %s
                   ORDER BY chunk_index ASC""",
                (str(paper_id),)
            )
        return [dict(r) for r in cur.fetchall()]


def delete_chunks_by_paper(paper_id: str) -> int:
    """Delete all chunks for a specific paper."""
    valid_pid = None
    if paper_id:
        try:
            valid_pid = str(uuid.UUID(str(paper_id)))
        except (ValueError, AttributeError):
            valid_pid = None

    with get_cursor() as cur:
        if valid_pid:
            cur.execute("DELETE FROM document_chunks WHERE paper_id = %s", (valid_pid,))
        else:
            cur.execute("DELETE FROM document_chunks WHERE metadata->>'raw_paper_id' = %s", (str(paper_id),))
        return cur.rowcount


# ══════════════════════════════════════════════════════════════
# USER MEMORY GRAPH & CONTEXT PROFILES
# ══════════════════════════════════════════════════════════════

def insert_user_memory(
    user_id: str,
    memory_type: str,
    content: str,
    embedding: Optional[List[float]] = None,
    metadata: Optional[Dict] = None
) -> str:
    """Store a user-specific memory node (interaction summary, preference, domain expertise)."""
    memory_id = str(uuid.uuid4())
    emb_str = str(list(embedding)) if embedding is not None else None
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO user_memory_graph (memory_id, user_id, memory_type, content, embedding, metadata)
               VALUES (%s, %s, %s, %s, %s::vector, %s::jsonb)
               RETURNING memory_id""",
            (memory_id, user_id or "usr_admin", memory_type, content, emb_str, json.dumps(metadata or {}))
        )
        row = cur.fetchone()
        return str(row["memory_id"])


def search_user_memory(user_id: str, query_embedding: List[float], top_k: int = 3) -> List[Dict]:
    """Retrieve the most contextually relevant past user interactions or preferences."""
    emb_str = str(list(query_embedding))
    uid = user_id or "usr_admin"
    with get_cursor() as cur:
        cur.execute(
            """SELECT memory_id, user_id, memory_type, content, metadata, created_at,
                      (1.0 - (embedding <=> %s::vector)) AS similarity
               FROM user_memory_graph
               WHERE (user_id = %s OR user_id = 'usr_admin') AND embedding IS NOT NULL
               ORDER BY embedding <=> %s::vector ASC
               LIMIT %s""",
            (emb_str, uid, emb_str, top_k)
        )
        return [dict(r) for r in cur.fetchall()]


def get_user_recent_memories(user_id: str, limit: int = 5) -> List[Dict]:
    """Fetch recent user memory entries."""
    uid = user_id or "usr_admin"
    with get_cursor() as cur:
        cur.execute(
            """SELECT memory_id, user_id, memory_type, content, metadata, created_at
               FROM user_memory_graph
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT %s""",
            (uid, limit)
        )
        return [dict(r) for r in cur.fetchall()]


# ══════════════════════════════════════════════════════════════
# PAPER ANALYSIS CACHE (Memory + PostgreSQL Hybrid)
# ══════════════════════════════════════════════════════════════

_ANALYSIS_MEMORY_CACHE: Dict[tuple, Dict] = {}
_MAX_ANALYSIS_CACHE = 1000


def get_cached_paper_analysis(paper_id: str, analysis_type: str) -> Optional[Dict]:
    """Fetch cached analysis (matrix digest, rigor audit, math equations). Checks fast in-memory cache first."""
    if not paper_id or not analysis_type:
        return None
    cache_key = (str(paper_id), str(analysis_type))
    if cache_key in _ANALYSIS_MEMORY_CACHE:
        return _ANALYSIS_MEMORY_CACHE[cache_key]

    with get_cursor() as cur:
        cur.execute(
            """SELECT cached_data, updated_at FROM paper_analysis_cache 
               WHERE paper_id = %s AND analysis_type = %s""",
            (paper_id, analysis_type)
        )
        row = cur.fetchone()
        if row and row.get("cached_data"):
            data = dict(row["cached_data"])
            if len(_ANALYSIS_MEMORY_CACHE) < _MAX_ANALYSIS_CACHE:
                _ANALYSIS_MEMORY_CACHE[cache_key] = data
            return data
        return None


def set_cached_paper_analysis(paper_id: str, analysis_type: str, data: Dict) -> bool:
    """Store or update cached paper analysis in both memory and PostgreSQL."""
    if not paper_id or not analysis_type:
        return False
    cache_key = (str(paper_id), str(analysis_type))
    if len(_ANALYSIS_MEMORY_CACHE) < _MAX_ANALYSIS_CACHE:
        _ANALYSIS_MEMORY_CACHE[cache_key] = data

    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO paper_analysis_cache (cache_id, paper_id, analysis_type, cached_data, updated_at)
               VALUES (gen_random_uuid(), %s, %s, %s::jsonb, NOW())
               ON CONFLICT (paper_id, analysis_type)
               DO UPDATE SET cached_data = EXCLUDED.cached_data, updated_at = NOW()
               RETURNING cache_id""",
            (paper_id, analysis_type, json.dumps(data))
        )
        return cur.fetchone() is not None


# ══════════════════════════════════════════════════════════════
# UTILITY
# ══════════════════════════════════════════════════════════════

def close():
    """Close the database connection and connection pool."""
    global _connection, _pool
    if _pool:
        try:
            _pool.closeall()
            _pool = None
            print("[INFO] [DB Manager] Connection pool closed.")
        except Exception:
            pass
    if _connection and not _connection.closed:
        _connection.close()
        _connection = None
        print("[INFO] [DB Manager] Connection closed.")

