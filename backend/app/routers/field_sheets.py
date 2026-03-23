import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from jinja2 import Template
from weasyprint import HTML
from app.database import get_db
from app.models.field_sheet import FieldSheet
from app.schemas.field_sheet import FieldSheetCreate, FieldSheetOut
from app.core.deps import get_current_user
from app.models.user import User

FICHA_TEMPLATE = os.path.join(os.path.dirname(__file__), "../templates/ficha_campo.html")

router = APIRouter(prefix="/field-sheets", tags=["field-sheets"])

@router.get("", response_model=List[FieldSheetOut])
def list_field_sheets(company_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(FieldSheet)
    if company_id:
        q = q.filter(FieldSheet.company_id == company_id)
    return q.order_by(FieldSheet.created_at.desc()).all()

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

@router.get("/{sheet_id}/pdf")
def download_field_sheet_pdf(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")

    company = sheet.company
    employee = sheet.employee

    data = {
        "laudo_number": str(sheet.laudo_number),
        "dosimeter_number": str(sheet.dosimeter_number),
        "collection_date": sheet.collection_date.strftime("%d/%m/%Y"),
        "razao_social": company.razao_social,
        "endereco": company.endereco or "",
        "nome_funcionario": employee.nome,
        "matricula": employee.matricula or "",
        "funcao": employee.funcao or "",
        "setor": employee.setor or "",
        "local": employee.local or "",
        "turno": sheet.turno or "",
        "codigo_esocial": sheet.codigo_esocial or "",
        "activity": sheet.activity or "",
        "machine_noise": sheet.machine_noise or "",
        "epi": sheet.epi or "",
        "pre_verificacao_db": sheet.pre_verificacao_db or "",
        "pos_verificacao_db": sheet.pos_verificacao_db or "",
        "technician_name": sheet.technician_name,
        "technician_name_2": sheet.technician_name_2 or "",
        "signature_date": sheet.signature_date.strftime("%d/%m/%Y"),
    }

    with open(FICHA_TEMPLATE, "r", encoding="utf-8") as f:
        tmpl = Template(f.read())
    html = tmpl.render(**data)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    HTML(string=html).write_pdf(tmp.name)
    tmp.close()

    nome = employee.nome.replace(" ", "_")
    filename = f"ficha_{sheet.laudo_number:04d}_{nome}.pdf"
    return FileResponse(tmp.name, media_type="application/pdf", filename=filename)

@router.get("/{sheet_id}", response_model=FieldSheetOut)
def get_field_sheet(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    return sheet
