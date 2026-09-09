# ScholarGrid Layer 7 — Connected Raw HTML/CSS/JS Frontend

This version is wired to the FastAPI backend found in the supplied backend archive. The backend exposes `/api/v1/auth`, `/api/v1/nodes`, `/api/v1/formulas`, `/api/v1/repositories`, `/api/v1/quality/diff`, `/api/v1/quality/citations/validate`, and `/api/v1/quality/publisher/check`.

## Run backend
From the backend project root (the folder containing `backend/app/main.py`), use the same Python environment you already use and run:

`uvicorn backend.app.main:app --reload`

If your current working directory is already the `backend` package root, use the command appropriate to your existing project layout.

## Run frontend
Open `index.html` with VS Code Live Server. Typical URL: `http://127.0.0.1:5500`.

## Connect
1. Open **Settings**.
2. Keep Backend URL as `http://127.0.0.1:8000` unless your FastAPI uses another port.
3. Click **Save settings** and verify `FastAPI connected · ok`.
4. Create an account or log in using the FastAPI `/api/v1/auth` endpoints.
5. Turn **Demo mode OFF**.
6. API Node, Git Code Link, Manuscript Diff, Citation Validation and Compliance Check will use the FastAPI backend.

The frontend does not connect directly to PostgreSQL; it calls FastAPI, and FastAPI uses the existing SQLAlchemy/PostgreSQL layer.
