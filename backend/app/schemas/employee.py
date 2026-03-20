from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EmployeeCreate(BaseModel):
    company_id: int
    nome: str
    funcao: Optional[str] = None
    matricula: Optional[str] = None
    setor: Optional[str] = None
    local: Optional[str] = None

class EmployeeOut(BaseModel):
    id: int
    company_id: int
    nome: str
    funcao: Optional[str]
    matricula: Optional[str]
    setor: Optional[str]
    local: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
