from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.field_sheet import FieldSheet
from app.schemas.field_sheet import FieldSheetCreate, FieldSheetOut
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/field-sheets", tags=["field-sheets"])

@router.get("", response_model=List[FieldSheetOut])
def list_field_sheets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(FieldSheet).order_by(FieldSheet.created_at.desc()).all()

@router.get("/next-number", response_model=dict)
def get_next_laudo_number(db: Session = Depends(get_db), _=Depends(get_current_user)):
    last = db.query(FieldSheet).order_by(FieldSheet.laudo_number.desc()).first()
    next_number = (last.laudo_number + 1) if last else 1
    return {"next_number": next_number}

@router.post("", response_model=FieldSheetOut)
def create_field_sheet(data: FieldSheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    last = db.query(FieldSheet).order_by(FieldSheet.laudo_number.desc()).first()
    next_number = (last.laudo_number + 1) if last else 1
    sheet = FieldSheet(**data.dict(), laudo_number=next_number, created_by=current_user.id)
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet

@router.get("/{sheet_id}", response_model=FieldSheetOut)
def get_field_sheet(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    return sheet
