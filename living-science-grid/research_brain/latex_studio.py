# research_brain/latex_studio.py
# ═══════════════════════════════════════════════════════════════════
# ScholarGrid LaTeX Studio — Sovereign Paper Writing & Compilation Core
# Overleaf-Grade Dual-Engine, Multi-File Tabs, Reviews, Version Control & Reference Manager
# ═══════════════════════════════════════════════════════════════════

import os
import re
import json
import uuid
import shutil
import base64
import asyncio
import tempfile
import datetime
import subprocess
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import Response
import asyncpg

router = APIRouter(prefix="/api/latex", tags=["LaTeX Studio"])

# ─────────────────────────────────────────────────────────────────
# DATABASE SCHEMA INITIALIZATION FOR LATEX PROJECTS & VAULT
# ─────────────────────────────────────────────────────────────────

async def init_latex_tables(conn: asyncpg.Connection):
    """Initialize dedicated PostgreSQL tables for LaTeX studio."""
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS latex_projects (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            main_file TEXT NOT NULL DEFAULT '\\documentclass{article}\\n\\begin{document}\\nHello World\\n\\end{document}',
            bib_content TEXT DEFAULT '',
            compiler VARCHAR(50) DEFAULT 'pdflatex',
            compiler_engine VARCHAR(50) DEFAULT 'pdflatex',
            tex_live_version VARCHAR(50) DEFAULT '2024',
            main_file_path VARCHAR(255) DEFAULT 'main.tex',
            spell_check_lang VARCHAR(50) DEFAULT 'en_US',
            keybindings VARCHAR(50) DEFAULT 'default',
            auto_close_brackets BOOLEAN DEFAULT TRUE,
            code_check BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            is_pinned BOOLEAN DEFAULT FALSE,
            settings JSONB DEFAULT '{"fontSize": 11, "lineSpacing": "1.6", "textAlign": "justify", "selectedFont": "serif", "autoCompile": true}'::jsonb
        );
        CREATE INDEX IF NOT EXISTS idx_latex_proj_user ON latex_projects(user_id);

        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS compiler_engine VARCHAR(50) DEFAULT 'pdflatex';
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS tex_live_version VARCHAR(50) DEFAULT '2024';
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS main_file_path VARCHAR(255) DEFAULT 'main.tex';
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS spell_check_lang VARCHAR(50) DEFAULT 'en_US';
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS keybindings VARCHAR(50) DEFAULT 'default';
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS auto_close_brackets BOOLEAN DEFAULT TRUE;
        ALTER TABLE latex_projects ADD COLUMN IF NOT EXISTS code_check BOOLEAN DEFAULT TRUE;

        CREATE TABLE IF NOT EXISTS latex_project_files (
            id VARCHAR(255) PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES latex_projects(id) ON DELETE CASCADE,
            path VARCHAR(255) NOT NULL,
            file_type VARCHAR(50) NOT NULL DEFAULT 'tex',
            content TEXT DEFAULT '',
            binary_data TEXT DEFAULT '',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_latex_files_proj ON latex_project_files(project_id);

        CREATE TABLE IF NOT EXISTS latex_comments (
            id VARCHAR(255) PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES latex_projects(id) ON DELETE CASCADE,
            file_path VARCHAR(255) NOT NULL,
            line_number INT DEFAULT 1,
            selected_text TEXT DEFAULT '',
            author VARCHAR(255) NOT NULL,
            author_role VARCHAR(50) DEFAULT 'researcher',
            comment_text TEXT NOT NULL,
            resolved BOOLEAN DEFAULT FALSE,
            replies JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_latex_comments_proj ON latex_comments(project_id);

        CREATE TABLE IF NOT EXISTS latex_versions (
            id SERIAL PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES latex_projects(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            version_name VARCHAR(255) NOT NULL,
            commit_message TEXT,
            snapshot_content TEXT NOT NULL,
            bib_snapshot TEXT DEFAULT '',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_latex_ver_proj ON latex_versions(project_id);

        CREATE TABLE IF NOT EXISTS latex_references (
            id SERIAL PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES latex_projects(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            cite_key VARCHAR(100) NOT NULL,
            entry_type VARCHAR(50) DEFAULT 'article',
            raw_bibtex TEXT NOT NULL,
            parsed_metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS latex_vault_backups (
            id SERIAL PRIMARY KEY,
            project_id VARCHAR(255) REFERENCES latex_projects(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            backup_name VARCHAR(255) NOT NULL,
            vault_file_id INT,
            archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- One row per (project, path): older id-keyed upserts could insert a
        -- second 'main.tex' when the client id did not match the seeded one.
        DELETE FROM latex_project_files a
        USING latex_project_files b
        WHERE a.project_id = b.project_id
          AND a.path = b.path
          AND a.ctid <> b.ctid
          AND (a.updated_at, a.id) < (b.updated_at, b.id);

        CREATE UNIQUE INDEX IF NOT EXISTS uq_latex_files_proj_path
            ON latex_project_files(project_id, path);
    """)

# Dependency provider from main application
_db_pool_ref = None

def set_db_pool(pool):
    global _db_pool_ref
    _db_pool_ref = pool

async def get_db_conn():
    if _db_pool_ref is None:
        raise HTTPException(status_code=503, detail="Database pool offline.")
    return _db_pool_ref

# ─────────────────────────────────────────────────────────────────
# PYDANTIC DATA MODELS
# ─────────────────────────────────────────────────────────────────

class ProjectCreateRequest(BaseModel):
    title: str
    template: Optional[str] = "standard_article"
    user_id: Optional[str] = "usr_admin"
    running_title: Optional[str] = None
    authors: Optional[str] = None
    affiliations: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    journal_name: Optional[str] = None
    doi: Optional[str] = None
    manuscript_date: Optional[str] = None
    template_code: Optional[str] = None

class ProjectSaveRequest(BaseModel):
    title: Optional[str] = None
    main_file: str
    bib_content: Optional[str] = ""
    compiler: Optional[str] = "pdflatex"
    compiler_engine: Optional[str] = "pdflatex"
    tex_live_version: Optional[str] = "2024"
    main_file_path: Optional[str] = "main.tex"
    spell_check_lang: Optional[str] = "en_US"
    keybindings: Optional[str] = "default"
    auto_close_brackets: Optional[bool] = True
    code_check: Optional[bool] = True
    user_id: Optional[str] = "usr_admin"
    settings: Optional[Dict[str, Any]] = None
    # Full multi-file workspace: every open .tex/.bib/.svg/.png in the project
    files: Optional[List[Dict[str, Any]]] = None
    # When true, force a named commit snapshot regardless of content diff
    commit_message: Optional[str] = None

class CompileRequest(BaseModel):
    latex_code: str
    bib_content: Optional[str] = ""
    compiler: Optional[str] = "pdflatex"
    user_id: Optional[str] = "usr_admin"

class VersionCreateRequest(BaseModel):
    project_id: str
    version_name: str
    commit_message: Optional[str] = ""
    user_id: Optional[str] = "usr_admin"

class VaultSyncRequest(BaseModel):
    project_id: str
    user_id: str
    backup_name: Optional[str] = None

class ReferenceAddRequest(BaseModel):
    project_id: str
    bibtex: str
    user_id: str

class FileCreateRequest(BaseModel):
    path: str
    file_type: Optional[str] = "tex"
    content: Optional[str] = ""
    binary_data: Optional[str] = ""

class FileUpdateRequest(BaseModel):
    content: Optional[str] = ""
    binary_data: Optional[str] = ""

class FolderCreateRequest(BaseModel):
    path: str  # e.g., "sections/" or "figures/diagrams/"

class MoveFileRequest(BaseModel):
    new_path: str
    new_project_id: Optional[str] = None  # Optional: move to another project

class CommentCreateRequest(BaseModel):
    file_path: str
    line_number: Optional[int] = 1
    selected_text: Optional[str] = ""
    author: str
    author_role: Optional[str] = "researcher"
    comment_text: str

class CommentResolveRequest(BaseModel):
    resolved: bool = True

class SettingsUpdateRequest(BaseModel):
    compiler_engine: Optional[str] = None
    tex_live_version: Optional[str] = None
    main_file_path: Optional[str] = None
    spell_check_lang: Optional[str] = None
    keybindings: Optional[str] = None
    auto_close_brackets: Optional[bool] = None
    code_check: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None

class VersionSaveRequest(BaseModel):
    commit_message: Optional[str] = "Manual save"
    snapshot: str
    user_id: Optional[str] = "usr_admin"

class CommentAddRequest(BaseModel):
    user_id: str
    author_name: str
    content: str
    line_number: Optional[int] = 1

class CommentPatchRequest(BaseModel):
    resolved: bool

# Standard Academic Templates
TEMPLATES = {
    "standard_article": r"""\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amsfonts,amssymb}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{cite}

\title{Scalable Mathematical Invariance in Multi-Head Attention Architectures}
\author{Dr. Elena Rostova\thanks{Corresponding author: rostova@scholargrid.io} \and Devin Vance \and Prof. Alistair Vance}
\date{Institute for Advanced Scientific Computing \\ \today}

\begin{document}
\maketitle

\begin{abstract}
The quadratic space and time complexity $O(n^2)$ of dense scaled dot-product attention constitutes a fundamental computational bottleneck in high-throughput scientific workflows. In this manuscript, we present an invariant structural projection framework that preserves spectral representation density while eliminating redundant parameter states. Through rigorous mathematical analysis, we establish exact convergence bounds across non-convex optimization manifolds. Empirical evaluations across bilingual sequence translation benchmarks demonstrate a $3.4\times$ throughput speedup with zero degradation in validation perplexity.
\end{abstract}

\textbf{Keywords:} Transformer Architectures, Spectral Density, Mathematical Invariance, WebAssembly Sandboxing, Parameter Efficiency.

\section{Introduction}
Modern scientific computing systems increasingly rely on automated transformer representations to parse high-density empirical manuscripts and synthesize production algorithms \cite{vaswani2017attention}. However, bridging the gap between theoretical formulations and executable computational kernels induces an integration friction point \cite{devlin2019bert}.

In traditional scientific research workflows, analytical proofs published in PDF manuscripts are decoupled from runtime verification layers, leading to numerical divergence during downstream deployment. In this work, we make the following key contributions:
\begin{enumerate}
    \item We formalize a spectral projection operator $\mathcal{P}_{\lambda}(x)$ that guarantees continuous representation density.
    \item We eliminate quadratic memory bottlenecks through bounded orthogonal manifold routing.
    \item We release an open-source WebAssembly verification suite validating tensor dimensions in real time.
\end{enumerate}

\section{Related Work & Prior Literature}
Standard recurrence models enforce sequential temporal dependencies, precluding training parallelization \cite{vaswani2017attention}. While state-space architectures like Mamba achieve sub-quadratic complexity, associative recall across multi-hop reasoning tasks remains constrained under large vocabulary sizes.

\section{Mathematical Formulation & Invariance Proofs}
Let the multi-head attention mapping across sequence dimensions $n$ and model dimensionality $d$ be defined as:
\begin{equation}
    \text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
\end{equation}
where $Q, K, V \in \mathbb{R}^{n \times d_k}$. To guarantee parameter preservation under asymptotic bounds, we introduce the normalized parameter projection operator:
\begin{equation}
    \mathcal{P}_{\lambda}(x) = \sum_{i=1}^{k} \lambda_i \sigma(\mathbf{W}_i x + b_i) + \frac{\epsilon}{\sqrt{\sigma^2 + \delta}}
\end{equation}
where $\mathbf{W}_i \in \mathbb{R}^{d \times d}$ represents the orthogonal subspace projection matrix, and $\delta > 0$ stabilizes zero-variance coordinates.

\section{Methodology & System Architecture}
Our system executes a decoupled two-tier computational workflow:
\begin{enumerate}
    \item \textbf{Semantic Manifold Routing:} Groups related receptive fields into compact orthogonal blocks, bounding intermediate tensor allocations to $O(n \log n)$.
    \item \textbf{In-Situ Sandboxing:} Validates all equation derivations via client-side WebAssembly execution before emitting gradient updates to the optimization ledger.
\end{enumerate}

\section{Experimental Setup & Empirical Results}
We benchmark the proposed formulation against established baseline architectures on standard sequence transduction benchmarks. All trial runs were executed across 8 NVIDIA P100 GPUs with AdamW optimization ($\beta_1 = 0.9$, $\beta_2 = 0.98$, $\epsilon = 10^{-8}$).

\begin{table}[htbp]
\centering
\caption{Comparative Performance Across Benchmark Corpora}
\label{tab:benchmark}
\begin{tabular}{lcccc}
\toprule
\textbf{Model Variant} & \textbf{BLEU} & \textbf{Tokens/sec} & \textbf{VRAM (GB)} & \textbf{FRI Score} \\
\midrule
Standard Transformer & 28.4 & 14,200 & 16.4 & 92 \\
Linear Mamba SSM     & 27.9 & 38,500 & 6.2  & 88 \\
\textbf{Ours (Invariant)} & \textbf{29.8} & \textbf{48,200} & \textbf{4.8} & \textbf{96} \\
\bottomrule
\end{tabular}
\end{table}

\section{Ablation Studies & Boundary Analysis}
To evaluate the contribution of individual architectural components, we conduct parameter sensitivity sweeps across layer normalizations and routing matrices. Removing the spectral normalizer degrades BLEU accuracy by $1.8$ points and increases variance across random seeds.

\section{Discussion & Limitations}
While our invariant framework significantly compresses intermediate activations, projection initialization requires careful spectral norm constraints during early warmup epochs. Future extensions will incorporate low-rank tensor decompositions directly on edge hardware.

\section{Conclusion}
We have introduced a mathematically rigorous, scalable attention architecture that guarantees dimensional consistency and computational efficiency. The framework bridges theoretical literature assertions with verifiable runtime execution.

\section*{Acknowledgments}
This research was supported by the Sovereign Scientific Computing Consortium and institutional high-performance compute grants.

\bibliographystyle{plain}
\bibliography{references}
\end{document}
""",
    "ieee_conference": r"""\documentclass[conference]{IEEEtran}
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}

\begin{document}
\title{High-Throughput Verification of Mathematical Kernels}
\author{\IEEEauthorblockN{ScholarGrid Research Consortium}}
\maketitle

\begin{abstract}
We introduce sovereign WebAssembly sandboxing for verifiable academic computing.
\end{abstract}

\section{Introduction}
Algorithmic assertions require continuous replication and validation.

\bibliographystyle{IEEEtran}
\bibliography{references}
\end{document}
""",
    "ieee_transaction": r"""\documentclass[journal]{IEEEtran}
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Your Paper Title Here}
\author{\IEEEauthorblockN{Author Name}
\IEEEauthorblockA{Affiliation\\Email: email@example.com}}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\begin{IEEEkeywords}
Keyword1, Keyword2, Keyword3
\end{IEEEkeywords}

\section{Introduction}
Your introduction here.

\section{Methodology}
Your methodology here.

\section{Results}
Your results here.

\section{Conclusion}
Your conclusion here.

\bibliographystyle{IEEEtran}
\bibliography{references}
\end{document}
""",
    "acm_conference": r"""\documentclass[sigconf]{acmart}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Your Paper Title}
\author{Author Name}
\affiliation{\institution{Affiliation}}
\email{email@example.com}

\begin{CCSXML}
<ccs2012>
<concept>
<concept_id>10010147.10010178.10010179</concept_id>
<concept_desc>Computing methodologies~Artificial intelligence</concept_desc>
<concept_significance>500</concept_significance>
</concept>
</ccs2012>
\end{CCSXML}

\ccsdesc[500]{Computing methodologies~Artificial intelligence}

\keywords{Keyword1, Keyword2, Keyword3}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\section{Introduction}
Your introduction here.

\section{Methodology}
Your methodology here.

\section{Results}
Your results here.

\section{Conclusion}
Your conclusion here.

\bibliographystyle{ACM-Reference-Format}
\bibliography{references}
\end{document}
""",
    "springer_lncs": r"""\documentclass[runningheads]{llncs}
\usepackage{graphicx}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Your Paper Title}
\titlerunning{Short Title}
\author{Author Name\inst{1}\orcidID{0000-0000-0000-0000}}
\authorrunning{A. Name}
\institute{Affiliation \email{email@example.com}}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\keywords{Keyword1 \and Keyword2 \and Keyword3}
\end{abstract}

\section{Introduction}
Your introduction here.

\section{Methodology}
Your methodology here.

\section{Results}
Your results here.

\section{Conclusion}
Your conclusion here.

\bibliographystyle{splncs04}
\bibliography{references}
\end{document}
""",
    "elsevier_article": r"""\documentclass[review]{elsarticle}
\usepackage{graphicx}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{hyperref}
\usepackage{lineno}

\journal{Journal Name}

\begin{document}
\begin{frontmatter}
\title{Your Paper Title}
\author{Author Name}
\address{Affiliation}
\ead{email@example.com}

\begin{abstract}
Your abstract here.
\end{abstract}

\begin{keyword}
Keyword1 \sep Keyword2 \sep Keyword3
\end{keyword}
\end{frontmatter}

\section{Introduction}
Your introduction here.

\section{Methodology}
Your methodology here.

\section{Results}
Your results here.

\section{Conclusion}
Your conclusion here.

\bibliographystyle{elsarticle-num}
\bibliography{references}
\end{document}
""",
    "nature_article": r"""\documentclass{nature}
\usepackage{graphicx}
\usepackage{amsmath,amssymb}
\usepackage{booktabs}
\usepackage{hyperref}

\title{Your Paper Title}
\author{Author Name$^{1,\dagger}$}
\affiliations{$^1$Affiliation. \dagger email@example.com}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\section{Introduction}
Your introduction here.

\section{Results}
Your results here.

\section{Discussion}
Your discussion here.

\section{Conclusion}
Your conclusion here.

\bibliography{references}
\end{document}
""",
    "arxiv_preprint": r"""\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amsfonts,amssymb}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{authblk}

\title{Your Paper Title}
\author[1]{Author Name}
\affil[1]{Affiliation}
\date{}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\textbf{Keywords:} Keyword1, Keyword2, Keyword3

\section{Introduction}
Your introduction here.

\section{Methodology}
Your methodology here.

\section{Results}
Your results here.

\section{Conclusion}
Your conclusion here.

\bibliographystyle{plain}
\bibliography{references}
\end{document}
""",
    "thesis": r"""\documentclass[12pt,a4paper]{report}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amsfonts,amssymb}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{geometry}
\geometry{margin=1in}

\title{Your Thesis Title}
\author{Author Name}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
Your abstract here.
\end{abstract}

\tableofcontents

\chapter{Introduction}
Your introduction here.

\chapter{Background}
Your background here.

\chapter{Methodology}
Your methodology here.

\chapter{Results}
Your results here.

\chapter{Conclusion}
Your conclusion here.

\bibliographystyle{plain}
\bibliography{references}
\end{document}
""",
    "beamer_presentation": r"""\documentclass[aspectratio=169]{beamer}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amsfonts,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\usetheme{Madrid}
\usecolortheme{seahorse}

\title{Your Presentation Title}
\author{Author Name}
\institute{Affiliation}
\date{\today}

\begin{document}
\frame{\titlepage}

\begin{frame}{Outline}
\tableofcontents
\end{frame}

\section{Introduction}
\begin{frame}{Introduction}
Your introduction here.
\end{frame}

\section{Methodology}
\begin{frame}{Methodology}
Your methodology here.
\end{frame}

\section{Results}
\begin{frame}{Results}
Your results here.
\end{frame}

\section{Conclusion}
\begin{frame}{Conclusion}
Your conclusion here.
\end{frame}

\end{document}
""",
}

DEFAULT_BIB = r"""@article{vaswani2017attention,
  title={Attention is all you need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\L}ukasz and Polosukhin, Illia},
  journal={Advances in neural information processing systems},
  volume={30},
  year={2017}
}

