from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.chemical_agent import ChemicalAgent
from app.schemas.chemical import ChemicalAgentOut
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/chemical-agents", tags=["chemical-agents"])


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
    por_grupo = (
        db.query(ChemicalAgent)
        .filter(ChemicalAgent.grupo.ilike(termo))
        .order_by(ChemicalAgent.nome)
        .all()
    )
    ids_grupo = {a.id for a in por_grupo}

    q_nome = db.query(ChemicalAgent).filter(ChemicalAgent.nome.ilike(termo))
    if ids_grupo:
        q_nome = q_nome.filter(~ChemicalAgent.id.in_(ids_grupo))
    por_nome = q_nome.order_by(ChemicalAgent.nome).limit(limit).all()

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
