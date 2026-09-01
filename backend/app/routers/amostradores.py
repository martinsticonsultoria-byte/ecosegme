from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.amostrador_catalogo import AmostradorCatalogo
from app.models.user import User

router = APIRouter(prefix="/amostradores", tags=["amostradores"])

CATEGORIAS = ("numero", "tipo")


@router.get("")
def list_amostradores(categoria: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if categoria not in CATEGORIAS:
        raise HTTPException(status_code=400, detail="Categoria inválida")
    itens = (
        db.query(AmostradorCatalogo)
        .filter(AmostradorCatalogo.categoria == categoria)
        .order_by(AmostradorCatalogo.valor)
        .all()
    )
    return [{"id": a.id, "valor": a.valor} for a in itens]


@router.post("")
def save_amostrador(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categoria = (body.get("categoria") or "").strip()
    valor = (body.get("valor") or "").strip()
    if categoria not in CATEGORIAS:
        raise HTTPException(status_code=400, detail="Categoria inválida")
    if not valor:
        return {"ok": True}
    existing = (
        db.query(AmostradorCatalogo)
        .filter(AmostradorCatalogo.categoria == categoria, AmostradorCatalogo.valor == valor)
        .first()
    )
    if not existing:
        item = AmostradorCatalogo(categoria=categoria, valor=valor, created_by=current_user.id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return {"ok": True, "id": item.id, "valor": item.valor}
    return {"ok": True, "id": existing.id, "valor": existing.valor}


@router.delete("/{amostrador_id}")
def delete_amostrador(amostrador_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.query(AmostradorCatalogo).filter(AmostradorCatalogo.id == amostrador_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Amostrador não encontrado")
    db.delete(item)
    db.commit()
    return {"ok": True}