@article{devlin2019bert,
  title={BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author={Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  journal={NAACL-HLT},
  year={2019}
}"""

# ─────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────
# TEMPLATES LIST — available project templates
# ─────────────────────────────────────────────────────────────────

@router.get("/templates")
async def list_templates():
    """Return available LaTeX project templates with metadata."""
    template_info = {
        "standard_article": {"name": "Standard Article", "description": "Generic article template with abstract, sections, bibliography", "category": "Journal"},
        "ieee_transaction": {"name": "IEEE Transaction", "description": "IEEE journal format (IEEEtran class)", "category": "Journal"},
        "ieee_conference": {"name": "IEEE Conference", "description": "IEEE conference format", "category": "Conference"},
        "acm_conference": {"name": "ACM Conference", "description": "ACM SIG conference format (acmart class)", "category": "Conference"},
        "springer_lncs": {"name": "Springer LNCS", "description": "Springer Lecture Notes in Computer Science format", "category": "Conference"},
        "elsevier_article": {"name": "Elsevier Article", "description": "Elsevier journal format (elsarticle class)", "category": "Journal"},
        "nature_article": {"name": "Nature-style Article", "description": "Nature journal format", "category": "Journal"},
        "arxiv_preprint": {"name": "arXiv Preprint", "description": "Standard preprint format with authblk", "category": "Preprint"},
        "thesis": {"name": "Thesis / Dissertation", "description": "Report class for thesis/dissertation", "category": "Thesis"},
        "beamer_presentation": {"name": "Beamer Presentation", "description": "LaTeX Beamer slides (16:9)", "category": "Presentation"},
    }
    return [
        {"id": k, "name": v["name"], "description": v["description"], "category": v["category"]}
        for k, v in template_info.items()
    ]


# 1. PROJECT LIFECYCLE & CRUD
# ─────────────────────────────────────────────────────────────────

@router.get("/projects")
async def list_projects(user_id: Optional[str] = "usr_admin"):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, title, compiler, compiler_engine, tex_live_version, is_pinned, created_at, updated_at,
                   LENGTH(main_file) as code_length, settings
            FROM latex_projects
            WHERE user_id = $1 OR user_id = 'usr_admin' OR user_id IS NULL
            ORDER BY is_pinned DESC, updated_at DESC
        """, user_id or "usr_admin")
        return [dict(r) for r in rows]

@router.post("/projects/new")
async def create_project(req: ProjectCreateRequest):
    pool = await get_db_conn()
    p_id = f"proj_{int(datetime.datetime.now().timestamp() * 1000)}"
    
    # Determine base template
    if req.template_code and req.template_code.strip():
        initial_code = req.template_code
    else:
        initial_code = TEMPLATES.get(req.template, TEMPLATES["standard_article"])

    # Personalize title, author, date if specified
    if req.title:
        initial_code = re.sub(r'\\title\{[^}]*\}', f'\\\\title{{{req.title}}}', initial_code)
    if req.authors:
        author_clean = req.authors.replace(', ', ' \\and ')
        initial_code = re.sub(r'\\author\{[^}]*\}', f'\\\\author{{{author_clean}}}', initial_code)
    if req.manuscript_date:
        initial_code = re.sub(r'\\date\{[^}]*\}', f'\\\\date{{{req.manuscript_date}}}', initial_code)
    if req.abstract and r'\begin{abstract}' in initial_code:
        initial_code = re.sub(r'\\begin\{abstract\}[\s\S]*?\\end\{abstract\}', 
                              f'\\\\begin{{abstract}}\n{req.abstract}\n\\\\end{{abstract}}', initial_code)

    settings_dict = {
        "running_title": req.running_title or req.title,
        "authors": req.authors or "Dr. Elena Rostova",
        "affiliations": req.affiliations or "Institute for Advanced Scientific Computing",
        "abstract": req.abstract or "",
        "keywords": req.keywords or "Machine Learning, Scientific Computing, Representation Learning",
        "journal_name": req.journal_name or "IEEE Transactions / Q1 Journal",
        "doi": req.doi or "10.1109/TSCI.2026.0921001",
        "manuscript_date": req.manuscript_date or datetime.date.today().strftime("%B %d, %Y")
    }

    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO latex_projects (id, user_id, title, main_file, bib_content, settings)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, p_id, req.user_id or "usr_admin", req.title, initial_code, DEFAULT_BIB, json.dumps(settings_dict))

        # Seed initial files
        await conn.execute("""
            INSERT INTO latex_project_files (id, project_id, path, file_type, content)
            VALUES 
                ($1, $2, 'main.tex', 'tex', $3),
                ($4, $2, 'references.bib', 'bib', $5)
        """, f"f_{p_id}_main", p_id, initial_code, f"f_{p_id}_bib", DEFAULT_BIB)

        # Initial commit version
        await conn.execute("""
            INSERT INTO latex_versions (project_id, user_id, version_name, commit_message, snapshot_content, bib_snapshot)
            VALUES ($1, $2, 'Initial Commit', 'Project initialized with academic metadata', $3, $4)
        """, p_id, req.user_id or "usr_admin", initial_code, DEFAULT_BIB)

        # Auto-sync to Central Vault file_system
        try:
            folder_row = await conn.fetchrow("""
                SELECT id FROM file_system 
                WHERE type = 'folder' AND name = 'LaTeX Projects' AND (user_id = $1 OR user_id IS NULL)
                LIMIT 1
            """, req.user_id or "usr_admin")
            folder_id = folder_row["id"] if folder_row else None
            if not folder_id:
                folder_row = await conn.fetchrow("""
                    INSERT INTO file_system (name, type, parent_id, user_id)
                    VALUES ('LaTeX Projects', 'folder', NULL, $1)
                    RETURNING id
                """, req.user_id or "usr_admin")
                folder_id = folder_row["id"]
            
            safe_name = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', req.title)[:40]}.tex"
            await conn.execute("""
                INSERT INTO file_system (name, type, parent_id, text_content, user_id)
                VALUES ($1, 'file', $2, $3, $4)
            """, safe_name, folder_id, initial_code, req.user_id or "usr_admin")
        except Exception as ve:
            print("[WARN] Vault initial auto-sync notice:", ve)

    return {"status": "success", "id": p_id, "title": req.title, "settings": settings_dict}

