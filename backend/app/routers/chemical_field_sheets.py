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
    """Aprova a ficha: define laudo_number, laudo_y, status e signature_date."""
    sheet = _get_sheet_or_404(sheet_id, db)
    from datetime import datetime
    now = datetime.now()
    sheet.laudo_number  = laudo_number
    sheet.laudo_y       = 1               # sub-serial fixo (equivalente ao ".1" do ruído)
    sheet.status        = "aprovado"
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
