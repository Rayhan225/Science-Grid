# ScholarGrid LaTeX Studio

> **Overleaf-grade research IDE with real PostgreSQL persistence, self-hosted sovereignty, and features beyond Overleaf**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite%208-blue)]()
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%2B%20asyncpg-green)]()
[![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-blue)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()

## 🚀 Quick Start (Single Command)

```bash
# Clone and enter
git clone <repo-url>
cd "E:\Science Grid - Copy"

# Run everything with ONE command
./living-science-grid/start.sh dev
# Or on Windows:
living-science-grid\start.bat dev
```

**That's it!** Opens at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## ✨ Features (Beyond Overleaf)

| Feature | Description |
|---------|-------------|
| **Real LaTeX Compilation** | Actual `pdflatex`/`xelatex`/`lualatex` with 3-pass, `bibtex`/`biber`, SyncTeX |
| **Citation Picker** | Search & insert `\cite{key}` from project references |
| **Spell Check** | LaTeX-aware (ignores math, commands, citations) |
| **Cross-Ref Navigator** | Lists all labels/refs/citations with context jump |
| **Track Changes / Diff** | Unified diff vs any version |
| **Abstract Visual Editing** | Inline edit abstract & keywords in Visual Editor |
| **Copy File Name/Path** | Right-click any file tab → copy name or path |
| **11 Journal Templates** | IEEE, ACM, Elsevier, Nature, arXiv, Thesis, Beamer... |
| **Project ZIP Export** | One-click download complete project archive |
| **Custom Toast System** | Animated, typed notifications (no browser alerts) |
| **Fixed Source/Visual Tabs** | Sticky headers stay visible while scrolling |
| **User Data Isolation** | Every endpoint filters by `user_id` |
| **Theme System** | 4 themes (Obsidian, Circuit, Blueprint, Topography) |

---

## 🏗️ Architecture

```
ScholarGrid/
├── living-science-grid/          # Frontend (React 19 + Vite 8)
│   ├── src/
│   │   ├── components/
│   │   │   └── LatexStudio.jsx   # Main IDE (162KB gzipped)
│   │   ├── context/ThemeContext.jsx
│   │   └── latex/convert.js      # LaTeX ↔ Markdown
│   ├── start.sh / start.bat      # Single-command startup
│   └── package.json
│
├── living-science-grid/research_brain/  # Backend (FastAPI)
│   ├── main.py                   # App entry, lifespan, auth
│   ├── latex_studio.py           # 32 API endpoints
│   ├── academic_layouts.py       # Template system
│   ├── requirements.txt          # Python deps
│   └── (legacy test scripts moved to tests/legacy/root/)
│
├── living-science-grid/server/   # Node.js services
│   ├── index.js                  # Express + Multer
│   ├── rag_engine.py             # RAG pipeline
│   ├── slm_engine.py             # Local LLM
│   └── db_manager.py             # pgvector ops
│
├── tests/                        # Consolidated test suite (see tests/README.md)
│   ├── harness.py                # Shared Selenium/API/DB helpers
│   ├── test_backend_api.py       # FastAPI + Express endpoint contracts
│   ├── test_database.py          # Postgres schema & integrity checks
│   ├── test_frontend_selenium.py # Selenium UI flows
│   ├── test_user_workflows.py    # E2E persona + fresh-user journeys
│   ├── run_all_tests.py          # Runs all suites, combined summary
│   └── legacy/                   # Relocated historical test scripts
│
└── .vscode/
    ├── tasks.json                # One-click run configs
    ├── launch.json               # Debug configs
    └── settings.json             # Optimized settings
```

---

## 🔧 Development

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **TeX Live 2024** (for real compilation)
- **Chrome/Edge** (for PDF generation)
- **Supabase Account** (PostgreSQL)

### Environment Setup

```bash
# Backend
cd living-science-grid/research_brain
cp .env.example .env
# Edit .env with your Supabase credentials

# Frontend
cd living-science-grid
cp .env.example .env
```

### VS Code Integration
Press `F5` → Select **"🚀 Full Stack Debug (Backend + Frontend)"**

Or use Tasks (`Ctrl+Shift+P` → Tasks):
- 🚀 Start Development (Full Stack)
- 🔧 Start Backend Only
- 🌐 Start Frontend Only
- 🧪 Run Tests
- 📦 Build Production

---

## 🧪 Testing

All suites now live under `tests/` (see `tests/README.md`). The three dev
servers must already be running.

```bash
# Everything (backend + database + UI + user workflows), combined summary
python tests/run_all_tests.py

# Subsets: backend, db, ui, workflows
python tests/run_all_tests.py --only backend,db

# Individual suites
python -X utf8 tests/test_backend_api.py
python -X utf8 tests/test_database.py
python -X utf8 tests/test_frontend_selenium.py
python -X utf8 tests/test_user_workflows.py

# Backend syntax check (legacy, relocated)
python tests/legacy/root/check_backend.py

# Full E2E Selenium tests (legacy, relocated)
python tests/legacy/root/test_selenium_latex_suite.py

# Or via startup script
./living-science-grid/start.sh test
```

**Test Coverage:**
- ✅ Backend CRUD (8 tests)
- ✅ Citation Picker
- ✅ Spell Check
- ✅ Cross-References Navigator
- ✅ Track Changes / Diff
- ✅ Real Compile Button
- ✅ Fixed Source/Visual Buttons
- ✅ Abstract Editing in Visual Editor
- ✅ Copy File Name/Path
- ✅ Custom Toast Notifications

---

## 🎨 Themes

| Theme | Preview | Best For |
|-------|---------|----------|
| **Obsidian Core** | Dark cyan | Late-night research |
| **Circuit Board** | Emerald green | Engineering focus |
| **Blueprint Engineer** | Light blue | Documentation |
| **Topography Dark** | Purple/amber | Data visualization |

Switch in **Settings** → **Theme** (persists in localStorage + DB)

---

## 📦 Production Deploy

```bash
# Build
./living-science-grid/start.sh prod

# Or manually
cd living-science-grid
npm run build
cd ../research_brain
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Docker** (optional):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY living-science-grid/research_brain/requirements.txt .
RUN pip install -r requirements.txt
COPY living-science-grid/research_brain/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

---

## 🔒 Security

- **User Isolation**: Every API call verifies `user_id` ownership
- **CORS**: Configured for localhost development
- **SQL Injection**: Parameterized queries via asyncpg
- **File Uploads**: Type validation, size limits, base64 encoding
- **No Hardcoded Secrets**: All via environment variables

---

## 📚 API Reference (32 Endpoints)

### Projects
```
GET    /api/latex/projects                    # List user projects
POST   /api/latex/projects/new                # Create with template
GET    /api/latex/projects/{id}               # Get project + files
PUT    /api/latex/projects/{id}               # Save (auto-vault sync)
DELETE /api/latex/projects/{id}               # Delete cascade
GET    /api/latex/templates                   # 11 templates
```

### Files & Folders
```
GET    /api/latex/projects/{id}/files         # List files
POST   /api/latex/projects/{id}/files         # Create file
PUT    /api/latex/projects/{id}/files/{fid}   # Update content
DELETE /api/latex/projects/{id}/files/{fid}   # Delete
POST   /api/latex/projects/{id}/folders       # Create folder
POST   /api/latex/upload-file                 # Binary upload
```

### Compilation
```
POST   /api/latex/compile                     # Simulated (fast)
POST   /api/latex/compile-real                # Real TeX Live
GET    /api/latex/pdf-engine                  # Engine status
POST   /api/latex/pdf                         # Headless Chrome PDF
```

### Version Control
```
GET    /api/latex/projects/{id}/versions      # History
POST   /api/latex/projects/{id}/versions      # Save snapshot
POST   /api/latex/projects/{id}/revert/{vid}  # Server revert
POST   /api/latex/projects/{id}/diff          # Unified diff
GET    /api/latex/projects/{id}/download-zip  # Export ZIP
```

### References & Review
```
POST   /api/latex/references/add              # Add BibTeX
GET    /api/latex/projects/{id}/references    # List for picker
DELETE /api/latex/projects/{id}/references/{id}
GET    /api/latex/projects/{id}/crossrefs     # Labels/refs/cites
POST   /api/latex/spellcheck                  # LaTeX-aware
GET    /api/latex/projects/{id}/comments      # Review comments
POST   /api/latex/projects/{id}/comments      # Add comment
```

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Run tests (`./living-science-grid/start.sh test`)
2. Commit (`git commit -m 'Add amazing feature'`)
3. Push & PR

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Overleaf** for UX inspiration
- **TeX Live** for compilation engine
- **KaTeX** for math rendering
- **Supabase** for PostgreSQL hosting
- **Vite + Rolldown** for lightning-fast builds

---

**Built with ❤️ for researchers who want sovereignty over their work.**