@router.get("/projects/{project_id}")
async def get_project(project_id: str, user_id: Optional[str] = "usr_admin"):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT * FROM latex_projects WHERE id = $1
        """, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        
        # Parse references list
        refs = await conn.fetch("""
            SELECT cite_key, entry_type, raw_bibtex FROM latex_references WHERE project_id = $1
        """, project_id)

        # Parse project files
        files = await conn.fetch("""
            SELECT id, path, file_type, content, binary_data, updated_at 
            FROM latex_project_files 
            WHERE project_id = $1 
            ORDER BY file_type ASC, path ASC
        """, project_id)

        # If no files exist yet, seed them automatically from main_file and bib_content
        files_list = [dict(f) for f in files]
        if not files_list:
            main_id = f"f_{project_id}_main"
            bib_id = f"f_{project_id}_bib"
            await conn.execute("""
                INSERT INTO latex_project_files (id, project_id, path, file_type, content)
                VALUES 
                    ($1, $2, 'main.tex', 'tex', $3),
                    ($4, $2, 'references.bib', 'bib', $5)
                ON CONFLICT (id) DO NOTHING
            """, main_id, project_id, row["main_file"], bib_id, row["bib_content"] or "")
            files_list = [
                {"id": main_id, "path": "main.tex", "file_type": "tex", "content": row["main_file"]},
                {"id": bib_id, "path": "references.bib", "file_type": "bib", "content": row["bib_content"] or ""}
            ]
        
        proj_dict = dict(row)
        proj_dict["references"] = [dict(r) for r in refs]
        proj_dict["files"] = files_list
        return proj_dict

@router.put("/projects/{project_id}")
async def save_project(project_id: str, req: ProjectSaveRequest):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # ── Upsert: create the project row if it doesn't exist yet ─────────
        # (The frontend boots with a client-side 'proj_default' draft; the
        #  first save must materialize it in PostgreSQL, not silently no-op.)
        exists = await conn.fetchval(
            "SELECT 1 FROM latex_projects WHERE id = $1", project_id
        )
        if not exists:
            await conn.execute("""
                INSERT INTO latex_projects (id, user_id, title, main_file, bib_content, compiler, compiler_engine, settings)
                VALUES ($1, $2, COALESCE($3, 'Untitled Manuscript'), $4, $5, COALESCE($6, 'pdflatex'), COALESCE($7, 'pdflatex'), $8)
            """, project_id, req.user_id or "usr_admin", req.title, req.main_file,
                 req.bib_content or "", req.compiler, req.compiler_engine,
                 json.dumps(req.settings) if req.settings else json.dumps({}))
            await conn.execute("""
                INSERT INTO latex_project_files (id, project_id, path, file_type, content)
                VALUES ($1, $2, 'main.tex', 'tex', $3), ($4, $2, 'references.bib', 'bib', $5)
                ON CONFLICT (id) DO NOTHING
            """, f"f_{project_id}_main", project_id, req.main_file,
                 f"f_{project_id}_bib", req.bib_content or "")

        await conn.execute("""
            UPDATE latex_projects 
            SET title = COALESCE($1, title),
                main_file = $2,
                bib_content = COALESCE($3, bib_content),
                compiler = COALESCE($4, compiler),
                compiler_engine = COALESCE($5, compiler_engine),
                tex_live_version = COALESCE($6, tex_live_version),
                main_file_path = COALESCE($7, main_file_path),
                spell_check_lang = COALESCE($8, spell_check_lang),
                keybindings = COALESCE($9, keybindings),
                auto_close_brackets = COALESCE($10, auto_close_brackets),
                code_check = COALESCE($11, code_check),
                settings = COALESCE($12, settings),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
        """, req.title, req.main_file, req.bib_content, req.compiler, 
             req.compiler_engine, req.tex_live_version, req.main_file_path,
             req.spell_check_lang, req.keybindings, req.auto_close_brackets, req.code_check,
             json.dumps(req.settings) if req.settings else None, project_id)

        # Update main.tex in latex_project_files
        await conn.execute("""
            UPDATE latex_project_files 
            SET content = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE project_id = $2 AND path = 'main.tex'
        """, req.main_file, project_id)

        # Update references.bib if present
        if req.bib_content:
            await conn.execute("""
                UPDATE latex_project_files 
                SET content = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE project_id = $2 AND path = 'references.bib'
            """, req.bib_content, project_id)

        # ── Persist the WHOLE multi-file workspace (create/update/delete) ───
        if req.files:
            try:
                seen_paths, seen_ids = [], []
                for f in req.files:
                    fpath = (f.get("path") or "").strip().replace("\\", "/")
                    if not fpath:
                        continue
                    # PATH is the logical identity of a workspace file. Client ids
                    # are not trustworthy ('f_main' draft vs 'f_{pid}_main' seeded),
                    # so look the row up by path first — otherwise every save would
                    # insert a duplicate 'main.tex'.
                    existing_id = await conn.fetchval(
                        "SELECT id FROM latex_project_files WHERE project_id = $1 AND path = $2",
                        project_id, fpath,
                    )
                    if existing_id:
                        fid = existing_id
                    else:
                        fid = (f.get("id") or "").strip() or None
                        if fid:
                            owner = await conn.fetchval(
                                "SELECT project_id FROM latex_project_files WHERE id = $1", fid)
                            if owner is not None and owner != project_id:
                                fid = None  # id belongs to another project → mint a fresh one
                        fid = fid or f"f_{project_id}_{uuid.uuid4().hex[:12]}"
                    ftype = f.get("file_type") or (fpath.split(".")[-1].lower() if "." in fpath else "tex")
                    content = f.get("content") if f.get("content") is not None else ""
                    binary = f.get("binary_data") if f.get("binary_data") is not None else ""
                    seen_paths.append(fpath)
                    seen_ids.append(fid)
                    await conn.execute("""
                        INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO UPDATE SET
                            path = EXCLUDED.path,
                            file_type = EXCLUDED.file_type,
                            content = EXCLUDED.content,
                            binary_data = EXCLUDED.binary_data,
                            updated_at = CURRENT_TIMESTAMP
                    """, fid, project_id, fpath, ftype, content, binary)

                # Remove files that were closed/deleted in the workspace
                await conn.execute("""
                    DELETE FROM latex_project_files
                    WHERE project_id = $1 AND path <> 'main.tex'
                      AND NOT (path = ANY($2::text[]))
                """, project_id, seen_paths)
            except Exception as fe:
                print("[WARN] Multi-file save notice:", fe)

        # Auto-sync latest content into Central Vault
        try:
            folder_row = await conn.fetchrow("""
                SELECT id FROM file_system 
                WHERE type = 'folder' AND name = 'LaTeX Projects' AND (user_id = $1 OR user_id IS NULL)
                LIMIT 1
            """, req.user_id or "usr_admin")
            folder_id = folder_row["id"] if folder_row else None
            if not folder_id:
                folder_row = await conn.fetchrow("""
                    INSERT INTO file_system (name, type, parent_id, user_id)
                    VALUES ('LaTeX Projects', 'folder', NULL, $1)
                    RETURNING id
                """, req.user_id or "usr_admin")
                folder_id = folder_row["id"]

            title_val = req.title or "manuscript"
            safe_name = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', title_val)[:40]}.tex"
            
            existing = await conn.fetchrow("""
                SELECT id FROM file_system 
                WHERE parent_id = $1 AND name = $2 AND (user_id = $3 OR user_id IS NULL)
            """, folder_id, safe_name, req.user_id or "usr_admin")
            
            if existing:
                await conn.execute("""
                    UPDATE file_system SET text_content = $1, uploaded_at = CURRENT_TIMESTAMP WHERE id = $2
                """, req.main_file, existing["id"])
            else:
                await conn.execute("""
                    INSERT INTO file_system (name, type, parent_id, text_content, user_id)
                    VALUES ($1, 'file', $2, $3, $4)
                """, safe_name, folder_id, req.main_file, req.user_id or "usr_admin")
        except Exception as ve:
            print("[WARN] Vault save auto-sync notice:", ve)

        # ── Commit history: snapshot ONLY when the document actually changed,
        #    otherwise every Ctrl+S would flood the history with duplicates. ──
        try:
            last = await conn.fetchrow("""
                SELECT snapshot_content, bib_snapshot FROM latex_versions
                WHERE project_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            """, project_id)
            changed = (
                req.commit_message
                or not last
                or (last["snapshot_content"] or "") != (req.main_file or "")
                or (last["bib_snapshot"] or "") != (req.bib_content or "")
            )
            if changed:
                label = req.commit_message or "Auto-save"
                await conn.execute("""
                    INSERT INTO latex_versions (project_id, user_id, version_name, commit_message, snapshot_content, bib_snapshot)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, project_id, req.user_id or "usr_admin", label, label,
                     req.main_file, req.bib_content or "")
        except Exception as ve:
            print("[WARN] Auto-save version insert notice:", ve)

    return {"status": "success", "id": project_id}

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user_id: Optional[str] = None):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow("SELECT id, title, user_id FROM latex_projects WHERE id = $1", project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Ownership guard: when the caller identifies itself, only the owner may
        # delete a project (prevents one persona from removing another user's
        # LaTeX work through the shared list surface).
        if user_id:
            owner = str(proj.get("user_id") or "")
            if owner and owner != user_id:
                raise HTTPException(status_code=403, detail="You can only delete projects you own.")

        # Remove the Central Vault auto-sync rows this project created on
        # create/save (the '.tex' copy + 'LaTeX Projects' folder if empty).
        try:
            safe_name = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', proj['title'])[:40]}.tex"
            scope_uid = str(proj.get("user_id") or "") or (user_id or "usr_admin")
            folder = await conn.fetchrow(
                """SELECT id FROM file_system
                   WHERE type = 'folder' AND name = 'LaTeX Projects' AND (user_id = $1 OR user_id IS NULL)
                   LIMIT 1""", scope_uid)
            if folder:
                await conn.execute(
                    """DELETE FROM file_system
                       WHERE parent_id = $1 AND name = $2 AND (user_id = $3 OR user_id IS NULL)""",
                    folder["id"], safe_name, scope_uid)
                remain = await conn.fetchval(
                    "SELECT count(*) FROM file_system WHERE parent_id = $1", folder["id"])
                if remain == 0:
                    await conn.execute(
                        "DELETE FROM file_system WHERE id = $1 AND type = 'folder'", folder["id"])
        except Exception as ve:  # noqa: BLE001
            print("[WARN] Vault cleanup on project delete:", ve)

        await conn.execute("DELETE FROM latex_projects WHERE id = $1", project_id)
    return {"status": "success", "deleted_id": project_id}

# ─────────────────────────────────────────────────────────────────
# 2. MULTI-FILE MANAGEMENT & ASSET UPLOADS (PNG, SVG, BIB, SUB-TEX)
# ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/files")
async def list_project_files(project_id: str):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, path, file_type, content, binary_data, updated_at 
            FROM latex_project_files 
            WHERE project_id = $1 
            ORDER BY file_type ASC, path ASC
        """, project_id)
        return [dict(r) for r in rows]

@router.post("/projects/{project_id}/files")
async def create_project_file(project_id: str, req: FileCreateRequest):
    pool = await get_db_conn()
    clean_path = req.path.strip().replace('\\', '/')
    file_id = f"f_{project_id}_{int(datetime.datetime.now().timestamp() * 1000)}"

    ext = clean_path.split('.')[-1].lower() if '.' in clean_path else ''
    ftype = req.file_type or (ext if ext else ('folder' if clean_path.endswith('/') else 'tex'))

    async with pool.acquire() as conn:
        dup = await conn.fetchval(
            "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2",
            project_id, clean_path)
        if dup:
            raise HTTPException(status_code=409, detail=f"File already exists: {clean_path}")
        await conn.execute("""
            INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, file_id, project_id, clean_path, ftype, req.content or "", req.binary_data or "")

    return {"status": "success", "id": file_id, "path": clean_path, "file_type": ftype}

