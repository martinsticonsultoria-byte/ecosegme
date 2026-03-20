from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.field_sheet import FieldSheet
from app.models.sonus_upload import SonusUpload
from app.models.generated_report import GeneratedReport
from app.core.deps import get_current_user
from app.models.user import User
from app.pdf_generator import generate_laudo
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/generate/{field_sheet_id}")
def generate_report(field_sheet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(GeneratedReport).filter(GeneratedReport.field_sheet_id == field_sheet_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Laudo ja gerado para esta ficha. Laudos sao imutaveis.")
    sheet = db.query(FieldSheet).filter(FieldSheet.id == field_sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha nao encontrada")
    upload = db.query(SonusUpload).filter(SonusUpload.field_sheet_id == field_sheet_id).first()
    if not upload:
        raise HTTPException(status_code=400, detail="Nenhum PDF do SONUS 2 encontrado para esta ficha")
    data = {
        "laudo_number": str(sheet.laudo_number),
        "razao_social": sheet.company.razao_social,
        "endereco": sheet.company.endereco or "",
        "nome_funcionario": sheet.employee.nome,
        "matricula": sheet.employee.matricula or "",
        "funcao": sheet.employee.funcao or "",
        "setor": sheet.employee.setor or "",
        "local": sheet.employee.local or "",
        "turno": sheet.turno or "",
        "codigo_esocial": sheet.codigo_esocial or "",
        "collection_date": str(sheet.collection_date),
        "technician_name": sheet.technician_name,
        "technician_name_2": sheet.technician_name_2 or "",
        "activity": sheet.activity or "",
        "machine_noise": sheet.machine_noise or "",
        "epi": sheet.epi or "",
        "pre_verificacao_db": sheet.pre_verificacao_db or "",
        "pos_verificacao_db": sheet.pos_verificacao_db or "",
        "signature_date": str(sheet.signature_date),
        "parsed_employee_name": upload.parsed_employee_name or "",
        "inicio": upload.inicio or "",
        "fim": upload.fim or "",
        "dose_diaria": upload.dose_diaria or "",
        "ne_db": upload.ne_db or "",
        "nen_db": upload.nen_db or "",
        "tempo_medicao": upload.tempo_medicao or "",
    }
    try:
        output_path, filename, sha256 = generate_laudo(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")
    report = GeneratedReport(
        field_sheet_id=field_sheet_id,
        sonus_upload_id=upload.id,
        output_path=output_path,
        output_filename=filename,
        sha256_output=sha256,
        generated_by=current_user.id
    )
    db.add(report)
    db.flush()

    # Registra auditoria
    log = AuditLog(
        user_id=current_user.id,
        action="generate_report",
        field_sheet_id=field_sheet_id,
        original_filename=upload.original_filename,
        sha256_hash=sha256,
        details=f"Laudo gerado: {filename}"
    )
    db.add(log)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "filename": filename, "sha256": sha256, "generated_at": report.generated_at, "download_url": f"/reports/download/{report.id}"}

@router.get("/download/{report_id}")
def download_report(report_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    report = db.query(GeneratedReport).filter(GeneratedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laudo nao encontrado")
    return FileResponse(path=report.output_path, filename=report.output_filename, media_type="application/pdf")

@router.get("/list/{company_id}")
def list_reports(company_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    reports = db.query(GeneratedReport).join(FieldSheet).filter(FieldSheet.company_id == company_id).order_by(GeneratedReport.generated_at.desc()).all()
    return [{"id": r.id, "filename": r.output_filename, "sha256": r.sha256_output, "generated_at": r.generated_at, "download_url": f"/reports/download/{r.id}"} for r in reports]
