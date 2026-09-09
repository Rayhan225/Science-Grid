"""Seed script for ScholarGrid - Layer 7
Run with DATABASE_URL env var set. Creates initial users, project, manuscript,
formulas, api nodes, git repo, code links, manuscript versions, references,
citations, and publisher templates.
"""
import os
import sys
import datetime
import uuid

# allow imports from backend package
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.database.database import engine, SessionLocal, Base
from app.models.user import User
from app.models.project import ResearchProject
from app.models.manuscript import Manuscript
from app.models.formula import Formula
from app.models.api_node import APINode
from app.models.api_execution import APIExecution
from app.models.git_repository import GitRepository
from app.models.code_link import CodeLink
from app.models.manuscript_version import ManuscriptVersion
from app.models.reference import Reference
from app.models.citation import Citation
from app.models.publisher_template import PublisherTemplate

from passlib.hash import bcrypt

def now():
    return datetime.datetime.now(datetime.timezone.utc)


def seed():
    print("Creating tables (if missing) and starting seed...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Users
        admin = User(email="admin@scholargrid.local", name="Admin User", password_hash=bcrypt.hash("AdminPass123!"), role="admin", is_active=True, created_at=now(), updated_at=now())
        researcher = User(email="researcher@scholargrid.local", name="Researcher Alice", password_hash=bcrypt.hash("ResearcherPass123!"), role="researcher", is_active=True, created_at=now(), updated_at=now())
        developer = User(email="dev@scholargrid.local", name="Dev Bob", password_hash=bcrypt.hash("DevPass123!"), role="developer", is_active=True, created_at=now(), updated_at=now())
        db.add_all([admin, researcher, developer])
        db.commit()

        # Project
        proj = ResearchProject(owner_id=researcher.id, title="Sample Research Project", description="A seeded project.", status="active", created_at=now(), updated_at=now())
        db.add(proj)
        db.commit()

        # Manuscript
        ms = Manuscript(project_id=proj.id, title="Seeded Manuscript", file_name="manuscript.pdf", file_path="/data/manuscripts/manuscript.pdf", version=1, content_hash=uuid.uuid4().hex, is_blind=False, created_at=now(), updated_at=now())
        db.add(ms)
        db.commit()

        # Manuscript versions
        mv1 = ManuscriptVersion(manuscript_id=ms.id, version_number=1, file_path="/data/manuscripts/v1/manuscript.pdf", content_hash=uuid.uuid4().hex, created_by=researcher.id, created_at=now())
        mv2 = ManuscriptVersion(manuscript_id=ms.id, version_number=2, file_path="/data/manuscripts/v2/manuscript.pdf", content_hash=uuid.uuid4().hex, created_by=researcher.id, created_at=now())
        db.add_all([mv1, mv2])
        db.commit()

        # Formulas
        f1 = Formula(manuscript_id=ms.id, name="Quadratic Root", expression="(-b + sqrt(b*b - 4*a*c)) / (2*a)", description="Quadratic formula root (mock)", variables={"a":"number","b":"number","c":"number"}, is_validated=True, validation_result={"status":"ok"}, created_at=now(), updated_at=now())
        f2 = Formula(manuscript_id=ms.id, name="Linear Combine", expression="a*x + b", description="Simple linear combination", variables={"a":"number","b":"number","x":"number"}, is_validated=False, created_at=now(), updated_at=now())
        db.add_all([f1, f2])
        db.commit()

        # API Nodes
        node1 = APINode(formula_id=f1.id, owner_id=developer.id, name="Quadratic Root", slug="quadratic-root", endpoint_path="/api/v1/nodes/quadratic-root", http_method="POST", status="validated", execution_count=0, created_at=now(), updated_at=now())
        node2 = APINode(formula_id=f2.id, owner_id=developer.id, name="Linear Combine", slug="linear-combine", endpoint_path="/api/v1/nodes/linear-combine", http_method="POST", status="draft", execution_count=0, created_at=now(), updated_at=now())
        db.add_all([node1, node2])
        db.commit()

        # Git repository
        repo = GitRepository(project_id=proj.id, owner_id=researcher.id, provider="github", repository_url="https://github.com/example/repo.git", repository_name="example/repo", default_branch="main", access_token_encrypted=None, created_at=now(), updated_at=now())
        db.add(repo)
        db.commit()

        # Code links
        cl1 = CodeLink(repository_id=repo.id, manuscript_id=ms.id, file_path="src/model/train.py", start_line=45, end_line=92, commit_hash="abcdef123456", target_type="methodology", target_reference="section-3-methodology", description="Training loop implementation", created_by=researcher.id, created_at=now())
        cl2 = CodeLink(repository_id=repo.id, manuscript_id=ms.id, file_path="src/model/utils.py", start_line=10, end_line=20, commit_hash="abcdef123456", target_type="formula", target_reference="quadratic-root", description="Quadratic helper", created_by=developer.id, created_at=now())
        db.add_all([cl1, cl2])
        db.commit()

        # References
        r1 = Reference(manuscript_id=ms.id, citation_key="Smith2020", title="A study on examples", authors="Smith, J.", year=2020, journal="Journal of Examples", doi="10.1000/exampledoi", url="https://doi.org/10.1000/exampledoi", bibtex="@article{Smith2020}", created_at=now())
        r2 = Reference(manuscript_id=ms.id, citation_key="Doe2019", title="Another study", authors="Doe, A.", year=2019, journal="Testing Quarterly", doi=None, url=None, bibtex="@article{Doe2019}", created_at=now())
        r3 = Reference(manuscript_id=ms.id, citation_key="Lee2018", title="Further work", authors="Lee, K.", year=2018, journal="Proceedings X", doi="10.2000/lee", url="https://doi.org/10.2000/lee", bibtex="@inproceedings{Lee2018}", created_at=now())
        db.add_all([r1, r2, r3])
        db.commit()

        # Citations
        c1 = Citation(manuscript_id=ms.id, citation_text="(Smith, 2020)", citation_key="Smith2020", location="introduction", line_number=12, is_valid=True, validation_message="", created_at=now())
        c2 = Citation(manuscript_id=ms.id, citation_text="(Doe, 2019)", citation_key="Doe2019", location="related_work", line_number=120, is_valid=False, validation_message="Missing DOI", created_at=now())
        c3 = Citation(manuscript_id=ms.id, citation_text="(Unknown)", citation_key="UnknownKey", location="conclusion", line_number=300, is_valid=False, validation_message="Key not found", created_at=now())
        db.add_all([c1, c2, c3])
        db.commit()

        # Publisher templates
        tpl_ieee = PublisherTemplate(name="IEEE Standard", publisher="IEEE", journal_name="IEEE Transactions", page_width=8.5, page_height=11.0, margin_top=0.75, margin_bottom=0.75, margin_left=0.75, margin_right=0.75, font_name="Times New Roman", font_size=10, max_words=10000, max_pages=12, min_image_dpi=300, columns=2, rules={"figure_format":"png"}, created_at=now(), updated_at=now())
        tpl_apa = PublisherTemplate(name="APA Standard", publisher="APA", journal_name="APA Journal", page_width=8.5, page_height=11.0, margin_top=1.0, margin_bottom=1.0, margin_left=1.0, margin_right=1.0, font_name="Times New Roman", font_size=12, max_words=12000, max_pages=15, min_image_dpi=300, columns=1, rules={"citation_style":"apa"}, created_at=now(), updated_at=now())
        tpl_springer = PublisherTemplate(name="Springer Standard", publisher="Springer", journal_name="Springer Journal", page_width=8.27, page_height=11.69, margin_top=1.0, margin_bottom=1.0, margin_left=1.0, margin_right=1.0, font_name="Times New Roman", font_size=11, max_words=15000, max_pages=20, min_image_dpi=300, columns=2, rules={"template":"springer"}, created_at=now(), updated_at=now())
        db.add_all([tpl_ieee, tpl_apa, tpl_springer])
        db.commit()

        print("Seed complete: users: {}, project: {}, manuscript: {}".format(3, proj.id, ms.id))
    except Exception as e:
        db.rollback()
        print("Seed failed:", e)
        raise
    finally:
        db.close()


if __name__ == '__main__':
    seed()
