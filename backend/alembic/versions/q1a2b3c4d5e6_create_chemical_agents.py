"""create_chemical_agents

Revision ID: q1a2b3c4d5e6
Revises: d1e2f3a4b5c6
Create Date: 2026-07-07 00:00:01.000000

Feature Químico — M1: tabela de catálogo de agentes químicos
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'q1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chemical_agents',
        sa.Column('id',             sa.Integer(),       primary_key=True, autoincrement=True),
        sa.Column('nome',           sa.String(200),     nullable=False),
        sa.Column('esocial',        sa.String(100),     nullable=True),
        sa.Column('unidade',        sa.String(20),      nullable=True),
        sa.Column('acgih_twa',      sa.String(20),      nullable=True),
        sa.Column('acgih_stel',     sa.String(20),      nullable=True),
        sa.Column('nr15_valor',     sa.String(20),      nullable=True),
        sa.Column('efeito_critico', sa.Text(),          nullable=True),
        sa.Column('amostrador',     sa.String(150),     nullable=True),
        sa.Column('metodo',         sa.String(150),     nullable=True),
        sa.Column('metodo_analise', sa.String(100),     nullable=True),
        sa.Column('vazao',          sa.String(50),      nullable=True),
        sa.Column('volume',         sa.String(50),      nullable=True),
        sa.Column('lq',             sa.String(50),      nullable=True),
        sa.Column('numero_cas',     sa.String(50),      nullable=True),
        sa.Column('updated_at',     sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at',     sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chemical_agents_nome',       'chemical_agents', ['nome'])
    op.create_index('ix_chemical_agents_numero_cas', 'chemical_agents', ['numero_cas'])


def downgrade() -> None:
    op.drop_index('ix_chemical_agents_numero_cas', table_name='chemical_agents')
    op.drop_index('ix_chemical_agents_nome',       table_name='chemical_agents')
    op.drop_table('chemical_agents')
