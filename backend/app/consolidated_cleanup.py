"""Remoção de ConsolidatedReport com proteção de chave de storage compartilhada.

O nome do arquivo no Supabase deriva do filename (upsert=true), então registros
distintos podem apontar para o mesmo storage_path. O arquivo só é apagado se
nenhum outro registro o referenciar.
"""
import os
from app import supabase_storage
from app.models.consolidated_report import ConsolidatedReport


def remove_consolidated(db, rec: ConsolidatedReport) -> None:
    shared = db.query(ConsolidatedReport).filter(
        ConsolidatedReport.storage_path == rec.storage_path,
        ConsolidatedReport.id != rec.id,
    ).first() is not None

    if not shared:
        if rec.storage_path.startswith("supabase://"):
            try:
                supabase_storage.delete_file(rec.storage_path.removeprefix("supabase://"))
            except Exception:
                pass
        elif os.path.exists(rec.storage_path):
            try:
                os.unlink(rec.storage_path)
            except OSError:
                pass
    db.delete(rec)
    db.commit()


def validate_replace_target(db, replace_id, company_id, tipo_analise):
    """Valida o registro a substituir; devolve o registro ou levanta HTTPException."""
    from fastapi import HTTPException
    old = db.query(ConsolidatedReport).filter(ConsolidatedReport.id == replace_id).first()
    if not old:
        raise HTTPException(status_code=404, detail="Relatório a substituir não encontrado")
    if old.company_id != company_id:
        raise HTTPException(status_code=400, detail="O relatório a substituir pertence a outra empresa")
    if old.format != "pdf":
        raise HTTPException(status_code=400, detail="Só é possível substituir relatórios em PDF")
    if old.tipo_analise != tipo_analise:
        raise HTTPException(status_code=400, detail="O relatório a substituir é de outro tipo de análise")
    return old
