from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    field_sheet_id = Column(Integer, ForeignKey("field_sheets.id"), nullable=False)
    sonus_upload_id = Column(Integer, ForeignKey("sonus_uploads.id"), nullable=False)
    output_path = Column(String(500), nullable=False)
    output_filename = Column(String(255), nullable=False)
    sha256_output = Column(String(64), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    field_sheet = relationship("FieldSheet")
    sonus_upload = relationship("SonusUpload")
    generator = relationship("User")
