from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.chemical_field_sheet import ChemicalFieldSheet
from app.models.chemical_sheet_agent import ChemicalSheetAgent
from app.models.chemical_agent import ChemicalAgent
from app.models.employee import Employee
from app.schemas.chemical import (
    ChemicalFieldSheetCreate,
    ChemicalFieldSheetUpdate,
    ChemicalFieldSheetOut,
    ChemicalSheetAgentCreate,
    ChemicalSheetAgentUpdate,
    ChemicalSheetAgentOut,
)
from app.core.deps import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/chemical-field-sheets", tags=["chemical-field-sheets"])


# ──────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────

def _calcular_resultado(valor: str, agent: ChemicalAgent) -> str:
    """Determina resultado_status a partir do valor medido e limites do agente."""
    if not valor or not valor.strip():
        return "pendente"
    v = valor.strip()
    if v.startswith("<"):
        return "nao_detectado"
    try:
        num = float(v.replace(",", "."))
        limite_str = agent.nr15_valor or agent.acgih_twa  # NR-15 tem prioridade; fallback ACGIH
        if not limite_str or limite_str.strip() in ("-", ""):
            return "pendente"
        limite = float(limite_str.replace(",", "."))
        return "dentro_limite" if num <= limite else "acima_limite"
    except (ValueError, TypeError):
        return "pendente"


