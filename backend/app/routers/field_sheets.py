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
from app.models.employee import Employee
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

@router.get("/pending", response_model=List[FieldSheetOut])
def list_pending_field_sheets(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.generated_report import GeneratedReport
    subquery = db.query(GeneratedReport.field_sheet_id)
    sheets = db.query(FieldSheet).filter(
        FieldSheet.id.notin_(subquery)
    ).order_by(FieldSheet.laudo_number.asc()).all()
    return sheets

@router.get("/next-number", response_model=dict)
def get_next_laudo_number(db: Session = Depends(get_db), _=Depends(get_current_user)):
    last = db.query(FieldSheet).order_by(FieldSheet.laudo_number.desc()).first()
    next_number = (last.laudo_number + 1) if last else 1
    return {"next_number": next_number}

@router.post("", response_model=FieldSheetOut)
def create_field_sheet(data: FieldSheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Se o funcionário não existe pelo ID mas tem nome em texto, cria um novo
    employee_id = data.employee_id
    if not employee_id and data.employee_name_text:
        existing = db.query(Employee).filter(
            Employee.company_id == data.company_id,
            Employee.nome == data.employee_name_text
        ).first()
        if existing:
            employee_id = existing.id
        else:
            new_emp = Employee(
                company_id=data.company_id,
                nome=data.employee_name_text,
                funcao=data.employee_funcao,
                matricula=data.employee_matricula,
                setor=data.employee_setor,
                local=data.employee_local,
            )
            db.add(new_emp)
            db.flush()
            employee_id = new_emp.id

    last = db.query(FieldSheet).order_by(FieldSheet.laudo_number.desc()).first()
    next_number = (last.laudo_number + 1) if last else 1

    payload = data.dict()
    payload['employee_id'] = employee_id
    payload['laudo_number'] = next_number
    payload['created_by'] = current_user.id
    # remove campos auxiliares que não existem no modelo
    for key in ('employee_funcao', 'employee_matricula', 'employee_setor', 'employee_local'):
        payload.pop(key, None)

    sheet = FieldSheet(**payload)
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet

@router.patch("/{sheet_id}/edit")
def edit_field_sheet(sheet_id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")
    if sheet.status == "aprovada":
        raise HTTPException(status_code=400, detail="Não é possível editar uma ficha já aprovada")
    allowed = {"epi", "activity", "machine_noise", "technician_name_2", "pos_verificacao_db", "laudo_number"}
    for key, value in body.items():
        if key in allowed:
            setattr(sheet, key, value if value != "" else None)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Número de ordem já existe. Escolha outro.")
    db.refresh(sheet)
    return {"ok": True}

@router.patch("/{sheet_id}/status")
def update_status(sheet_id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.sonus_upload import SonusUpload
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    new_status = body.get("status")
    if new_status not in ("pendente", "aprovada"):
        raise HTTPException(status_code=400, detail="Status invalido")
    if new_status == "aprovada":
        sonus = db.query(SonusUpload).filter(SonusUpload.field_sheet_id == sheet_id).first()
        if not sonus:
            raise HTTPException(status_code=400, detail="É necessário enviar o PDF do SONUS 2 antes de aprovar a ficha")
    sheet.status = new_status
    if new_status == "aprovada" and not sheet.signature_date:
        from datetime import date
        sheet.signature_date = date.today()
    db.commit()
    db.refresh(sheet)
    return {"id": sheet.id, "status": sheet.status}

@router.get("/{sheet_id}/pdf")
def download_field_sheet_pdf(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")

    company = sheet.company
    employee = sheet.employee
    emp_nome = employee.nome if employee else (sheet.employee_name_text or "")
    emp_funcao = employee.funcao if employee else ""
    emp_matricula = employee.matricula if employee else ""
    emp_setor = employee.setor if employee else ""
    emp_local = employee.local if employee else ""

    data = {
        "laudo_number": str(sheet.laudo_number),
        "tipo_analise": sheet.tipo_analise or "Ruído Ocupacional",
        "dosimeter_number": str(sheet.dosimeter_number),
        "collection_date": sheet.collection_date.strftime("%d/%m/%Y"),
        "razao_social": company.razao_social,
        "endereco": company.endereco or "",
        "nome_funcionario": emp_nome,
        "matricula": emp_matricula,
        "funcao": emp_funcao,
        "setor": emp_setor,
        "local": emp_local,
        "turno": sheet.turno or "",
        "codigo_esocial": sheet.codigo_esocial or "",
        "activity": sheet.activity or "",
        "machine_noise": sheet.machine_noise or "",
        "epi": sheet.epi or "",
        "pre_verificacao_db": sheet.pre_verificacao_db or "114,00",
        "pos_verificacao_db": sheet.pos_verificacao_db or "",
        "technician_name": sheet.technician_name,
        "technician_name_2": sheet.technician_name_2 or "",
        "signature_date": sheet.signature_date.strftime("%d/%m/%Y") if sheet.signature_date else "",
    }

    with open(FICHA_TEMPLATE, "r", encoding="utf-8") as f:
        tmpl = Template(f.read())
    html = tmpl.render(**data)

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    HTML(string=html).write_pdf(tmp.name)
    tmp.close()

    safe_nome = emp_nome.replace(" ", "_") if emp_nome else "sem_nome"
    filename = f"ficha_{sheet.laudo_number:04d}_{safe_nome}.pdf"
    return FileResponse(tmp.name, media_type="application/pdf", filename=filename)

@router.get("/{sheet_id}", response_model=FieldSheetOut)
def get_field_sheet(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    return sheet
