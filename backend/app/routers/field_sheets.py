import os
import tempfile
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import extract
from typing import List
from jinja2 import Template
from weasyprint import HTML
from app.database import get_db
from app.models.field_sheet import FieldSheet
from app.models.employee import Employee
from app.models.generated_report import GeneratedReport
from app.models.sonus_upload import SonusUpload
from app.models.audit_log import AuditLog
from app.schemas.field_sheet import FieldSheetCreate, FieldSheetOut
from app.core.deps import get_current_user, require_admin
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

    current_year = datetime.now().year
    count_this_year = db.query(FieldSheet).filter(
        FieldSheet.company_id == data.company_id,
        extract('year', FieldSheet.created_at) == current_year
    ).count()

    payload = data.dict()
    payload['employee_id'] = employee_id
    payload['laudo_number'] = None
    payload['laudo_y'] = count_this_year + 1
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
    allowed = {
        "epi", "activity", "machine_noise", "technician_name_2", "pos_verificacao_db",
        "laudo_number", "technician_name", "pre_verificacao_db", "dosimeter_number",
        "collection_date", "tipo_analise", "data_relatorio", "conclusao_texto",
    }
    from datetime import date as date_type
    for key, value in body.items():
        if key not in allowed:
            continue
        if value == "":
            value = None
        if key in ("collection_date", "data_relatorio") and value:
            from datetime import datetime
            value = datetime.strptime(value, "%Y-%m-%d").date()
        if key == "dosimeter_number" and value:
            value = int(value)
        setattr(sheet, key, value)

    # Atualiza campos do funcionário se enviados
    emp_fields = {"funcao", "matricula", "setor", "local"}
    emp_updates = {k: (v if v != "" else None) for k, v in body.items() if k in emp_fields}
    if emp_updates and sheet.employee_id:
        from app.models.employee import Employee
        emp = db.query(Employee).filter(Employee.id == sheet.employee_id).first()
        if emp:
            for k, v in emp_updates.items():
                setattr(emp, k, v)
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
        if not sheet.laudo_number:
            raise HTTPException(status_code=400, detail="Defina o Nº do Laudo antes de aprovar a ficha")
        if not sheet.data_relatorio:
            raise HTTPException(status_code=400, detail="Defina a Data do Relatório antes de aprovar a ficha")
        sonus = db.query(SonusUpload).filter(SonusUpload.field_sheet_id == sheet_id).first()
        if not sonus:
            raise HTTPException(status_code=400, detail="É necessário enviar o PDF do SONUS 2 antes de aprovar a ficha")
        if sonus.parsed_employee_name:
            emp_nome = sheet.employee.nome if sheet.employee else sheet.employee_name_text
            if emp_nome:
                from app.parser import names_match
                if not names_match(sonus.parsed_employee_name, emp_nome):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Nome no SONUS '{sonus.parsed_employee_name}' diverge do cadastro '{emp_nome}'. Corrija antes de aprovar."
                    )
    sheet.status = new_status
    if new_status == "aprovada":
        from datetime import date
        if not sheet.signature_date:
            sheet.signature_date = date.today()
        ano_atual = datetime.now().year
        count = db.query(FieldSheet).filter(
            FieldSheet.company_id == sheet.company_id,
            FieldSheet.status == "aprovada",
            extract('year', FieldSheet.created_at) == ano_atual,
            FieldSheet.id != sheet.id,
        ).count()
        sheet.laudo_y = count + 1
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

@router.delete("/{sheet_id}", status_code=204)
def delete_field_sheet(sheet_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    from app import supabase_storage
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")
    try:
        reports = db.query(GeneratedReport).filter(GeneratedReport.field_sheet_id == sheet_id).all()
        for r in reports:
            if r.output_path:
                try:
                    supabase_storage.delete_file(r.output_path)
                except Exception:
                    pass
            db.delete(r)

        sonuses = db.query(SonusUpload).filter(SonusUpload.field_sheet_id == sheet_id).all()
        for s in sonuses:
            if s.storage_path:
                try:
                    supabase_storage.delete_file(s.storage_path)
                except Exception:
                    pass
            db.delete(s)

        db.query(AuditLog).filter(AuditLog.field_sheet_id == sheet_id).update(
            {AuditLog.field_sheet_id: None}
        )

        db.delete(sheet)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível excluir a ficha pois existem registros vinculados.")

@router.get("/{sheet_id}", response_model=FieldSheetOut)
def get_field_sheet(sheet_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    return sheet
