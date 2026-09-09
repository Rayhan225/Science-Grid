from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from ..core.token_store import token_store
from ..database.database import SessionLocal
from ..models.user import User
from .deps import get_db, oauth2_scheme, get_current_user
from ..core.config import settings

router = APIRouter()

class RegisterIn(BaseModel):
    email: str
    name: str | None = None
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    refresh_token: str | None = None

class UserOut(BaseModel):
    id: str
    email: str
    name: str | None
    role: str | None


@router.post("/register", response_model=UserOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email, name=payload.name, password_hash=hash_password(payload.password), role="researcher")
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=str(user.id), email=user.email, name=user.name, role=user.role)


class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    token_store.store_refresh(refresh_token, str(user.id))
    return TokenOut(access_token=access_token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES, refresh_token=refresh_token)


class RefreshIn(BaseModel):
    refresh_token: str


@router.post('/refresh', response_model=TokenOut)
def refresh_token(payload: RefreshIn):
    data = decode_refresh_token(payload.refresh_token)
    if not data:
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    if not token_store.has_refresh(payload.refresh_token):
        raise HTTPException(status_code=401, detail='Refresh token not recognized')
    user_id = token_store.pop_refresh(payload.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail='Refresh token expired or revoked')
    access_token = create_access_token(subject=user_id)
    new_refresh = create_refresh_token(subject=user_id)
    token_store.store_refresh(new_refresh, user_id)
    return TokenOut(access_token=access_token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES, refresh_token=new_refresh)


@router.post('/logout')
def logout(token: str = Depends(oauth2_scheme), refresh_token: str | None = None):
    token_store.revoke(token)
    if refresh_token:
        token_store.pop_refresh(refresh_token)
    return {"status": "ok", "message": "Token revoked"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut(id=str(current_user.id), email=current_user.email, name=current_user.name, role=current_user.role)
