from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base


class ChemicalAgent(Base):
    __tablename__ = "chemical_agents"

    id             = Column(Integer, primary_key=True, index=True)
    nome           = Column(String(200), nullable=False, index=True)
    esocial        = Column(String(100))        # Código e-Social
    unidade        = Column(String(20))         # ppm, mg/m³, f/cc
    acgih_twa      = Column(String(20))         # TLV-TWA
    acgih_stel     = Column(String(20))         # TLV-STEL
    nr15_valor     = Column(String(20))         # Limite NR-15 (numérico ou '-')
    efeito_critico = Column(Text)               # Bases de Efeitos Críticos
    amostrador     = Column(String(150))        # Tipo de amostrador (ex: Carvão Ativo)
    metodo         = Column(String(150))        # Método analítico (ex: Método NIOSH 1501)
    metodo_analise = Column(String(100))        # Técnica (ex: Cromatografia)
    vazao          = Column(String(50))         # Vazão da bomba
    volume         = Column(String(50))         # Volume de coleta
    lq             = Column(String(50))         # Limite de Quantificação
    numero_cas     = Column(String(50), index=True)
    updated_at     = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())