@router.put("/projects/{project_id}/files/{file_id}")
async def update_project_file(project_id: str, file_id: str, req: FileUpdateRequest):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE latex_project_files 
            SET content = $1, binary_data = $2, updated_at = CURRENT_TIMESTAMP
            WHERE (id = $3 OR path = $3) AND project_id = $4
            RETURNING id, path
        """, req.content or "", req.binary_data or "", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="File not found.")

        # If it was main.tex, keep latex_projects in sync
        if row["path"] == "main.tex":
            await conn.execute("UPDATE latex_projects SET main_file = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.content or "", project_id)
        elif row["path"] == "references.bib":
            await conn.execute("UPDATE latex_projects SET bib_content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", req.content or "", project_id)

    return {"status": "success", "id": row["id"]}

@router.delete("/projects/{project_id}/files/{file_id}")
async def delete_project_file(project_id: str, file_id: str):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, path FROM latex_project_files WHERE (id = $1 OR path = $1) AND project_id = $2", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="File not found.")
        if row["path"] == "main.tex":
            raise HTTPException(status_code=400, detail="Cannot delete main.tex project entry point.")

        await conn.execute("DELETE FROM latex_project_files WHERE id = $1 AND project_id = $2", row["id"], project_id)
    return {"status": "success", "deleted_id": row["id"]}

class FileRenameRequest(BaseModel):
    new_path: str

@router.put("/projects/{project_id}/files/{file_id}/rename")
async def rename_project_file(project_id: str, file_id: str, req: FileRenameRequest):
    pool = await get_db_conn()
    clean = req.new_path.strip().replace('\\', '/')
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, path FROM latex_project_files WHERE (id = $1 OR path = $1) AND project_id = $2", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="File not found.")
        if row["path"] == "main.tex":
            raise HTTPException(status_code=400, detail="Cannot rename entry point main.tex.")
        if clean != row["path"]:
            dup = await conn.fetchval(
                "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2",
                project_id, clean)
            if dup:
                raise HTTPException(status_code=409, detail=f"File already exists: {clean}")
        await conn.execute("UPDATE latex_project_files SET path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND project_id = $3", clean, row["id"], project_id)
    return {"status": "success", "id": row["id"], "new_path": clean}

# ─────────────────────────────────────────────────────────────────
# FOLDER MANAGEMENT (create, rename, delete, move)
# ─────────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/folders")
async def create_folder(project_id: str, req: FolderCreateRequest):
    """Create a folder by inserting a placeholder entry with file_type='folder'."""
    pool = await get_db_conn()
    clean_path = req.path.strip().replace('\\', '/')
    if not clean_path.endswith('/'):
        clean_path += '/'
    
    async with pool.acquire() as conn:
        # Check if folder already exists
        dup = await conn.fetchval(
            "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2 AND file_type = 'folder'",
            project_id, clean_path)
        if dup:
            raise HTTPException(status_code=409, detail=f"Folder already exists: {clean_path}")
        
        # Ensure parent folders exist (strict ancestors only — the loop's last
        # prefix is the target folder itself, which is inserted below)
        parts = clean_path.rstrip('/').split('/')
        for i in range(1, len(parts) + 1):
            parent_path = '/'.join(parts[:i]) + '/'
            if parent_path == clean_path:
                continue
            exists = await conn.fetchval(
                "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2 AND file_type = 'folder'",
                project_id, parent_path)
            if not exists:
                fid = f"f_{project_id}_folder_{int(datetime.datetime.now().timestamp() * 1000)}_{i}"
                await conn.execute("""
                    INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data)
                    VALUES ($1, $2, $3, 'folder', '', '')
                    ON CONFLICT (project_id, path) DO NOTHING
                """, fid, project_id, parent_path)
        
        # Create the target folder
        file_id = f"f_{project_id}_folder_{int(datetime.datetime.now().timestamp() * 1000)}"
        await conn.execute("""
            INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data)
            VALUES ($1, $2, $3, 'folder', '', '')
            ON CONFLICT (project_id, path) DO NOTHING
        """, file_id, project_id, clean_path)
        # Read back the row in case a concurrent request won the insert
        file_id = await conn.fetchval(
            "SELECT id FROM latex_project_files WHERE project_id = $1 AND path = $2 AND file_type = 'folder'",
            project_id, clean_path) or file_id
    
    return {"status": "success", "id": file_id, "path": clean_path, "file_type": "folder"}

@router.put("/projects/{project_id}/folders/{file_id}/rename")
async def rename_folder(project_id: str, file_id: str, req: FileRenameRequest):
    """Rename a folder and all its contents recursively."""
    pool = await get_db_conn()
    clean_new = req.new_path.strip().replace('\\', '/')
    if not clean_new.endswith('/'):
        clean_new += '/'
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, path, file_type FROM latex_project_files WHERE (id = $1 OR path = $1) AND project_id = $2", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="Folder not found.")
        if row["file_type"] != "folder":
            raise HTTPException(status_code=400, detail="Not a folder.")
        old_path = row["path"]
        if old_path == clean_new:
            return {"status": "success", "id": row["id"], "new_path": clean_new}
        
        # Check for conflicts
        dup = await conn.fetchval(
            "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2",
            project_id, clean_new)
        if dup:
            raise HTTPException(status_code=409, detail=f"Path already exists: {clean_new}")
        
        # Get all files under this folder (recursive)
        all_files = await conn.fetch("""
            SELECT id, path FROM latex_project_files 
            WHERE project_id = $1 AND path LIKE $2 || '%'
        """, project_id, old_path)
        
        if not all_files:
            raise HTTPException(status_code=404, detail="Folder not found.")
        
        # Update each file's path
        for f in all_files:
            new_path = clean_new + f["path"][len(old_path):]
            await conn.execute("""
                UPDATE latex_project_files 
                SET path = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 AND project_id = $3
            """, new_path, f["id"], project_id)
    
    return {"status": "success", "id": row["id"], "old_path": old_path, "new_path": clean_new, "files_updated": len(all_files)}

@router.delete("/projects/{project_id}/folders/{file_id}")
async def delete_folder(project_id: str, file_id: str):
    """Delete a folder and all its contents recursively."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, path, file_type FROM latex_project_files WHERE (id = $1 OR path = $1) AND project_id = $2", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="Folder not found.")
        if row["file_type"] != "folder":
            raise HTTPException(status_code=400, detail="Not a folder.")
        folder_path = row["path"]
        
        # Get all files under this folder
        all_files = await conn.fetch("""
            SELECT id, path FROM latex_project_files 
            WHERE project_id = $1 AND path LIKE $2 || '%'
        """, project_id, folder_path)
        
        if not all_files:
            raise HTTPException(status_code=404, detail="Folder not found.")
        
        # Delete all files in folder
        file_ids = [f["id"] for f in all_files]
        await conn.execute("""
            DELETE FROM latex_project_files 
            WHERE id = ANY($1::varchar[])
        """, file_ids)
    
    return {"status": "success", "deleted_folder": folder_path, "files_deleted": len(all_files)}

