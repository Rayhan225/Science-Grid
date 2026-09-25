# research_brain/academic_layouts.py
import re
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import asyncpg
try:
    from authentic_templates_data import AUTHENTIC_TEMPLATES, CATEGORIES as AUTH_CATEGORIES, PUBLISHERS as AUTH_PUBLISHERS
except ImportError:
    from research_brain.authentic_templates_data import AUTHENTIC_TEMPLATES, CATEGORIES as AUTH_CATEGORIES, PUBLISHERS as AUTH_PUBLISHERS

router = APIRouter(prefix="/api/latex/layouts", tags=["Academic Layouts"])

AUTHENTIC_BY_ID = {t["id"]: t for t in AUTHENTIC_TEMPLATES}

CATEGORIES = AUTH_CATEGORIES
PUBLISHERS = AUTH_PUBLISHERS

RANKINGS = ["All", "Q1 Journals", "Q2 Journals", "Q3 Journals", "Q4 Journals"]
KINDS = [
    "All",
    "Journal Article",
    "Conference Proceedings",
    "Review Article",
    "Thesis & Dissertation",
    "Book Series",
    "Letters",
    "Technical Report"
]

_db_pool_ref = None

def set_db_pool(pool):
    global _db_pool_ref
    _db_pool_ref = pool

async def get_db_conn():
    if _db_pool_ref is None:
        return None
    return _db_pool_ref

async def init_layouts_table(conn: asyncpg.Connection):
    """Ensures academic_layouts table exists and seeds authentic templates."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS academic_layouts (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            publisher VARCHAR(100) NOT NULL,
            category VARCHAR(100) NOT NULL,
            columns INT DEFAULT 2,
            citation_format VARCHAR(100) DEFAULT 'IEEE / BibTeX',
            doc_class VARCHAR(100) NOT NULL,
            downloads INT DEFAULT 1000,
            template_code TEXT NOT NULL,
            tags TEXT[] DEFAULT ARRAY[]::TEXT[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_academic_layouts_cat ON academic_layouts(category);
        CREATE INDEX IF NOT EXISTS idx_academic_layouts_pub ON academic_layouts(publisher);
        CREATE INDEX IF NOT EXISTS idx_academic_layouts_name ON academic_layouts(name);
    """)

    # Upsert authentic templates into the database
    for t in AUTHENTIC_TEMPLATES:
        await conn.execute("""
            INSERT INTO academic_layouts (id, name, publisher, category, columns, citation_format, doc_class, downloads, template_code, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                publisher = EXCLUDED.publisher,
                category = EXCLUDED.category,
                columns = EXCLUDED.columns,
                citation_format = EXCLUDED.citation_format,
                doc_class = EXCLUDED.doc_class,
                template_code = EXCLUDED.template_code,
                tags = EXCLUDED.tags;
        """, t["id"], t["name"], t["publisher"], t["category"], t["columns"],
           t["citation_format"], t["doc_class"], 12500, t["latex_code"], t.get("tags", []))

def filter_authentic_templates(
    search: Optional[str] = None,
    category: Optional[str] = None,
    publisher: Optional[str] = None,
    ranking: Optional[str] = None,
    kind: Optional[str] = None,
    access: Optional[str] = None
) -> List[Dict[str, Any]]:
    results = list(AUTHENTIC_TEMPLATES)

    if category and category not in ["All Categories", "All"]:
        results = [t for t in results if t.get("category") == category]

    if publisher and publisher not in ["All Publishers", "All"]:
        results = [t for t in results if t.get("publisher") == publisher]

    if ranking and ranking not in ["All"]:
        results = [t for t in results if t.get("ranking") == ranking]

    if kind and kind not in ["All"]:
        results = [t for t in results if t.get("kind") == kind]

    if access and access not in ["All"]:
        results = [t for t in results if t.get("access") == access]

    if search and search.strip():
        s = search.strip().lower()
        results = [
            t for t in results
            if s in t.get("name", "").lower()
            or s in t.get("paper_title", "").lower()
            or s in t.get("publisher", "").lower()
            or s in t.get("category", "").lower()
            or s in t.get("issn", "").lower()
            or any(s in tag.lower() for tag in t.get("tags", []))
        ]

    return results

@router.get("")
async def get_layouts(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query("All Categories"),
    publisher: Optional[str] = Query("All Publishers"),
    ranking: Optional[str] = Query("All"),
    kind: Optional[str] = Query("All"),
    access: Optional[str] = Query("All"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=4, le=100)
):
    # Filter from authentic templates
    filtered_authentic = filter_authentic_templates(
        search=search,
        category=category,
        publisher=publisher,
        ranking=ranking,
        kind=kind,
        access=access
    )

    total = len(filtered_authentic)
    offset = (page - 1) * page_size
    paged = filtered_authentic[offset:offset + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "categories": CATEGORIES,
        "publishers": PUBLISHERS,
        "rankings": RANKINGS,
        "kinds": KINDS,
        "layouts": paged
    }

@router.get("/{layout_id}/template")
async def get_layout_template(layout_id: str):
    # Check in authentic templates first
    if layout_id in AUTHENTIC_BY_ID:
        tmpl = AUTHENTIC_BY_ID[layout_id]
        return {
            "layout": tmpl,
            "latex_code": tmpl["latex_code"],
            "bib_content": tmpl.get("bib_content", "")
        }

    pool = await get_db_conn()
    if pool:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, name, publisher, category, columns, citation_format, template_code
                FROM academic_layouts WHERE id = $1
            """, layout_id)
            if row:
                return {
                    "layout": dict(row),
                    "latex_code": row["template_code"],
                    "bib_content": ""
                }

    raise HTTPException(status_code=404, detail="Layout template not found.")