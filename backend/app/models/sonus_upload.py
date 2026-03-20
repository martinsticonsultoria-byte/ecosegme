from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SonusUpload(Base):
    __tablename__ = "sonus_uploads"

    id = Column(Integer, primary_key=True, index=True)
    field_sheet_id = Column(Integer, ForeignKey("field_sheets.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    parsed_employee_name = Column(String(150), nullable=True)
    inicio = Column(String(20), nullable=True)
    fim = Column(String(20), nullable=True)
    dose_diaria = Column(String(20), nullable=True)
    ne_db = Column(String(20), nullable=True)
    nen_db = Column(String(20), nullable=True)
    tempo_medicao = Column(String(20), nullable=True)
    sha256_original = Column(String(64), nullable=False)
    upload_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    field_sheet = relationship("FieldSheet")
    uploader = relationship("User")
