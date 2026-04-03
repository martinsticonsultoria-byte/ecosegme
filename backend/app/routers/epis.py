from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_user
from app.models.custom_epi import CustomEPI
from app.models.user import User

router = APIRouter(prefix="/epis", tags=["epis"])

PREDEFINED = [
    "Protetor Auricular - Plug de Inserção",
    "Protetor Auricular - Tipo Concha",
    "Protetor Auricular - Semi-auricular",
    "Capacete de Segurança",
    "Óculos de Proteção",
    "Luvas de Proteção",
    "Abafador de Ruído",
    "Máscara de Proteção Respiratória",
    "Calçado de Segurança",
    "Ausência de EPI",
]

@router.get("")
def list_epis(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    custom = [e.name for e in db.query(CustomEPI).order_by(CustomEPI.name).all()]
    return {"predefined": PREDEFINED, "custom": custom}

@router.post("")
def save_epi(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    name = (body.get("name") or "").strip()
    if not name or name in PREDEFINED:
        return {"ok": True}
    exists = db.query(CustomEPI).filter(CustomEPI.name == name).first()
    if not exists:
        db.add(CustomEPI(name=name, created_by=current_user.id))
        db.commit()
    return {"ok": True}
