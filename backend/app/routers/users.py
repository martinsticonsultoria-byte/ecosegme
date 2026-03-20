from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.core.deps import require_admin
from app.core.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    active: bool

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).order_by(User.name).all()


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/toggle", response_model=UserOut)
def toggle_user(user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar sua própria conta")
    user.active = not user.active
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/password")
def reset_password(user_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    new_password = body.get("password", "")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"ok": True}
