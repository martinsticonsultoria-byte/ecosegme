import hashlib
import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sonus_upload import SonusUpload
from app.models.field_sheet import FieldSheet
from app.core.deps import get_current_user
from app.models.user import User
from app.parser import extract_sonus_data, names_match, name_similarity

router = APIRouter(prefix="/uploads", tags=["uploads"])

STORAGE_DIR = "storage/sonus_uploads"
MAX_FILE_SIZE_MB = 20


def _validate_upload(file: UploadFile, content: bytes) -> None:
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande ({size_mb:.1f}MB). Limite: {MAX_FILE_SIZE_MB}MB"
        )
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")


@router.post("/sonus/{field_sheet_id}")
def upload_sonus(
    field_sheet_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sheet = db.query(FieldSheet).filter(FieldSheet.id == field_sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha não encontrada")

    existing = db.query(SonusUpload).filter(
        SonusUpload.field_sheet_id == field_sheet_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe um PDF enviado para esta ficha. Exclua o anterior para reenviar."
        )

    content = file.file.read()
    _validate_upload(file, content)

    sha256 = hashlib.sha256(content).hexdigest()

    duplicate = db.query(SonusUpload).filter(
        SonusUpload.sha256_original == sha256
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=f"Este PDF já foi enviado anteriormente (ficha #{duplicate.field_sheet_id})"
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        data = extract_sonus_data(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    os.makedirs(STORAGE_DIR, exist_ok=True)
    safe_filename = f"{field_sheet_id}_{sha256[:8]}_{file.filename}"
    storage_path = os.path.join(STORAGE_DIR, safe_filename)
    with open(storage_path, "wb") as f:
        f.write(content)

    employee = sheet.employee
    match_result = False
    similarity_score = 0.0
    name_alert = None

    if data.get("funcionario") and employee:
        match_result = names_match(data["funcionario"], employee.nome)
        similarity_score = round(name_similarity(data["funcionario"], employee.nome), 2)
        if not match_result:
            name_alert = (
                f"ATENÇÃO: Nome no PDF '{data['funcionario']}' diverge do cadastro "
                f"'{employee.nome}' (similaridade: {similarity_score:.0%})"
            )

    upload = SonusUpload(
        field_sheet_id=field_sheet_id,
        original_filename=file.filename,
        storage_path=storage_path,
        parsed_employee_name=data.get("funcionario"),
        inicio=data.get("inicio"),
        fim=data.get("fim"),
        dose_diaria=data.get("dose_diaria"),
        ne_db=data.get("ne_db"),
        nen_db=data.get("nen_db"),
        tempo_medicao=data.get("tempo_medicao"),
        sha256_original=sha256,
        uploaded_by=current_user.id
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    return {
        "id": upload.id,
        "parsed_data": {k: v for k, v in data.items() if not k.startswith("_")},
        "name_match": match_result,
        "name_similarity": similarity_score,
        "name_alert": name_alert,
        "confidence_score": data.get("_confidence_score", 0),
        "warnings": data.get("_warnings", []),
        "sha256": sha256,
    }


@router.get("/sonus/{field_sheet_id}")
def get_sonus_upload(
    field_sheet_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    upload = db.query(SonusUpload).filter(
        SonusUpload.field_sheet_id == field_sheet_id
    ).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Nenhum upload encontrado para esta ficha")

    return {
        "id": upload.id,
        "original_filename": upload.original_filename,
        "parsed_employee_name": upload.parsed_employee_name,
        "inicio": upload.inicio,
        "fim": upload.fim,
        "dose_diaria": upload.dose_diaria,
        "ne_db": upload.ne_db,
        "nen_db": upload.nen_db,
        "tempo_medicao": upload.tempo_medicao,
        "sha256": upload.sha256_original,
        "upload_at": upload.upload_at,
    }
