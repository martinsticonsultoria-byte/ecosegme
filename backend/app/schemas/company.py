from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CompanyCreate(BaseModel):
    razao_social: str = Field(..., max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    endereco: Optional[str] = Field(None, max_length=300)

class CompanyOut(BaseModel):
    id: int
    razao_social: str
    cnpj: Optional[str]
    endereco: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
