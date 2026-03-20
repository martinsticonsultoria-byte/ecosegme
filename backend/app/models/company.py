from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    razao_social = Column(String(200), nullable=False)
    endereco = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employees = relationship("Employee", back_populates="company")
    field_sheets = relationship("FieldSheet", back_populates="company")
