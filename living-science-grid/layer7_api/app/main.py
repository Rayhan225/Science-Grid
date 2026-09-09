from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

from .core.config import settings
from .database.database import SessionLocal

from .api.auth import router as auth_router
from .api.projects import router as projects_router
from .api.manuscripts import router as manuscripts_router
from .api.nodes import router as nodes_router
from .api.formulas import router as formulas_router
from .api.git import router as git_router
from .api.quality import router as quality_router

app = FastAPI(title="ScholarGrid Layer 7 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(projects_router, prefix="/api/v1/projects")
app.include_router(manuscripts_router, prefix="/api/v1/manuscripts")
app.include_router(nodes_router, prefix="/api/v1/nodes")
app.include_router(formulas_router, prefix="/api/v1/formulas")
app.include_router(git_router, prefix="/api/v1")
app.include_router(quality_router, prefix="/api/v1/quality")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