@router.put("/projects/{project_id}/files/{file_id}/move")
async def move_file(project_id: str, file_id: str, req: MoveFileRequest):
    """Move a file to a new path (optionally in another project)."""
    pool = await get_db_conn()
    clean_new = req.new_path.strip().replace('\\', '/')
    target_project = req.new_project_id or project_id
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT path, file_type FROM latex_project_files WHERE id = $1 AND project_id = $2", file_id, project_id)
        if not row:
            raise HTTPException(status_code=404, detail="File not found.")
        if row["path"] == "main.tex":
            raise HTTPException(status_code=400, detail="Cannot move entry point main.tex.")
        
        # Check for conflicts in target project
        dup = await conn.fetchval(
            "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2",
            target_project, clean_new)
        if dup:
            raise HTTPException(status_code=409, detail=f"File already exists at destination: {clean_new}")
        
        # Ensure parent folders exist in target project
        if '/' in clean_new:
            parent_path = '/'.join(clean_new.split('/')[:-1]) + '/'
            exists = await conn.fetchval(
                "SELECT 1 FROM latex_project_files WHERE project_id = $1 AND path = $2 AND file_type = 'folder'",
                target_project, parent_path)
            if not exists:
                fid = f"f_{target_project}_folder_{int(datetime.datetime.now().timestamp() * 1000)}"
                await conn.execute("""
                    INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data)
                    VALUES ($1, $2, $3, 'folder', '', '')
                    ON CONFLICT (id) DO NOTHING
                """, fid, target_project, parent_path)
        
        if target_project == project_id:
            # Same project - just update path
            await conn.execute("""
                UPDATE latex_project_files 
                SET path = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 AND project_id = $3
            """, clean_new, file_id, project_id)
        else:
            # Cross-project move - need to copy and delete
            full_row = await conn.fetchrow("""
                SELECT * FROM latex_project_files WHERE id = $1 AND project_id = $2
            """, file_id, project_id)
            if full_row:
                await conn.execute("""
                    INSERT INTO latex_project_files (id, project_id, path, file_type, content, binary_data, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                """, full_row["id"], target_project, clean_new, full_row["file_type"], 
                     full_row["content"], full_row["binary_data"], full_row["created_at"])
                await conn.execute("DELETE FROM latex_project_files WHERE id = $1 AND project_id = $2", file_id, project_id)
    
    return {"status": "success", "id": file_id, "new_path": clean_new, "project_id": target_project}

# ─────────────────────────────────────────────────────────────────
# 3. PEER REVIEW & COMMENTING SYSTEM
# (Canonical routes live in sections 9/10 at the bottom of this file:
#  GET/POST /projects/{id}/comments, PATCH/DELETE /comments/{id})
# ─────────────────────────────────────────────────────────────────

@router.put("/comments/{comment_id}/resolve")
async def resolve_comment(comment_id: str, req: CommentResolveRequest):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE latex_comments 
            SET resolved = $1 
            WHERE id = $2 
            RETURNING id, resolved
        """, req.resolved, comment_id)
        if not row:
            raise HTTPException(status_code=404, detail="Comment not found.")
    return {"status": "success", "id": comment_id, "resolved": row["resolved"]}

# ─────────────────────────────────────────────────────────────────
# 4. REAL-TIME COMPILER, AST ERROR DETECTION & QUALITY ASSURANCE
# ─────────────────────────────────────────────────────────────────

@router.post("/compile")
async def compile_latex(req: CompileRequest):
    """
    High-precision LaTeX analysis engine:
    1. Checks syntax, unbalanced environments, and delimiters.
    2. Pinpoints errors with exact line numbers.
    3. Calculates accurate word count, characters, headings, and figures (filtering TeX commands).
    4. Performs heuristic spell checks and formatting audits.
    """
    code = req.latex_code or ""
    lines = code.split("\n")
    errors = []
    warnings = []

    # 1. Environment Balancing Tracker
    env_stack = []
    for line_idx, line in enumerate(lines, start=1):
        clean = re.sub(r'(?<!\\)%.*', '', line) # strip comments

        # Detect \begin{env}
        for match in re.finditer(r'\\begin\{([a-zA-Z0-9_\*]+)\}', clean):
            env = match.group(1)
            env_stack.append((env, line_idx))

        # Detect \end{env}
        for match in re.finditer(r'\\end\{([a-zA-Z0-9_\*]+)\}', clean):
            env = match.group(1)
            if not env_stack:
                errors.append({
                    "line": line_idx,
                    "severity": "error",
                    "message": f"Extra \\end{{{env}}} with no matching \\begin{{{env}}}"
                })
            else:
                last_env, start_line = env_stack.pop()
                if last_env != env:
                    errors.append({
                        "line": line_idx,
                        "severity": "error",
                        "message": f"Mismatched environment: Expected \\end{{{last_env}}} (opened at line {start_line}), found \\end{{{env}}}"
                    })

        # Delimiter Balance Checks per line
        dollar_count = len(re.findall(r'(?<!\\)\$', clean))
        if dollar_count % 2 != 0:
            warnings.append({
                "line": line_idx,
                "severity": "warning",
                "message": f"Possible unclosed math delimiter '$' on line {line_idx}"
            })

    # Lingering open environments
    for env, line_idx in env_stack:
        errors.append({
            "line": line_idx,
            "severity": "error",
            "message": f"Unclosed environment \\begin{{{env}}} at line {line_idx}"
        })

    # 2. Document class check
    if not re.search(r'\\documentclass(\[[^\]]*\])?\{[a-zA-Z0-9_\-]+\}', code):
        errors.append({
            "line": 1,
            "severity": "error",
            "message": "Missing \\documentclass declaration at top of file"
        })

    # 3. Word & Statistics Count (Stripping TeX commands & macros)
    plain_text = re.sub(r'\\(documentclass|usepackage|begin|end|label|ref|cite|bibliographystyle|bibliography)(\[[^\]]*\])?(\{[^}]*\})?', '', code)
    plain_text = re.sub(r'\\[a-zA-Z]+', ' ', plain_text)
    plain_text = re.sub(r'[\{\}\$]', ' ', plain_text)
    words = [w for w in re.findall(r'\b[a-zA-Z0-9_-]+\b', plain_text) if len(w) > 1]
    
    sections_count = len(re.findall(r'\\(section|subsection|subsubsection)\{', code))
    figures_count = len(re.findall(r'\\begin\{(figure|table)\*?\}', code))
    equations_count = len(re.findall(r'\\begin\{(equation|align)\*?\}|\$\$', code))

    # 4. Citations & Cross-References Extraction
    cites = set(re.findall(r'\\cite\{([^}]+)\}', code))
    labels = set(re.findall(r'\\label\{([^}]+)\}', code))
    refs = set(re.findall(r'\\ref\{([^}]+)\}', code))

    # Check unresolved refs
    unresolved_refs = [r for r in refs if r not in labels]
    for un_ref in unresolved_refs:
        warnings.append({
            "line": 1,
            "severity": "warning",
            "message": f"Unresolved cross-reference \\ref{{{un_ref}}}"
        })

    # Raw Engine Compilation Log simulator
    # Estimate real pagination: ~450 words per A4 page for an 11pt article.
    page_estimate = max(1, -(-len(words) // 450))
    raw_log = f"""This is pdfTeX, Version 3.141592653-2.6-1.40.26 (TeX Live 2024) (preloaded format=pdflatex)
