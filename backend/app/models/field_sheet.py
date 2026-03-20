from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class FieldSheet(Base):
    __tablename__ = "field_sheets"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    laudo_number = Column(Integer, nullable=False, unique=True)
    dosimeter_number = Column(Integer, nullable=False)
    collection_date = Column(Date, nullable=False)
    epi = Column(String(200), nullable=True)
    activity = Column(Text, nullable=True)
    machine_noise = Column(Text, nullable=True)
    technician_name = Column(String(150), nullable=False)
    technician_name_2 = Column(String(150), nullable=True)
    signature_date = Column(Date, nullable=False)
    turno = Column(String(50), nullable=True)
    codigo_esocial = Column(String(50), nullable=True)
    pre_verificacao_db = Column(String(20), nullable=True)
    pos_verificacao_db = Column(String(20), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="field_sheets")
    employee = relationship("Employee", back_populates="field_sheets")
    creator = relationship("User")
