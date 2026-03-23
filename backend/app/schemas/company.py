from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CompanyCreate(BaseModel):
    razao_social: str
    cnpj: Optional[str] = None
    endereco: Optional[str] = None

class CompanyOut(BaseModel):
    id: int
    razao_social: str
    cnpj: Optional[str]
    endereco: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
