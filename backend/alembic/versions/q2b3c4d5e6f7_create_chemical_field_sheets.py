"""create_chemical_field_sheets

Revision ID: q2b3c4d5e6f7
Revises: q1a2b3c4d5e6
Create Date: 2026-07-07 00:00:02.000000

Feature Químico — M2: tabela de fichas de campo químicas
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'q2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'q1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chemical_field_sheets',
        sa.Column('id',                  sa.Integer(),        primary_key=True, autoincrement=True),
        sa.Column('company_id',          sa.Integer(),        sa.ForeignKey('companies.id'),  nullable=False),
        sa.Column('technician_name',     sa.String(150),      nullable=False),
        sa.Column('collection_date',     sa.Date(),           nullable=False),
        sa.Column('employee_id',         sa.Integer(),        sa.ForeignKey('employees.id'),  nullable=True),
        sa.Column('employee_name_text',  sa.String(150),      nullable=True),
        sa.Column('funcao',              sa.String(100),      nullable=False),
        sa.Column('matricula',           sa.String(50),       nullable=False),
        sa.Column('setor',               sa.String(150),      nullable=False),
        sa.Column('local',               sa.String(100),      nullable=False),
        sa.Column('numero_amostrador',   sa.String(100),      nullable=False),
        sa.Column('tipo_amostrador',     sa.String(100),      nullable=False),
        sa.Column('situacao_ambiente',   sa.Text(),           nullable=False),
        sa.Column('atividade',           sa.Text(),           nullable=True),
        sa.Column('frequencia',          sa.String(150),      nullable=True),
        sa.Column('tempo_exposicao_h',   sa.Numeric(5, 2),    nullable=True),
        sa.Column('jornada_trabalho',    sa.String(50),       nullable=True),
        sa.Column('volume_ar_amostrado', sa.String(50),       nullable=True),
        sa.Column('epi',                 sa.Text(),           nullable=True),
        sa.Column('observacoes',         sa.Text(),           nullable=True),
        sa.Column('laudo_number',        sa.String(50),       nullable=True),
        sa.Column('laudo_y',             sa.Integer(),        nullable=True),
        sa.Column('tipo_analise',        sa.String(50),       nullable=False, server_default='Químico'),
        sa.Column('status',              sa.String(20),       nullable=False, server_default='pendente'),
        sa.Column('data_relatorio',      sa.Date(),           nullable=True),
        sa.Column('signature_date',      sa.Date(),           nullable=True),
        sa.Column('conclusao_texto',     sa.Text(),           nullable=True),
        sa.Column('created_by',          sa.Integer(),        sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at',          sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chemical_field_sheets_company_id', 'chemical_field_sheets', ['company_id'])
    op.create_index('ix_chemical_field_sheets_status',     'chemical_field_sheets', ['status'])


def downgrade() -> None:
    op.drop_index('ix_chemical_field_sheets_status',     table_name='chemical_field_sheets')
    op.drop_index('ix_chemical_field_sheets_company_id', table_name='chemical_field_sheets')
    op.drop_table('chemical_field_sheets')
