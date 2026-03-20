from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    nome = Column(String(150), nullable=False)
    funcao = Column(String(100), nullable=True)
    matricula = Column(String(50), nullable=True)
    setor = Column(String(100), nullable=True)
    local = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="employees")
    field_sheets = relationship("FieldSheet", back_populates="employee")
