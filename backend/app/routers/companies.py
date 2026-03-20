from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyOut
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/companies", tags=["companies"])

@router.get("", response_model=List[CompanyOut])
def list_companies(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Company).order_by(Company.razao_social).all()

@router.post("", response_model=CompanyOut)
def create_company(data: CompanyCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    company = Company(**data.dict())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@router.put("/{company_id}", response_model=CompanyOut)
def update_company(company_id: int, data: CompanyCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    for key, value in data.dict().items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return company
