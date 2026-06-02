from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class FieldSheetCreate(BaseModel):
    company_id: int
    employee_id: Optional[int] = None
    employee_name_text: Optional[str] = None
    employee_funcao: Optional[str] = None
    employee_matricula: Optional[str] = None
    employee_setor: Optional[str] = None
    employee_local: Optional[str] = None
    tipo_analise: Optional[str] = None
    dosimeter_number: int
    collection_date: date
    epi: Optional[str] = None
    activity: Optional[str] = None
    machine_noise: Optional[str] = None
    technician_name: str
    technician_name_2: Optional[str] = None
    signature_date: Optional[date] = None
    data_relatorio: Optional[date] = None
    conclusao_texto: Optional[str] = None
    turno: Optional[str] = None
    codigo_esocial: Optional[str] = None
    pre_verificacao_db: Optional[str] = None
    pos_verificacao_db: Optional[str] = None

class FieldSheetOut(BaseModel):
    id: int
    laudo_number: Optional[str] = None
    laudo_y: Optional[int] = None
    dosimeter_number: int
    collection_date: date
    tipo_analise: Optional[str] = None
    technician_name: str
    technician_name_2: Optional[str] = None
    signature_date: Optional[date] = None
    data_relatorio: Optional[date] = None
    status: str
    company_id: int
    company_nome: Optional[str] = None
    employee_id: Optional[int] = None
    employee_nome: Optional[str] = None
    employee_funcao: Optional[str] = None
    employee_matricula: Optional[str] = None
    employee_setor: Optional[str] = None
    employee_local: Optional[str] = None
    epi: Optional[str] = None
    activity: Optional[str] = None
    machine_noise: Optional[str] = None
    pre_verificacao_db: Optional[str] = None
    pos_verificacao_db: Optional[str] = None
    data_relatorio: Optional[date] = None
    conclusao_texto: Optional[str] = None
    has_sonus: Optional[bool] = False
    sonus_parsed_name: Optional[str] = None
    sonus_name_mismatch: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True
