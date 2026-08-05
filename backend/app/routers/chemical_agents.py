from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.chemical_agent import ChemicalAgent
from app.schemas.chemical import ChemicalAgentOut
from app.core.deps import get_current_user
from app.models.user import User
from app.routers.setup import _normalize_nome

router = APIRouter(prefix="/chemical-agents", tags=["chemical-agents"])


def _dedupe_by_nome(agentes):
    """Mantém só a 1ª ocorrência de cada nome normalizado — proteção extra
    contra duplicatas que ainda possam existir no catálogo (ver
    /setup/import-chemical-agents, que já consolida a maioria delas)."""
    vistos = set()
    resultado = []
    for a in agentes:
        chave = _normalize_nome(a.nome)
        if chave not in vistos:
            vistos.add(chave)
            resultado.append(a)
    return resultado


@router.get("", response_model=List[ChemicalAgentOut])
def list_chemical_agents(
    search: Optional[str] = Query(None, description="Filtro por nome do agente ou grupo (ex: VOC)"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista agentes do catálogo com filtro opcional por nome ou grupo.

    Quando o termo bate um grupo (ex: "VOC"), TODOS os membros do grupo
    voltam por completo, sem cortar pelo limit — o frontend depende disso
    para vincular o grupo inteiro de uma vez na Conferência.
    """
    if not search:
        return db.query(ChemicalAgent).order_by(ChemicalAgent.nome).limit(limit).all()

    termo = f"%{search}%"
    por_grupo_raw = (
        db.query(ChemicalAgent)
        .filter(ChemicalAgent.grupo.ilike(termo))
        .order_by(ChemicalAgent.updated_at.desc())
        .all()
    )
    por_grupo = sorted(_dedupe_by_nome(por_grupo_raw), key=lambda a: a.nome)
    ids_grupo = {a.id for a in por_grupo}

    q_nome = db.query(ChemicalAgent).filter(ChemicalAgent.nome.ilike(termo))
    if ids_grupo:
        q_nome = q_nome.filter(~ChemicalAgent.id.in_(ids_grupo))
    por_nome_raw = q_nome.order_by(ChemicalAgent.updated_at.desc()).all()
    por_nome = sorted(_dedupe_by_nome(por_nome_raw), key=lambda a: a.nome)[:limit]

    return por_grupo + por_nome


@router.get("/{agent_id}", response_model=ChemicalAgentOut)
def get_chemical_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    agent = db.query(ChemicalAgent).filter(ChemicalAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return agent
