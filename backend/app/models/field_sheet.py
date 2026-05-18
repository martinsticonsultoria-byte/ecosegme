from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class FieldSheet(Base):
    __tablename__ = "field_sheets"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    laudo_number = Column(Integer, nullable=True, unique=True)
    dosimeter_number = Column(Integer, nullable=False)
    collection_date = Column(Date, nullable=False)
    epi = Column(String(200), nullable=True)
    activity = Column(Text, nullable=True)
    machine_noise = Column(Text, nullable=True)
    tipo_analise = Column(String(50), nullable=True)
    employee_name_text = Column(String(150), nullable=True)
    status = Column(String(20), nullable=False, default='pendente')
    technician_name = Column(String(150), nullable=False)
    technician_name_2 = Column(String(150), nullable=True)
    signature_date = Column(Date, nullable=True)
    data_relatorio = Column(Date, nullable=True)
    conclusao_texto = Column(Text, nullable=True)
    laudo_y = Column(Integer, nullable=False, server_default='1')
    turno = Column(String(50), nullable=True)
    codigo_esocial = Column(String(50), nullable=True)
    pre_verificacao_db = Column(String(20), nullable=True)
    pos_verificacao_db = Column(String(20), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    company = relationship("Company", back_populates="field_sheets")
    employee = relationship("Employee", back_populates="field_sheets")
    creator = relationship("User")

    @property
    def company_nome(self):
        return self.company.razao_social if self.company else None

    @property
    def employee_nome(self):
        return self.employee.nome if self.employee else self.employee_name_text

    @property
    def employee_funcao(self):
        return self.employee.funcao if self.employee else None

    @property
    def employee_matricula(self):
        return self.employee.matricula if self.employee else None

    @property
    def employee_setor(self):
        return self.employee.setor if self.employee else None

    @property
    def employee_local(self):
        return self.employee.local if self.employee else None

    @property
    def has_sonus(self):
        from app.models.sonus_upload import SonusUpload
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if session is None:
            return False
        return session.query(SonusUpload).filter(SonusUpload.field_sheet_id == self.id).first() is not None

    @property
    def sonus_parsed_name(self):
        from app.models.sonus_upload import SonusUpload
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if session is None:
            return None
        upload = session.query(SonusUpload).filter(SonusUpload.field_sheet_id == self.id).first()
        return upload.parsed_employee_name if upload else None

    @property
    def sonus_name_mismatch(self):
        from app.models.sonus_upload import SonusUpload
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if session is None:
            return False
        upload = session.query(SonusUpload).filter(SonusUpload.field_sheet_id == self.id).first()
        if not upload or not upload.parsed_employee_name:
            return False
        emp_nome = self.employee.nome if self.employee else self.employee_name_text
        if not emp_nome:
            return False
        from app.parser import names_match
        return not names_match(upload.parsed_employee_name, emp_nome)
