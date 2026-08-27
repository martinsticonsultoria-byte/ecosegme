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


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)):
    from app.models.field_sheet import FieldSheet
    from app.models.chemical_field_sheet import ChemicalFieldSheet
    from app.models.generated_report import GeneratedReport
    from app.models.consolidated_report import ConsolidatedReport
    from app.models.sonus_upload import SonusUpload
    from app.models.audit_log import AuditLog
    from app.models.custom_epi import CustomEPI

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")

    vinculos = [
        (db.query(FieldSheet).filter(FieldSheet.created_by == user_id).count(), "ficha(s) de campo de Ruído"),
        (db.query(ChemicalFieldSheet).filter(ChemicalFieldSheet.created_by == user_id).count(), "ficha(s) de campo Química(s)"),
        (db.query(GeneratedReport).filter(GeneratedReport.generated_by == user_id).count(), "laudo(s) gerado(s)"),
        (db.query(ConsolidatedReport).filter(ConsolidatedReport.generated_by == user_id).count(), "relatório(s) consolidado(s)"),
        (db.query(SonusUpload).filter(SonusUpload.uploaded_by == user_id).count(), "upload(s) de SONUS"),
        (db.query(AuditLog).filter(AuditLog.user_id == user_id).count(), "registro(s) de auditoria"),
        (db.query(CustomEPI).filter(CustomEPI.created_by == user_id).count(), "EPI(s) personalizado(s)"),
    ]
    partes = [f"{qtd} {rotulo}" for qtd, rotulo in vinculos if qtd > 0]
    if partes:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir: este usuário possui {', '.join(partes)} vinculado(s) no sistema. "
                   f"Use \"Desativar\" para bloquear o acesso sem perder o histórico."
        )

    db.delete(user)
    db.commit()
    return {"ok": True}


@router.patch("/{user_id}/password")
def reset_password(user_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    new_password = body.get("password", "")
    if len(new_password) < 10:
        raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 10 caracteres")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"ok": True}
