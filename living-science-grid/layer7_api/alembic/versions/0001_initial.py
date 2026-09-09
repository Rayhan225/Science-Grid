"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-14 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import os

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Apply raw SQL schema from file (idempotent checks inside)
    dir_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    schema_path = os.path.join(dir_path, 'db', 'schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        sql = f.read()
    conn = op.get_bind()
    # Some DBAPI drivers don't accept multiple statements in execute; use executescript if available
    try:
        conn.execute(sa.text(sql))
    except Exception:
        # fallback: split by ';' naive approach
        for stmt in sql.split(';'):
            stmt = stmt.strip()
            if not stmt:
                continue
            conn.execute(sa.text(stmt))


def downgrade():
    # No-op downgrade for initial migration. Drop tables intentionally omitted to avoid data loss.
    pass
