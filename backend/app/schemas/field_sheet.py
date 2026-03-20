from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class FieldSheetCreate(BaseModel):
    company_id: int
    employee_id: int
    dosimeter_number: int
    collection_date: date
    epi: Optional[str] = None
    activity: Optional[str] = None
    machine_noise: Optional[str] = None
    technician_name: str
    technician_name_2: Optional[str] = None
    signature_date: date
    turno: Optional[str] = None
    codigo_esocial: Optional[str] = None
    pre_verificacao_db: Optional[str] = None
    pos_verificacao_db: Optional[str] = None

class FieldSheetOut(BaseModel):
    id: int
    laudo_number: int
    dosimeter_number: int
    collection_date: date
    technician_name: str
    technician_name_2: Optional[str] = None
    signature_date: date
    company_id: int
    employee_id: int
    created_at: datetime

    class Config:
        from_attributes = True
