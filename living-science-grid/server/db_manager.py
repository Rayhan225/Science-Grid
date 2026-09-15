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

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.nxarpilggbxfoyfkywey:RayhanSourov%40123"
    "@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    "?sslmode=require"
)

_connection = None


def get_connection():
    """Get or create the database connection."""
    global _connection
    if _connection is None or _connection.closed:
        _connection = psycopg2.connect(DATABASE_URL)
        _connection.autocommit = True
        print("[OK] [DB Manager] Connected to PostgreSQL.")
    return _connection


@contextmanager
def get_cursor():
    """Context manager for a database cursor with auto commit/rollback."""
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()


def init_tables():
    """Create the four core research tables with native JSONB columns."""
    with get_cursor() as cur:
        cur.execute("""
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
                paper_id UUID NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
                rigor_score NUMERIC,
                verification_passed BOOLEAN DEFAULT FALSE,
                audit_flags JSONB DEFAULT '[]'::jsonb,
                review_summary TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
    print(
        "[OK] [DB Manager] Core research tables verified "
        "(papers, paper_sections, math_evaluations, audit_ledger)."
    )


# ══════════════════════════════════════════════════════════════
# PAPERS CRUD
# ══════════════════════════════════════════════════════════════

def insert_paper(title: str, abstract: str = None, metadata: dict = None) -> str:
    """Insert a paper record and return its UUID."""
    paper_id = str(uuid.uuid4())
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO papers (paper_id, title, abstract, metadata)
               VALUES (%s, %s, %s, %s::jsonb)
               RETURNING paper_id""",
            (paper_id, title, abstract, json.dumps(metadata or {}))
        )
        row = cur.fetchone()
        return str(row["paper_id"])


def get_paper(paper_id: str) -> Optional[Dict]:
    """Fetch a single paper by UUID."""
    with get_cursor() as cur:
        cur.execute("SELECT * FROM papers WHERE paper_id = %s", (paper_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_all_papers() -> List[Dict]:
    """Fetch all papers, newest first."""
    with get_cursor() as cur:
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
    paper_id: str,
    rigor_score: float = None,
    verification_passed: bool = False,
    audit_flags: list = None,
    review_summary: str = None,
) -> str:
    """Insert an audit record and return its UUID."""
    audit_id = str(uuid.uuid4())
    with get_cursor() as cur:
        cur.execute(
            """INSERT INTO audit_ledger
                   (audit_id, paper_id, rigor_score, verification_passed,
                    audit_flags, review_summary)
               VALUES (%s, %s, %s, %s, %s::jsonb, %s)
               RETURNING audit_id""",
            (
                audit_id, paper_id, rigor_score, verification_passed,
                json.dumps(audit_flags or []),
                review_summary,
            )
        )
        row = cur.fetchone()
        return str(row["audit_id"])


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


# ══════════════════════════════════════════════════════════════
# UTILITY
# ══════════════════════════════════════════════════════════════

def close():
    """Close the database connection."""
    global _connection
    if _connection and not _connection.closed:
        _connection.close()
        _connection = None
        print("[INFO] [DB Manager] Connection closed.")
