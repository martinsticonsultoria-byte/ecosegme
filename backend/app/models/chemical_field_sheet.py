from datetime import datetime as _datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Time, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

_CONCLUSAO_PADRAO = (
    "De acordo com os resultados encontrados é possível afirmar que as concentrações "
    "dos agentes monitorados, encontram-se dentro dos limites exigidos pelas referências "
    "acima, índices esses também aceitos pela Associação Brasileira de Higienistas "
    "Ocupacionais - ABHO e Ministério do Trabalho e Emprego."
)

_OBJETIVO_PADRAO = (
    "A avaliação de agentes químicos no ambiente de trabalho tem como objetivo identificar "
    "e avaliar os riscos associados à exposição a substâncias químicas no local de trabalho, "
    "visando à prevenção de doenças ocupacionais e à promoção da saúde e segurança dos "
    "trabalhadores.\n\n"
    "Os agentes químicos presentes no ambiente de trabalho podem incluir substâncias tóxicas, "
    "irritantes, corrosivas, inflamáveis, cancerígenas, entre outras. A exposição a esses "
    "agentes pode ocorrer por inalação, contato dérmico ou ingestão, e pode levar a uma série "
    "de efeitos adversos à saúde, como irritação das vias respiratórias, danos ao sistema "
    "nervoso, câncer, entre outros.\n\n"
    "Este trabalho visa atender, principalmente, às recomendações do Programa de Gerenciamento "
    "de Riscos - PGR e a Norma Regulamentadora N.15 - Atividades e Operações Insalubres da "
    "Portaria 3.214 do Ministério do Trabalho.\n\n"
    "Em resumo, o objetivo da avaliação de agentes químicos no ambiente de trabalho é garantir "
    "a saúde e segurança dos trabalhadores, identificando os riscos relacionados à exposição a "
    "substâncias químicas e implementando medidas de controle eficazes para prevenir doenças "
    "ocupacionais."
)

_ABREVIACOES_PADRAO = "\n".join([
    "ACGIH: American Conference of Governmental Industrial Hygienists",
    "Card: Cardíaco",
    "COHb-emia: Carboxihemoglobinemia",
    "Compr: Comprometimento",
    "Convul: Convulsão",
    "Dan: Dano",
    "Efe: Efeitos",
    "Form: Formação",
    "Fun: Função",
    "GI: Gastrointestinal",
    "Hb: Hemoglobina",
    "Inib: Inibição",
    "Irr: Irritação",
    "MeHb-emia: Metahemoglobinemia",
    "Pulm: Pulmonar",
    "Repro: Reprodutivo",
    "Resp: Respiratório",
    "Sens: Sensibilização",
    "SNC: Sistema Nervoso Central",
    "SNP: Sistema Nervoso Periférico",
    "TRI: Trato Respiratório inferior",
    "N.C: Não Cadastrado",
    "TRS: Trato respiratório superior",
])

_NOTAS_PADRAO = (
    "Foram utilizados os dados fornecidos pelo interessado. O resultado de cada parâmetro está "
    "em função do volume de ar amostrado. Equipamento Utilizado na Coleta: Bomba Gravimétrica. "
    "Os resultados são válidos exclusivamente para a amostra analisada. Códigos retirados da "
    "\"Tabela 24: Agentes Nocivos e Atividades - Aposentadoria Especial\" do eSocial "
    "Versão S-1.0 de 2021."
)

_REFERENCIAS_PADRAO = "\n".join([
    "Valores Limites de Exposição TLV-TWA da American Conference of Governmental Industrial Hygienists - ACGIH.",
    "Norma Regulamentadora - NR 15.",
    "Ministério do Trabalho e Emprego - MTE.",
    "Nacional Institute for Occupational Safety and Health - NIOSH (Instituto Nacional de Segurança e Saúde Ocupacional).",
    "OSHA - Occupational Safety and Health Administration.",
])


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
    matricula_tipo      = Column(String(20), nullable=False, default='matricula')  # 'matricula' ou 'cpf'
    setor               = Column(String(150), nullable=False)
    local               = Column(String(100), nullable=False)

    # Controle interno — não aparece no relatório final, só na base de registro
    numero_ficha_campo  = Column(String(50))

    # Amostragem obrigatória
    numero_amostrador   = Column(String(100), nullable=False)
    tipo_amostrador     = Column(String(100), nullable=False)
    situacao_ambiente   = Column(Text, nullable=False)

    # Campos opcionais
    jornada_trabalho    = Column(String(50))        # ex: "44 Horas/Semanais"
    observacoes         = Column(Text)

    # Cálculo de volume de amostragem (L) — vazão (L/min) x tempo (min)
    hora_inicial        = Column(Time)
    hora_final          = Column(Time)
    vazao               = Column(Numeric(10, 3))    # L/min

    # Laudo e status
    laudo_number        = Column(String(50))
    laudo_y             = Column(Integer)
    tipo_analise        = Column(String(50), nullable=False, default='Químico')
    status              = Column(String(20), nullable=False, default='pendente')
    data_relatorio      = Column(Date)
    signature_date      = Column(Date)

    # Conclusão — pré-preenchida; editável pelo admin na Conferência
    conclusao_texto     = Column(Text, default=_CONCLUSAO_PADRAO)

    # Textos institucionais — pré-preenchidos; editáveis pelo admin na Conferência
    objetivo_texto      = Column(Text, default=_OBJETIVO_PADRAO)
    abreviacoes_texto   = Column(Text, default=_ABREVIACOES_PADRAO)
    notas_texto         = Column(Text, default=_NOTAS_PADRAO)
    referencias_texto   = Column(Text, default=_REFERENCIAS_PADRAO)

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

    @property
    def volume_calculado(self):
        """Volume de ar amostrado (L) = vazão (L/min) x intervalo (min).
        Assume horário final no mesmo dia; se cruzar a meia-noite, soma 24h."""
        if not (self.hora_inicial and self.hora_final and self.vazao is not None):
            return None
        inicio = _datetime.combine(_datetime.today(), self.hora_inicial)
        fim = _datetime.combine(_datetime.today(), self.hora_final)
        minutos = (fim - inicio).total_seconds() / 60
        if minutos < 0:
            minutos += 24 * 60
        return round(float(self.vazao) * minutos, 2)
