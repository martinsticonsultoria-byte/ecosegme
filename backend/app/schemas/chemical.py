from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# ──────────────────────────────────────────
# ChemicalAgent
# ──────────────────────────────────────────

class ChemicalAgentOut(BaseModel):
    id:             int
    nome:           str
    esocial:        Optional[str] = None
    unidade:        Optional[str] = None
    acgih_twa:      Optional[str] = None
    acgih_stel:     Optional[str] = None
    nr15_valor:     Optional[str] = None
    efeito_critico: Optional[str] = None
    amostrador:     Optional[str] = None
    metodo:         Optional[str] = None
    metodo_analise: Optional[str] = None
    vazao:          Optional[str] = None
    volume:         Optional[str] = None
    lq:             Optional[str] = None
    numero_cas:     Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# ChemicalSheetAgent
# ──────────────────────────────────────────

class ChemicalSheetAgentCreate(BaseModel):
    agent_id:                int
    valor_encontrado:        Optional[str] = None
    resultado_status:        Optional[str] = None
    bases_efeitos_criticos:  Optional[str] = None
    observacao:              Optional[str] = None


class ChemicalSheetAgentUpdate(BaseModel):
    valor_encontrado:        Optional[str] = None
    resultado_status:        Optional[str] = None
    bases_efeitos_criticos:  Optional[str] = None
    observacao:              Optional[str] = None


class ChemicalSheetAgentOut(BaseModel):
    id:                      int
    chemical_sheet_id:       int
    agent_id:                int
    valor_encontrado:        Optional[str] = None
    resultado_status:        Optional[str] = None
    bases_efeitos_criticos:  Optional[str] = None
    observacao:              Optional[str] = None
    agent:                   Optional[ChemicalAgentOut] = None
    created_at:              datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# ChemicalFieldSheet
# ──────────────────────────────────────────

class ChemicalFieldSheetCreate(BaseModel):
    company_id:          int
    technician_name:     str
    collection_date:     date
    employee_id:         Optional[int]   = None
    employee_name_text:  Optional[str]   = None
    funcao:              str
    matricula:           str
    setor:               str
    local:               str
    numero_amostrador:   str
    tipo_amostrador:     str
    situacao_ambiente:   str
    atividade:           Optional[str]   = None
    frequencia:          Optional[str]   = None
    tempo_exposicao_h:   Optional[float] = None
    jornada_trabalho:    Optional[str]   = None
    volume_ar_amostrado: Optional[str]   = None
    epi:                 Optional[str]   = None
    observacoes:         Optional[str]   = None


class ChemicalFieldSheetUpdate(BaseModel):
    technician_name:     Optional[str]   = None
    collection_date:     Optional[date]  = None
    employee_id:         Optional[int]   = None
    employee_name_text:  Optional[str]   = None
    funcao:              Optional[str]   = None
    matricula:           Optional[str]   = None
    setor:               Optional[str]   = None
    local:               Optional[str]   = None
    numero_amostrador:   Optional[str]   = None
    tipo_amostrador:     Optional[str]   = None
    situacao_ambiente:   Optional[str]   = None
    atividade:           Optional[str]   = None
    frequencia:          Optional[str]   = None
    tempo_exposicao_h:   Optional[float] = None
    jornada_trabalho:    Optional[str]   = None
    volume_ar_amostrado: Optional[str]   = None
    epi:                 Optional[str]   = None
    observacoes:         Optional[str]   = None
    laudo_number:        Optional[str]   = None
    laudo_y:             Optional[int]   = None
    conclusao_texto:     Optional[str]   = None
    signature_date:      Optional[date]  = None
    data_relatorio:      Optional[date]  = None


class ChemicalFieldSheetOut(BaseModel):
    id:                  int
    company_id:          int
    company_nome:        Optional[str]   = None
    technician_name:     str
    collection_date:     date
    employee_id:         Optional[int]   = None
    employee_nome:       Optional[str]   = None
    funcao:              str
    matricula:           str
    setor:               str
    local:               str
    numero_amostrador:   str
    tipo_amostrador:     str
    situacao_ambiente:   str
    atividade:           Optional[str]   = None
    frequencia:          Optional[str]   = None
    tempo_exposicao_h:   Optional[float] = None
    jornada_trabalho:    Optional[str]   = None
    volume_ar_amostrado: Optional[str]   = None
    epi:                 Optional[str]   = None
    observacoes:         Optional[str]   = None
    laudo_number:        Optional[str]   = None
    laudo_y:             Optional[int]   = None
    tipo_analise:        str
    status:              str
    data_relatorio:      Optional[date]  = None
    signature_date:      Optional[date]  = None
    conclusao_texto:     Optional[str]   = None
    agents:              List[ChemicalSheetAgentOut] = []
    created_at:          datetime

    class Config:
        from_attributes = True
