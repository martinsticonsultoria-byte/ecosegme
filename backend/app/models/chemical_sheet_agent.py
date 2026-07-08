from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ChemicalSheetAgent(Base):
    """Vincula um ChemicalAgent a uma ChemicalFieldSheet com o resultado da medição."""
    __tablename__ = "chemical_sheet_agents"

    id                = Column(Integer, primary_key=True, index=True)
    chemical_sheet_id = Column(
        Integer,
        ForeignKey("chemical_field_sheets.id", ondelete="CASCADE"),
        nullable=False
    )
    agent_id          = Column(Integer, ForeignKey("chemical_agents.id"), nullable=False)

    # Resultado da medição
    valor_encontrado  = Column(String(50))   # ex: "0,045" ou "< 0,011"
    resultado_status  = Column(String(50), default='pendente')
    # Valores possíveis: pendente | dentro_limite | acima_limite | nao_detectado

    observacao        = Column(Text)
    created_at        = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('chemical_sheet_id', 'agent_id'),)

    sheet = relationship("ChemicalFieldSheet", back_populates="agents")
    agent = relationship("ChemicalAgent")
