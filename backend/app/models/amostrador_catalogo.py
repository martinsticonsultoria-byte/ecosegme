from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class AmostradorCatalogo(Base):
    """Catálogo genérico de valores dos campos de amostrador da ficha química.

    categoria = 'numero' (Nº do Amostrador) ou 'tipo' (Tipo de Amostrador).
    """
    __tablename__ = "amostrador_catalogo"
    __table_args__ = (
        UniqueConstraint("categoria", "valor", name="uq_amostrador_categoria_valor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String(20), nullable=False)
    valor = Column(String(150), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
