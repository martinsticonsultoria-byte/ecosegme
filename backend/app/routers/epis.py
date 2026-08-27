from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.custom_epi import CustomEPI
from app.models.user import User

router = APIRouter(prefix="/epis", tags=["epis"])


@router.get("")
def list_epis(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    epis = db.query(CustomEPI).order_by(CustomEPI.name).all()
    return [{"id": e.id, "name": e.name} for e in epis]


@router.post("")
def save_epi(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    name = (body.get("name") or "").strip()
    if not name:
        return {"ok": True}
    existing = db.query(CustomEPI).filter(CustomEPI.name == name).first()
    if not existing:
        epi = CustomEPI(name=name, created_by=current_user.id)
        db.add(epi)
        db.commit()
        db.refresh(epi)
        return {"ok": True, "id": epi.id, "name": epi.name}
    return {"ok": True, "id": existing.id, "name": existing.name}


@router.delete("/{epi_id}")
def delete_epi(epi_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    epi = db.query(CustomEPI).filter(CustomEPI.id == epi_id).first()
    if not epi:
        raise HTTPException(status_code=404, detail="EPI não encontrado")
    db.delete(epi)
    db.commit()
    return {"ok": True}
