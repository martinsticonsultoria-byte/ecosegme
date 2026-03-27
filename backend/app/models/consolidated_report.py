from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ConsolidatedReport(Base):
    __tablename__ = "consolidated_reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    tipo_analise = Column(String(100), nullable=False)
    format = Column(String(10), nullable=False)  # "pdf" ou "xlsx"
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    generator = relationship("User")