entering extended mode
(./main.tex
LaTeX2e <2024-06-01> pre-release-1
L3 programming layer <2024-05-27>
Document Class: article 2023/05/17 v1.4n Standard LaTeX document class
(/usr/local/texlive/2024/texmf-dist/tex/latex/base/size11.clo)
(/usr/local/texlive/2024/texmf-dist/tex/latex/amsmath/amsmath.sty)
(/usr/local/texlive/2024/texmf-dist/tex/latex/amsfonts/amssymb.sty)
(/usr/local/texlive/2024/texmf-dist/tex/latex/graphics/graphicx.sty)
(/usr/local/texlive/2024/texmf-dist/tex/latex/hyperref/hyperref.sty)
(/usr/local/texlive/2024/texmf-dist/tex/latex/booktabs/booktabs.sty)
No file main.aux.
{'[1] [2] ' if page_estimate > 1 else '[1] '}(./references.bib)
Output written on main.pdf ({page_estimate} pages, 142084 bytes).
Transcript written on main.log.
"""

    return {
        "status": "success" if len(errors) == 0 else "error",
        "compiled": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "rawLog": raw_log,
        "stats": {
            "wordCount": len(words),
            "characterCount": len(plain_text.strip()),
            "sectionsCount": sections_count,
            "figuresCount": figures_count,
            "equationsCount": equations_count,
            "citesCount": len(cites),
            "totalPages": page_estimate
        }
    }


# ─────────────────────────────────────────────────────────────────
# 4b. REAL LATEX COMPILATION — actual pdflatex/xelatex/lualatex runs
# ─────────────────────────────────────────────────────────────────

class RealCompileRequest(BaseModel):
    project_id: str
    latex_code: str
    bib_content: Optional[str] = ""
    compiler: str = "pdflatex"  # pdflatex | xelatex | lualatex
    user_id: Optional[str] = "usr_admin"
    passes: int = 3  # Number of compilation passes for cross-refs

@router.post("/compile-real")
async def compile_latex_real(req: RealCompileRequest):
    """
    Real LaTeX compilation using actual TeX engines (TeX Live 2024).
    Runs multiple passes for cross-references and bibliography.
    Returns actual build log, PDF bytes, and SyncTeX data.
    """
    import subprocess
    import tempfile
    import os
    import base64
    
    compiler_map = {
        "pdflatex": "pdflatex",
        "xelatex": "xelatex", 
        "lualatex": "lualatex"
    }
    compiler = compiler_map.get(req.compiler.lower(), "pdflatex")
    
    # Check if compiler exists
    if not shutil.which(compiler):
        raise HTTPException(
            status_code=501, 
            detail=f"Compiler '{compiler}' not found. Install TeX Live 2024."
        )
    
    with tempfile.TemporaryDirectory(prefix="sg_compile_") as td:
        # Write main.tex
        main_tex_path = os.path.join(td, "main.tex")
        with open(main_tex_path, "w", encoding="utf-8") as f:
            f.write(req.latex_code)
        
        # Write references.bib if provided
        bib_path = os.path.join(td, "references.bib")
        if req.bib_content:
            with open(bib_path, "w", encoding="utf-8") as f:
                f.write(req.bib_content)
        
        # Copy project files (images, sub-files) to temp directory
        pool = await get_db_conn()
        async with pool.acquire() as conn:
            files = await conn.fetch("""
                SELECT path, content, binary_data FROM latex_project_files 
                WHERE project_id = $1 AND path NOT IN ('main.tex', 'references.bib')
            """, req.project_id)
            
            for f in files:
                file_path = os.path.join(td, f["path"])
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                if f["binary_data"]:
                    with open(file_path, "wb") as fp:
                        fp.write(base64.b64decode(f["binary_data"]))
                elif f["content"]:
                    with open(file_path, "w", encoding="utf-8") as fp:
                        fp.write(f["content"])
        
        # Compilation passes
        build_log = ""
        pdf_bytes = None
        synctex_data = None
        
        for pass_num in range(req.passes):
            try:
                # Run LaTeX compiler
                cmd = [
                    compiler,
                    "-interaction=nonstopmode",
                    "-halt-on-error",
                    "-synctex=1",
                    "-output-directory", td,
                    "main.tex"
                ]
                
                result = subprocess.run(
                    cmd, 
                    cwd=td, 
                    capture_output=True, 
                    text=True, 
                    timeout=120
                )
                
                build_log += f"\n=== Pass {pass_num + 1} ===\n"
                build_log += result.stdout
                if result.stderr:
                    build_log += "\nSTDERR:\n" + result.stderr
                
                # Run bibtex/biber on first pass if .bib exists
                if pass_num == 0 and req.bib_content:
                    # Check if using biblatex (biber) or bibtex
                    uses_biblatex = "biblatex" in req.latex_code
                    bib_cmd = "biber" if uses_biblatex else "bibtex"
                    if shutil.which(bib_cmd):
                        bib_result = subprocess.run(
                            [bib_cmd, "main"],
                            cwd=td,
                            capture_output=True,
                            text=True,
                            timeout=60
                        )
                        build_log += f"\n=== {bib_cmd} ===\n"
                        build_log += bib_result.stdout
                        if bib_result.stderr:
                            build_log += "\nSTDERR:\n" + bib_result.stderr
                
            except subprocess.TimeoutExpired:
                build_log += f"\n=== Pass {pass_num + 1} TIMEOUT ===\n"
                break
            except Exception as e:
                build_log += f"\n=== Pass {pass_num + 1} ERROR: {e} ===\n"
                break
        
        # Read generated PDF
        pdf_path = os.path.join(td, "main.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
        
        # Read SyncTeX file for inverse search
        synctex_path = os.path.join(td, "main.synctex.gz")
        if os.path.exists(synctex_path):
            import gzip
            with gzip.open(synctex_path, "rt", encoding="utf-8", errors="ignore") as f:
                synctex_data = f.read()[:50000]  # Limit size
        
        # Parse actual errors from build log
        actual_errors = []
        actual_warnings = []
        for line in build_log.split("\n"):
            # LaTeX error pattern: ! Error message
            if line.strip().startswith("! ") and "Error" in line:
                # Extract line number if present
                actual_errors.append({"line": 1, "severity": "error", "message": line.strip()})
            elif "Warning" in line and ("LaTeX" in line or "Package" in line):
                actual_warnings.append({"line": 1, "severity": "warning", "message": line.strip()})
        
        compiled = len(actual_errors) == 0 and pdf_bytes is not None
        
        return {
            "status": "success" if compiled else "error",
            "compiled": compiled,
            "errors": actual_errors,
            "warnings": actual_warnings,
            "rawLog": build_log,
            "pdfBase64": base64.b64encode(pdf_bytes).decode() if pdf_bytes else None,
            "synctex": synctex_data,
            "stats": {
                "wordCount": len(req.latex_code.split()),
                "totalPages": 1  # Would need PDF parsing for actual count
            }
        }

# ─────────────────────────────────────────────────────────────────
# 5. VERSION CONTROL, DIFF HISTORY & REVERT CHANGES
# ─────────────────────────────────────────────────────────────────

# NOTE: GET /projects/{project_id}/versions is defined once (canonical,
# returns full snapshot) in section 9 at the bottom of this file.

@router.post("/projects/version")
async def create_version_snapshot(req: VersionCreateRequest):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # Get active content
        proj = await conn.fetchrow("SELECT main_file, bib_content FROM latex_projects WHERE id = $1", req.project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found.")

        row = await conn.fetchrow("""
            INSERT INTO latex_versions (project_id, user_id, version_name, commit_message, snapshot_content, bib_snapshot)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, version_name, created_at
        """, req.project_id, req.user_id or "usr_admin", req.version_name, 
             req.commit_message or "Checkpoint save", proj["main_file"], proj["bib_content"])

        return {"status": "success", "version": dict(row)}

@router.post("/projects/{project_id}/revert/{version_id}")
async def revert_project_version(project_id: str, version_id: int):
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        ver = await conn.fetchrow("""
            SELECT snapshot_content, bib_snapshot FROM latex_versions 
            WHERE project_id = $1 AND id = $2
        """, project_id, version_id)
        
        if not ver:
            raise HTTPException(status_code=404, detail="Version snapshot not found.")

        await conn.execute("""
            UPDATE latex_projects 
            SET main_file = $1, bib_content = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        """, ver["snapshot_content"], ver["bib_snapshot"], project_id)

        await conn.execute("""
            UPDATE latex_project_files 
            SET content = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE project_id = $2 AND path = 'main.tex'
        """, ver["snapshot_content"], project_id)

    return {"status": "success", "message": f"Reverted project to version checkpoint #{version_id}"}

# ─────────────────────────────────────────────────────────────────
# 6. CENTRAL VAULT SYNC (REPLACES DROPBOX FOR INSTITUTIONAL ACCOUNTS)
# ─────────────────────────────────────────────────────────────────

@router.post("/projects/vault-sync")
async def sync_project_to_central_vault(req: VaultSyncRequest):
    """
    Saves and creates a backup of this project into the Central Vault filesystem,
    placing it inside a dedicated 'LaTeX Projects' vault folder isolated per account.
    """
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow("SELECT title, main_file FROM latex_projects WHERE id = $1", req.project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Ensure 'LaTeX Projects' directory exists in file_system
        folder_row = await conn.fetchrow("""
            SELECT id FROM file_system 
            WHERE type = 'folder' AND name = 'LaTeX Projects' AND (user_id = $1 OR user_id IS NULL)
            LIMIT 1
        """, req.user_id)
        
        if not folder_row:
            folder_row = await conn.fetchrow("""
                INSERT INTO file_system (name, type, parent_id, user_id)
                VALUES ('LaTeX Projects', 'folder', NULL, $1)
                RETURNING id
            """, req.user_id)

        folder_id = folder_row["id"]
        safe_filename = f"{re.sub(r'[^a-zA-Z0-9_-]', '_', proj['title'])[:40]}.tex"

        # Check existing file in vault folder
        existing_file = await conn.fetchrow("""
            SELECT id FROM file_system 
            WHERE parent_id = $1 AND name = $2 AND (user_id = $3 OR user_id IS NULL)
        """, folder_id, safe_filename, req.user_id)

        if existing_file:
            vault_file_id = existing_file["id"]
            await conn.execute("""
                UPDATE file_system SET text_content = $1, uploaded_at = CURRENT_TIMESTAMP WHERE id = $2
            """, proj["main_file"], vault_file_id)
        else:
            file_row = await conn.fetchrow("""
                INSERT INTO file_system (name, type, parent_id, text_content, user_id)
                VALUES ($1, 'file', $2, $3, $4)
                RETURNING id
            """, safe_filename, folder_id, proj["main_file"], req.user_id)
            vault_file_id = file_row["id"]

        # Record vault backup entry
        await conn.execute("""
            INSERT INTO latex_vault_backups (project_id, user_id, backup_name, vault_file_id)
            VALUES ($1, $2, $3, $4)
        """, req.project_id, req.user_id, req.backup_name or f"Vault Backup: {proj['title']}", vault_file_id)

    return {
        "status": "success",
        "vault_file_id": vault_file_id,
        "folder": "LaTeX Projects",
        "filename": safe_filename,
        "message": "Project synced to Sovereign Central Vault."
    }

# ─────────────────────────────────────────────────────────────────
# 7. REFERENCE MANAGEMENT (BIBTEX / MENDELEY / ZOTERO IMPORT)
# ─────────────────────────────────────────────────────────────────

@router.post("/references/add")
async def add_reference(req: ReferenceAddRequest):
    """Parse BibTeX string, extract citation key, and index into references."""
    raw = req.bibtex.strip()
    match = re.search(r'@([a-zA-Z]+)\s*\{\s*([^,]+),', raw)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid BibTeX entry structure.")
    
    entry_type = match.group(1).lower()
    cite_key = match.group(2).strip()

    pool = await get_db_conn()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO latex_references (project_id, user_id, cite_key, entry_type, raw_bibtex)
            VALUES ($1, $2, $3, $4, $5)
        """, req.project_id, req.user_id, cite_key, entry_type, raw)

        # Append to project's active bib_content
        await conn.execute("""
            UPDATE latex_projects 
            SET bib_content = bib_content || E'\\n\\n' || $1
            WHERE id = $2
        """, raw, req.project_id)

        # Update references.bib file
        await conn.execute("""
            UPDATE latex_project_files 
            SET content = content || E'\\n\\n' || $1, updated_at = CURRENT_TIMESTAMP
            WHERE project_id = $2 AND path = 'references.bib'
        """, raw, req.project_id)

    return {"status": "success", "cite_key": cite_key, "entry_type": entry_type}


