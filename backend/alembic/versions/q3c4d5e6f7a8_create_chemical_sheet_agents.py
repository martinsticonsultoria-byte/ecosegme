"""create_chemical_sheet_agents

Revision ID: q3c4d5e6f7a8
Revises: q2b3c4d5e6f7
Create Date: 2026-07-07 00:00:03.000000

Feature Químico — M3: tabela de vínculo ficha ↔ agente (com resultado)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'q3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'q2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chemical_sheet_agents',
        sa.Column('id',                sa.Integer(),       primary_key=True, autoincrement=True),
        sa.Column('chemical_sheet_id', sa.Integer(),
                  sa.ForeignKey('chemical_field_sheets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id',          sa.Integer(),
                  sa.ForeignKey('chemical_agents.id'),                           nullable=False),
        sa.Column('valor_encontrado',  sa.String(50),      nullable=True),
        sa.Column('resultado_status',  sa.String(50),      nullable=True, server_default='pendente'),
        sa.Column('observacao',        sa.Text(),          nullable=True),
        sa.Column('created_at',        sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('chemical_sheet_id', 'agent_id', name='uq_chemical_sheet_agent'),
    )
    op.create_index('ix_chemical_sheet_agents_sheet_id', 'chemical_sheet_agents', ['chemical_sheet_id'])


def downgrade() -> None:
    op.drop_index('ix_chemical_sheet_agents_sheet_id', table_name='chemical_sheet_agents')
    op.drop_table('chemical_sheet_agents')
