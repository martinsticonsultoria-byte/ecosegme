"""ajustes_v2: tipo_analise, employee_name_text, nullable fields, status

Revision ID: a1c2d3e4f5a6
Revises: fd93756deedb
Create Date: 2026-03-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'fd93756deedb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('field_sheets', sa.Column('tipo_analise', sa.String(length=50), nullable=True))
    op.add_column('field_sheets', sa.Column('employee_name_text', sa.String(length=150), nullable=True))
    op.add_column('field_sheets', sa.Column('status', sa.String(length=20), nullable=False, server_default='pendente'))
    op.alter_column('field_sheets', 'employee_id', nullable=True)
    op.alter_column('field_sheets', 'signature_date', nullable=True)


def downgrade() -> None:
    op.alter_column('field_sheets', 'signature_date', nullable=False)
    op.alter_column('field_sheets', 'employee_id', nullable=False)
    op.drop_column('field_sheets', 'status')
    op.drop_column('field_sheets', 'employee_name_text')
    op.drop_column('field_sheets', 'tipo_analise')