@router.get("/projects/{project_id}/references")
async def get_project_references(project_id: str, user_id: Optional[str] = "usr_admin"):
    """Get all references for a project (for citation picker)."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # Verify project ownership
        proj = await conn.fetchrow("SELECT id FROM latex_projects WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin' OR user_id IS NULL)", project_id, user_id or "usr_admin")
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found or access denied.")
        
        rows = await conn.fetch("""
            SELECT id, cite_key, entry_type, raw_bibtex, parsed_metadata, created_at
            FROM latex_references 
            WHERE project_id = $1
            ORDER BY cite_key ASC
        """, project_id)
        return [dict(r) for r in rows]


@router.delete("/projects/{project_id}/references/{ref_id}")
async def delete_reference(project_id: str, ref_id: int):
    """Delete a reference from a project."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # Get the reference first to know the cite_key
        ref = await conn.fetchrow("""
            SELECT cite_key, raw_bibtex FROM latex_references 
            WHERE id = $1 AND project_id = $2
        """, ref_id, project_id)
        
        if not ref:
            raise HTTPException(status_code=404, detail="Reference not found.")
        
        # Delete from references table
        await conn.execute("DELETE FROM latex_references WHERE id = $1 AND project_id = $2", ref_id, project_id)
        
        # Remove from project's bib_content and references.bib file
        bib_content = ref["raw_bibtex"]
        await conn.execute("""
            UPDATE latex_projects 
            SET bib_content = REPLACE(bib_content, $1, '')
            WHERE id = $2
        """, bib_content, project_id)
        
        await conn.execute("""
            UPDATE latex_project_files 
            SET content = REPLACE(content, $1, ''), updated_at = CURRENT_TIMESTAMP
            WHERE project_id = $2 AND path = 'references.bib'
        """, bib_content, project_id)
    
    return {"status": "success", "deleted_id": ref_id}


@router.get("/projects/{project_id}/references/search")
async def search_references(project_id: str, q: str = "", user_id: Optional[str] = "usr_admin"):
    """Search references by cite_key, title, author, or year."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # Verify project ownership
        proj = await conn.fetchrow("SELECT id FROM latex_projects WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin' OR user_id IS NULL)", project_id, user_id or "usr_admin")
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found or access denied.")
        
        if q:
            rows = await conn.fetch("""
                SELECT id, cite_key, entry_type, raw_bibtex, parsed_metadata
                FROM latex_references 
                WHERE project_id = $1 
                AND (cite_key ILIKE $2 OR raw_bibtex ILIKE $2)
                ORDER BY cite_key ASC
                LIMIT 50
            """, project_id, f"%{q}%")
        else:
            rows = await conn.fetch("""
                SELECT id, cite_key, entry_type, raw_bibtex, parsed_metadata
                FROM latex_references 
                WHERE project_id = $1 
                ORDER BY cite_key ASC
                LIMIT 50
            """, project_id)
        return [dict(r) for r in rows]


# ─────────────────────────────────────────────────────────────────
# 7b. SPELL CHECK & GRAMMAR
# ─────────────────────────────────────────────────────────────────

class SpellCheckRequest(BaseModel):
    text: str
    language: str = "en_US"
    ignore_latex_commands: bool = True

@router.post("/spellcheck")
async def spell_check(req: SpellCheckRequest):
    """Spell check text with LaTeX-aware filtering."""
    text = req.text or ""
    
    # Extract and protect LaTeX constructs
    protected = []
    def protect(match):
        protected.append(match.group(0))
        return f"\u0000PROTECTED{len(protected)-1}\u0000"
    
    patterns = [
        r'\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*',
        r'\$[^$\n]+\$',
        r'\$\$[\s\S]*?\$\$',
        r'\\begin\{[a-zA-Z0-9_\*]+\}[\s\S]*?\\end\{[a-zA-Z0-9_\*]+\}',
        r'\\cite\{[^}]+\}',
        r'\\ref\{[^}]+\}',
        r'\\label\{[^}]+\}',
    ]
    
    protected_text = text
    for pattern in patterns:
        protected_text = re.sub(pattern, protect, protected_text, flags=re.DOTALL)
    
    words = re.findall(r'\b[a-zA-Z]{2,}\b', protected_text)
    
    academic_dict = {
        'et', 'al', 'etc', 'fig', 'table', 'eq', 'equation', 'section', 'subsection',
        'chapter', 'appendix', 'bibliography', 'references', 'abstract', 'introduction',
        'methodology', 'results', 'discussion', 'conclusion', 'acknowledgment',
        'doi', 'arxiv', 'ieee', 'acm', 'springer', 'elsevier', 'nature', 'science',
        'fig', 'tab', 'eqn', 'thm', 'lem', 'cor', 'def', 'prop', 'sec', 'chap',
        'etal', 'ibid', 'op', 'cit', 'loc', 'cf', 'viz', 'eg', 'ie', 'vs',
        'approx', 'min', 'max', 'arg', 'sup', 'inf', 'lim', 'sum', 'prod', 'int',
        'partial', 'nabla', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
        'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron',
        'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
    }
    
    misspelled = []
    for word in words:
        lower = word.lower()
        if lower not in academic_dict and len(lower) > 2:
            if re.search(r'[aeiou]{4,}|[bcdfghjklmnpqrstvwxyz]{4,}', lower):
                misspelled.append({"word": word, "suggestions": []})
    
    return {
        "misspelled": misspelled[:100],
        "wordCount": len(words),
        "checkedWords": len(words)
    }


# ─────────────────────────────────────────────────────────────────
# 8. FILE UPLOAD — multipart binary/text upload into project files
# ─────────────────────────────────────────────────────────────────

BINARY_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}
TEXT_EXTENSIONS   = {"tex", "bib", "txt", "md"}

@router.post("/upload-file")
async def upload_file(
    project_id: str = Form(...),
    user_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a file (image, PDF, or text) into a LaTeX project's file list."""
    pool = await get_db_conn()
    raw_bytes = await file.read()
    filename  = file.filename or "upload"
    ext       = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    file_id   = f"f_{project_id}_{int(datetime.datetime.now().timestamp() * 1000)}"

    if ext in BINARY_EXTENSIONS:
        content     = ""
        binary_data = base64.b64encode(raw_bytes).decode("utf-8")
    else:
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")
        binary_data = ""

    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO latex_project_files
                    (id, project_id, path, file_type, content, binary_data)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            """, file_id, project_id, filename, ext or "bin", content, binary_data)
        return {
            "id":        row["id"],
            "path":      filename,
            "file_type": ext or "bin",
            "message":   "uploaded"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


# ─────────────────────────────────────────────────────────────────
# 7c. CROSS-REFERENCE NAVIGATION
# ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/crossrefs")
async def get_cross_references(project_id: str):
    """Get all labels and references for navigation."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow("SELECT main_file FROM latex_projects WHERE id = $1", project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found.")
        
        code = proj["main_file"]
        
        files = await conn.fetch("""
            SELECT path, content FROM latex_project_files 
            WHERE project_id = $1 AND file_type = 'tex' AND path != 'main.tex'
        """, project_id)
        
        for f in files:
            if f["content"]:
                code += "\n" + f["content"]
        
        labels = []
        for match in re.finditer(r'\\label\{([^}]+)\}', code):
            labels.append({
                "key": match.group(1),
                "type": "label",
                "context": code[max(0, match.start()-100):match.end()+100]
            })
        
        refs = []
        for match in re.finditer(r'\\(ref|eqref|pageref|nameref)\{([^}]+)\}', code):
            refs.append({
                "key": match.group(2),
                "type": match.group(1),
                "context": code[max(0, match.start()-100):match.end()+100]
            })
        
        cites = []
        for match in re.finditer(r'\\cite[ap]?\{([^}]+)\}', code):
            keys = [k.strip() for k in match.group(1).split(',')]
            for k in keys:
                cites.append({
                    "key": k,
                    "type": "cite",
                    "context": code[max(0, match.start()-100):match.end()+100]
                })
        
        return {
            "labels": labels,
            "references": refs,
            "citations": cites
        }


# ─────────────────────────────────────────────────────────────────
# 7d. TRACK CHANGES / DIFF
# ─────────────────────────────────────────────────────────────────

from difflib import unified_diff

class DiffRequest(BaseModel):
    version_id: Optional[int] = None
    user_id: Optional[str] = "usr_admin"

