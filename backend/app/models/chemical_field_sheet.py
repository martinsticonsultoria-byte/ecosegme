from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

_CONCLUSAO_PADRAO = (
    "De acordo com os resultados encontrados é possível afirmar que as concentrações "
    "dos agentes monitorados, encontram-se dentro dos limites exigidos pelas referências "
    "acima, índices esses também aceitos pela Associação Brasileira de Higienistas "
    "Ocupacionais - ABHO e Ministério do Trabalho e Emprego."
)


class ChemicalFieldSheet(Base):
    __tablename__ = "chemical_field_sheets"

    id                  = Column(Integer, primary_key=True, index=True)

    # Empresa e técnico
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=False)
    technician_name     = Column(String(150), nullable=False)
    collection_date     = Column(Date, nullable=False)

    # Funcionário
    employee_id         = Column(Integer, ForeignKey("employees.id"), nullable=True)
    employee_name_text  = Column(String(150))
    funcao              = Column(String(100), nullable=False)
    matricula           = Column(String(50), nullable=False)
    setor               = Column(String(150), nullable=False)
    local               = Column(String(100), nullable=False)

    # Amostragem obrigatória
    numero_amostrador   = Column(String(100), nullable=False)
    tipo_amostrador     = Column(String(100), nullable=False)
    situacao_ambiente   = Column(Text, nullable=False)

    # Campos opcionais
    atividade           = Column(Text)
    frequencia          = Column(String(150))
    tempo_exposicao_h   = Column(Numeric(5, 2))
    jornada_trabalho    = Column(String(50))        # ex: "44 Horas/Semanais"
    volume_ar_amostrado = Column(String(50))        # ex: "12,5 L"
    epi                 = Column(Text)
    observacoes         = Column(Text)

    # Laudo e status
    laudo_number        = Column(String(50))
    laudo_y             = Column(Integer)
    tipo_analise        = Column(String(50), nullable=False, default='Químico')
    status              = Column(String(20), nullable=False, default='pendente')
    data_relatorio      = Column(Date)
    signature_date      = Column(Date)

    # Conclusão — pré-preenchida; editável pelo admin na Conferência
    conclusao_texto     = Column(Text, default=_CONCLUSAO_PADRAO)

    created_by          = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    company  = relationship("Company")
    employee = relationship("Employee")
    creator  = relationship("User")
    agents   = relationship(
        "ChemicalSheetAgent",
        back_populates="sheet",
        cascade="all, delete-orphan",
        order_by="ChemicalSheetAgent.id"
    )

    # Propriedades calculadas
    @property
    def employee_nome(self):
        return self.employee.nome if self.employee else self.employee_name_text

    @property
    def company_nome(self):
        return self.company.razao_social if self.company else None