def _get_sheet_or_404(sheet_id: int, db: Session) -> ChemicalFieldSheet:
    sheet = db.query(ChemicalFieldSheet).filter(ChemicalFieldSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Ficha química não encontrada")
    return sheet


# ──────────────────────────────────────────────────────
# CRUD — Fichas
# ──────────────────────────────────────────────────────

@router.get("", response_model=List[ChemicalFieldSheetOut])
def list_chemical_field_sheets(
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(ChemicalFieldSheet)
    if company_id:
        q = q.filter(ChemicalFieldSheet.company_id == company_id)
    if status:
        q = q.filter(ChemicalFieldSheet.status == status)
    return q.order_by(ChemicalFieldSheet.created_at.desc()).all()


@router.post("", response_model=ChemicalFieldSheetOut, status_code=201)
def create_chemical_field_sheet(
    data: ChemicalFieldSheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Resolve ou cria funcionário
    employee_id = data.employee_id
    if not employee_id and data.employee_name_text:
        existing = db.query(Employee).filter(
            Employee.company_id == data.company_id,
            Employee.nome == data.employee_name_text,
        ).first()
        if existing:
            employee_id = existing.id
        else:
            new_emp = Employee(
                company_id=data.company_id,
                nome=data.employee_name_text,
            )
            db.add(new_emp)
            db.flush()
            employee_id = new_emp.id

    from app.models.chemical_field_sheet import _CONCLUSAO_PADRAO
    sheet = ChemicalFieldSheet(
        **{k: v for k, v in data.dict().items() if k != "employee_id"},
        employee_id=employee_id,
        created_by=current_user.id,
        conclusao_texto=_CONCLUSAO_PADRAO,
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.get("/report/xlsx")
def generate_chemical_xlsx_report(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera relatório XLSX consolidado das fichas químicas de uma empresa."""
    import io, re as _re
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from fastapi.responses import StreamingResponse
    from datetime import datetime
    from app.models.company import Company
    from app.models.consolidated_report import ConsolidatedReport
    from app import supabase_storage

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    sheets = (
        db.query(ChemicalFieldSheet)
        .filter(ChemicalFieldSheet.company_id == company_id)
        .order_by(ChemicalFieldSheet.laudo_number, ChemicalFieldSheet.collection_date)
        .all()
    )
    if not sheets:
        raise HTTPException(status_code=404, detail="Nenhuma ficha química encontrada para esta empresa")

    year = datetime.now().year

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Agentes Químicos"

    # ── Estilos ──────────────────────────────────────────────
    _green      = "1A7A3C"
    header_fill = PatternFill(start_color=_green, end_color=_green, fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    center_al   = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_al     = Alignment(horizontal="left",   vertical="center", wrap_text=True)
    thin        = Side(style="thin", color="CCCCCC")
    thin_border = Border(left=thin, right=thin, top=thin, bottom=thin)

    STATUS_LABEL = {
        "dentro_limite": "Dentro do Limite",
        "acima_limite":  "Acima do Limite",
        "nao_detectado": "Não Detectado",
        "pendente":      "Pendente",
    }
    STATUS_FILL = {
        "dentro_limite": ("D1FAE5", "166534"),
        "acima_limite":  ("FEE2E2", "991B1B"),
        "nao_detectado": ("DBEAFE", "1E40AF"),
        "pendente":      ("FEF9C3", "854D0E"),
    }

    # ── Cabeçalho do documento ────────────────────────────────
    NUM_COLS = 15
    last_col = get_column_letter(NUM_COLS)

    ws.merge_cells(f"A1:{last_col}1")
    ws["A1"] = "RELATÓRIO DE MONITORAMENTO DE AGENTES QUÍMICOS"
    ws["A1"].font = Font(bold=True, size=14, color=_green)
    ws["A1"].alignment = center_al

    ws.merge_cells(f"A2:{last_col}2")
    ws["A2"] = company.razao_social
    ws["A2"].font = Font(bold=True, size=12)
    ws["A2"].alignment = center_al

    ws.merge_cells(f"A3:{last_col}3")
    ws["A3"] = f"CNPJ: {company.cnpj or '—'}   |   Endereço: {company.endereco or '—'}"
    ws["A3"].alignment = center_al
    ws["A3"].font = Font(size=10, color="475569")

    ws.merge_cells(f"A4:{last_col}4")
    ws["A4"] = f"Emitido em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws["A4"].alignment = center_al
    ws["A4"].font = Font(size=9, color="94A3B8")

    ws.append([])  # linha em branco (linha 5)

    # ── Cabeçalho da tabela (linha 6) ─────────────────────────
    headers = [
        "Nº Laudo", "Funcionário", "Função", "Setor", "Local",
        "Data Coleta", "Amostrador", "Tipo Amostrador",
        "Agente Químico", "Nº CAS", "Unidade",
        "Valor Encontrado", "LT NR-15", "TLV-TWA ACGIH",
        "Resultado",
    ]
    ws.append(headers)
    hdr_row = ws.max_row
    for cell in ws[hdr_row]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_al
        cell.border = thin_border
    ws.row_dimensions[hdr_row].height = 32

    # ── Linhas de dados ───────────────────────────────────────
    for sheet in sheets:
        laudo_str = (
            f"{sheet.laudo_number}.{sheet.laudo_y or 1}/{year}"
            if sheet.laudo_number else "S/Nº"
        )
        date_str = sheet.collection_date.strftime("%d/%m/%Y") if sheet.collection_date else ""
        emp_nome = (sheet.employee.nome if sheet.employee else sheet.employee_name_text) or "—"
        agents   = sheet.agents or []

        def write_row(extra_cols, _sheet=sheet, _laudo=laudo_str, _emp=emp_nome, _date=date_str):
            row_data = [
                _laudo, _emp, _sheet.funcao or "—", _sheet.setor or "—", _sheet.local or "—",
                _date, _sheet.numero_amostrador or "—", _sheet.tipo_amostrador or "—",
            ] + extra_cols
            ws.append(row_data)
            r = ws.max_row
            for cell in ws[r]:
                cell.alignment = left_al
                cell.border = thin_border
            return r

        if not agents:
            write_row(["—", "—", "—", "—", "—", "—", "—"])
        else:
            for sa in agents:
                ag = sa.agent
                result_key = sa.resultado_status or "pendente"
                row_idx = write_row([
                    ag.nome if ag else "—",
                    ag.numero_cas if ag else "—",
                    ag.unidade if ag else "—",
                    sa.valor_encontrado or "—",
                    ag.nr15_valor if ag else "—",
                    ag.acgih_twa if ag else "—",
                    STATUS_LABEL.get(result_key, result_key),
                ])
                fill_color, font_color = STATUS_FILL.get(result_key, ("FFFFFF", "000000"))
                rc = ws.cell(row=row_idx, column=15)
                rc.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
                rc.font = Font(bold=True, color=font_color, size=10)

    # ── Larguras das colunas ──────────────────────────────────
    col_widths = [14, 24, 18, 16, 16, 12, 20, 20, 32, 14, 10, 16, 12, 14, 20]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.row_dimensions[1].height = 22
    ws.freeze_panes = "A7"  # congela cabeçalhos ao rolar

    # ── Serializa e salva ──────────────────────────────────────
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    xlsx_bytes = output.read()

    safe_name = _re.sub(r'[\\/:*?"<>|\s]+', '_', company.razao_social or 'Empresa').strip('_')[:20]
    filename   = f"Relatório_Químico_{safe_name}_{datetime.now().strftime('%Y%m%d')}.xlsx"

    storage_path = filename
    if supabase_storage.is_configured():
        try:
            supabase_storage.upload_pdf(xlsx_bytes, filename)
            storage_path = f"supabase://{filename}"
        except Exception:
            pass

    rec = ConsolidatedReport(
        company_id=company_id,
        tipo_analise="Químico",
        format="xlsx",
        filename=filename,
        storage_path=storage_path,
        generated_by=current_user.id,
    )
    db.add(rec)
    db.commit()

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{sheet_id}", response_model=ChemicalFieldSheetOut)
def get_chemical_field_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return _get_sheet_or_404(sheet_id, db)


@router.patch("/{sheet_id}", response_model=ChemicalFieldSheetOut)
def update_chemical_field_sheet(
    sheet_id: int,
    data: ChemicalFieldSheetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sheet = _get_sheet_or_404(sheet_id, db)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(sheet, field, value)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.patch("/{sheet_id}/status", response_model=ChemicalFieldSheetOut)
def approve_chemical_field_sheet(
    sheet_id: int,
    laudo_number: str = Query(..., description="Número do laudo (apenas o inteiro)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Aprova a ficha: define laudo_number, laudo_y, status e signature_date.
    laudo_y é calculado como count+1 de fichas já aprovadas com o mesmo laudo_number
    na mesma empresa — idêntico à regra das fichas de ruído."""
    sheet = _get_sheet_or_404(sheet_id, db)
    # Conta fichas já aprovadas com mesmo laudo_number na mesma empresa (exceto a atual)
    count = db.query(ChemicalFieldSheet).filter(
        ChemicalFieldSheet.company_id == sheet.company_id,
        ChemicalFieldSheet.laudo_number == laudo_number,
        ChemicalFieldSheet.laudo_y.isnot(None),
        ChemicalFieldSheet.id != sheet_id,
    ).count()
    sheet.laudo_number   = laudo_number
    sheet.laudo_y        = count + 1
    sheet.status         = "aprovado"
    sheet.signature_date = date.today()
    sheet.data_relatorio = date.today()
    db.commit()
    db.refresh(sheet)
    return sheet


@router.delete("/{sheet_id}", status_code=204)
def delete_chemical_field_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    sheet = _get_sheet_or_404(sheet_id, db)
    db.delete(sheet)
    db.commit()


# ──────────────────────────────────────────────────────
# Agentes vinculados à ficha
# ──────────────────────────────────────────────────────

@router.get("/{sheet_id}/agents", response_model=List[ChemicalSheetAgentOut])
def list_sheet_agents(
    sheet_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _get_sheet_or_404(sheet_id, db)
    return (
        db.query(ChemicalSheetAgent)
        .filter(ChemicalSheetAgent.chemical_sheet_id == sheet_id)
        .order_by(ChemicalSheetAgent.id)
        .all()
    )


@router.post("/{sheet_id}/agents", response_model=ChemicalSheetAgentOut, status_code=201)
def add_sheet_agent(
    sheet_id: int,
    data: ChemicalSheetAgentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    _get_sheet_or_404(sheet_id, db)
    agent = db.query(ChemicalAgent).filter(ChemicalAgent.id == data.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado no catálogo")

    resultado = _calcular_resultado(data.valor_encontrado or "", agent)

    sa = ChemicalSheetAgent(
        chemical_sheet_id=sheet_id,
        agent_id=data.agent_id,
        valor_encontrado=data.valor_encontrado,
        resultado_status=data.resultado_status or resultado,
        observacao=data.observacao,
    )
    db.add(sa)
    db.commit()
    db.refresh(sa)
    return sa


@router.patch("/{sheet_id}/agents/{agent_id}", response_model=ChemicalSheetAgentOut)
def update_sheet_agent(
    sheet_id: int,
    agent_id: int,
    data: ChemicalSheetAgentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sa = (
        db.query(ChemicalSheetAgent)
        .filter(
            ChemicalSheetAgent.chemical_sheet_id == sheet_id,
            ChemicalSheetAgent.agent_id == agent_id,
        )
        .first()
    )
    if not sa:
        raise HTTPException(status_code=404, detail="Vínculo agente/ficha não encontrado")

    update_data = data.dict(exclude_unset=True)

    # Recalcula resultado_status automaticamente se valor_encontrado foi atualizado
    if "valor_encontrado" in update_data and "resultado_status" not in update_data:
        agent = db.query(ChemicalAgent).filter(ChemicalAgent.id == agent_id).first()
        update_data["resultado_status"] = _calcular_resultado(
            update_data["valor_encontrado"] or "", agent
        )

    for field, value in update_data.items():
        setattr(sa, field, value)

    db.commit()
    db.refresh(sa)
    return sa


@router.delete("/{sheet_id}/agents/{agent_id}", status_code=204)
def remove_sheet_agent(
    sheet_id: int,
    agent_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sa = (
        db.query(ChemicalSheetAgent)
        .filter(
            ChemicalSheetAgent.chemical_sheet_id == sheet_id,
            ChemicalSheetAgent.agent_id == agent_id,
        )
        .first()
    )
    if not sa:
        raise HTTPException(status_code=404, detail="Vínculo agente/ficha não encontrado")
    db.delete(sa)
    db.commit()