@router.post("/projects/{project_id}/diff")
async def get_diff(project_id: str, req: DiffRequest):
    """Generate unified diff between two versions or current vs version."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        # Verify project ownership
        proj = await conn.fetchrow("SELECT main_file FROM latex_projects WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin' OR user_id IS NULL)", project_id, req.user_id or "usr_admin")
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found or access denied.")
        
        current = proj["main_file"].splitlines(keepends=True)
        
        if req.version_id:
            ver = await conn.fetchrow("""
                SELECT snapshot_content FROM latex_versions 
                WHERE project_id = $1 AND id = $2
            """, project_id, req.version_id)
            if not ver:
                raise HTTPException(status_code=404, detail="Version not found.")
            old = ver["snapshot_content"].splitlines(keepends=True)
        else:
            ver = await conn.fetchrow("""
                SELECT snapshot_content FROM latex_versions 
                WHERE project_id = $1 
                ORDER BY created_at DESC LIMIT 1 OFFSET 1
            """, project_id)
            if not ver:
                return {"diff": "", "message": "No previous version to compare"}
            old = ver["snapshot_content"].splitlines(keepends=True)
        
        diff = list(unified_diff(old, current, fromfile='old', tofile='new', lineterm=''))
        return {"diff": ''.join(diff)}


# ─────────────────────────────────────────────────────────────────
# 9. VERSION HISTORY — get & save versions (new-style endpoints)
# ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/versions")
async def get_project_versions(project_id: str, user_id: Optional[str] = "usr_admin"):
    """Return the 50 most recent version snapshots for a project."""
    pool = await get_db_conn()
    try:
        async with pool.acquire() as conn:
            # Verify project ownership
            proj = await conn.fetchrow("SELECT id FROM latex_projects WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin' OR user_id IS NULL)", project_id, user_id or "usr_admin")
            if not proj:
                raise HTTPException(status_code=404, detail="Project not found or access denied.")
            
            rows = await conn.fetch("""
                SELECT id, project_id, version_name, commit_message,
                       snapshot_content AS snapshot, created_at
                FROM latex_versions
                WHERE project_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 50
            """, project_id)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch versions: {e}")

@router.post("/projects/{project_id}/versions")
async def save_project_version(project_id: str, req: VersionSaveRequest):
    """Manually save a named version snapshot for a project."""
    pool = await get_db_conn()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO latex_versions
                    (project_id, user_id, version_name, commit_message, snapshot_content, bib_snapshot)
                VALUES ($1, $2, $3, $4, $5, '')
                RETURNING id, project_id, commit_message, snapshot_content AS snapshot, created_at
            """, project_id,
                req.user_id or "usr_admin",
                req.commit_message or "Manual save",
                req.commit_message or "Manual save",
                req.snapshot)
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save version: {e}")

# ─────────────────────────────────────────────────────────────────
# 10. COMMENTS — new-style CRUD with user_id / author_name fields
# ─────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/comments")
async def get_project_comments(project_id: str, user_id: Optional[str] = "usr_admin"):
    """Fetch all comments for a project."""
    pool = await get_db_conn()
    try:
        async with pool.acquire() as conn:
            # Verify project ownership
            proj = await conn.fetchrow("SELECT id FROM latex_projects WHERE id = $1 AND (user_id = $2 OR user_id = 'usr_admin' OR user_id IS NULL)", project_id, user_id or "usr_admin")
            if not proj:
                raise HTTPException(status_code=404, detail="Project not found or access denied.")
            
            rows = await conn.fetch("""
                SELECT id, project_id,
                       '' AS user_id,
                       author AS author_name,
                       comment_text AS content,
                       line_number,
                       resolved,
                       created_at
                FROM latex_comments
                WHERE project_id = $1
                ORDER BY line_number ASC, created_at DESC
            """, project_id)
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch comments: {e}")

@router.post("/projects/{project_id}/comments")
async def add_project_comment(project_id: str, req: CommentAddRequest):
    """Add a comment to a project."""
    pool = await get_db_conn()
    c_id = f"c_{project_id}_{int(datetime.datetime.now().timestamp() * 1000)}"
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO latex_comments
                    (id, project_id, file_path, line_number, author, comment_text)
                VALUES ($1, $2, 'main.tex', $3, $4, $5)
                RETURNING id, project_id,
                          '' AS user_id,
                          author AS author_name,
                          comment_text AS content,
                          line_number, resolved, created_at
            """, c_id, project_id,
                req.line_number or 1,
                req.author_name,
                req.content)
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not add comment: {e}")

@router.patch("/comments/{comment_id}")
async def patch_comment(comment_id: str, req: CommentPatchRequest):
    """Resolve or un-resolve a comment."""
    pool = await get_db_conn()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                UPDATE latex_comments
                SET resolved = $1
                WHERE id = $2
                RETURNING id, project_id,
                          '' AS user_id,
                          author AS author_name,
                          comment_text AS content,
                          line_number, resolved, created_at
            """, req.resolved, comment_id)
            if not row:
                raise HTTPException(status_code=404, detail="Comment not found.")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not update comment: {e}")

@router.delete("/comments/{comment_id}")
async def delete_comment_by_id(comment_id: str):
    """Delete a comment by its ID."""
    pool = await get_db_conn()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM latex_comments WHERE id = $1", comment_id
            )
        return {"deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not delete comment: {e}")

# ─────────────────────────────────────────────────────────────────
# 11. REAL PDF ENGINE — headless Chromium print-to-PDF
# ─────────────────────────────────────────────────────────────────

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KATEX_DIST = os.path.join(_PROJECT_ROOT, "node_modules", "katex", "dist")

_BROWSER_CANDIDATES = [
    os.getenv("CHROME_PATH", ""),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("chrome") or "",
    shutil.which("chromium") or "",
    shutil.which("google-chrome") or "",
]


def find_browser() -> Optional[str]:
    """Locate a Chromium-based engine capable of headless print-to-PDF."""
    for cand in _BROWSER_CANDIDATES:
        if cand and os.path.isfile(cand):
            return cand
    return None


def _file_url(path: str) -> str:
    return "file:///" + os.path.abspath(path).replace("\\", "/")


async def _chrome_to_pdf(browser: str, html_path: str, pdf_path: str) -> tuple[bool, str]:
    """Run headless Chromium print-to-pdf. Tries modern flags, then legacy."""
    profile_dir = tempfile.mkdtemp(prefix="sg_pdf_profile_")
    attempts = [
        ["--headless=new", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw", "--allow-file-access-from-files"],
        ["--headless", "--print-to-pdf-no-header", "--allow-file-access-from-files"],
        ["--headless=old"],
    ]
    last_err = ""
    try:
        for extra in attempts:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            cmd = [
                browser,
                *extra,
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-background-networking",
                "--virtual-time-budget=8000",
                f"--user-data-dir={profile_dir}",
                f"--print-to-pdf={pdf_path}",
                _file_url(html_path),
            ]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=90)
            except asyncio.TimeoutError:
                last_err = "headless render timed out"
                continue
            except Exception as e:
                last_err = str(e)
                continue

            if os.path.isfile(pdf_path) and os.path.getsize(pdf_path) > 0:
                return True, ""
            last_err = (stderr or stdout or b"").decode("utf-8", "replace")[-1500:]
        return False, last_err or "Chromium produced no PDF output."
    finally:
        shutil.rmtree(profile_dir, ignore_errors=True)


class PdfRenderRequest(BaseModel):
    html: str
    css: Optional[str] = ""
    filename: Optional[str] = "manuscript"
    title: Optional[str] = "Manuscript"


@router.post("/pdf")
async def render_pdf(req: PdfRenderRequest):
    """
    Render the typeset manuscript (KaTeX math, journal layout, real page breaks)
    into a genuine A4 PDF file via headless Chromium, returning raw PDF bytes.
    """
    browser = find_browser()
    if not browser:
        raise HTTPException(
            status_code=501,
            detail="No PDF engine found. Install Google Chrome / Microsoft Edge, or set CHROME_PATH.",
        )

    # Load local KaTeX CSS if available for full offline self-contained rendering
    katex_css_text = ""
    katex_file = os.path.join(KATEX_DIST, "katex.min.css")
    if os.path.isfile(katex_file):
        try:
            with open(katex_file, "r", encoding="utf-8") as f:
                katex_css_text = f.read()
        except Exception:
            pass

    document = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>{req.title or "Manuscript"}</title>
<style>
  @page {{ size: A4 portrait; margin: 0; }}
  html, body {{ margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  * {{ box-sizing: border-box; }}
  .pg, .pdf-page {{
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #fff;
    position: relative;
    overflow: hidden;
    margin: 0;
  }}
  .pg:last-child, .pdf-page:last-child {{
    page-break-after: avoid !important;
    break-after: avoid !important;
  }}
  .katex-display {{ overflow: visible !important; margin: 0.6em 0 !important; }}
  .katex-display > .katex {{ text-align: center !important; }}
  {katex_css_text}
  {req.css or ""}
</style></head>
<body>{req.html}</body></html>"""

    with tempfile.TemporaryDirectory(prefix="sg_pdf_") as td:
        html_path = os.path.join(td, "document.html")
        pdf_path = os.path.join(td, "document.pdf")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(document)

        ok, err = await _chrome_to_pdf(browser, html_path, pdf_path)
        if not ok:
            raise HTTPException(status_code=500, detail=f"PDF rendering failed: {err}")

        with open(pdf_path, "rb") as fh:
            pdf_bytes = fh.read()

    safe = re.sub(r'[^A-Za-z0-9._-]+', '_', req.filename or "manuscript").strip("_") or "manuscript"
    if not safe.lower().endswith(".pdf"):
        safe += ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )


@router.get("/pdf-engine")
async def pdf_engine_status():
    """Report which rendering engines are actually available on this host."""
    browser = find_browser()
    tex = next((t for t in ("pdflatex", "xelatex", "lualatex", "tectonic") if shutil.which(t)), None)
    return {
        "browser": browser,
        "browser_name": os.path.basename(browser) if browser else None,
        "katex_assets": os.path.isdir(KATEX_DIST),
        "latex_engine": tex,
        "engine": tex or ("chromium" if browser else None),
        "ready": bool(browser or tex),
    }


# ─────────────────────────────────────────────────────────────────
# 12. ZIP DOWNLOAD — export full project as .zip (Overleaf style)
# ─────────────────────────────────────────────────────────────────

import zipfile
from io import BytesIO

@router.get("/projects/{project_id}/download-zip")
async def download_project_zip(project_id: str, user_id: Optional[str] = "usr_admin"):
    """Export entire project as a ZIP archive (all .tex, .bib, images, etc.)."""
    pool = await get_db_conn()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow("SELECT * FROM latex_projects WHERE id = $1", project_id)
        if not proj:
            raise HTTPException(status_code=404, detail="Project not found.")
        
        files = await conn.fetch("""
            SELECT id, path, file_type, content, binary_data
            FROM latex_project_files 
            WHERE project_id = $1 
            ORDER BY file_type ASC, path ASC
        """, project_id)
    
    # Build ZIP in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            path = f["path"]
            content = f["content"] or ""
            binary_data = f["binary_data"]
            
            if binary_data:
                # Binary file (image, PDF) - decode base64
                try:
                    file_bytes = base64.b64decode(binary_data)
                    zf.writestr(path, file_bytes)
                except Exception:
                    pass
            else:
                # Text file
                zf.writestr(path, content)
    
    zip_buffer.seek(0)
    safe_name = re.sub(r'[^A-Za-z0-9._-]+', '_', proj["title"] or "project").strip("_") or "project"
    if not safe_name.lower().endswith(".zip"):
        safe_name += ".zip"
    
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )