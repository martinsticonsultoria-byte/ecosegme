"""add textos editaveis (objetivo / abreviacoes / notas / referencias) to chemical_field_sheets

Revision ID: x1a2b3c4d5e6
Revises: w1a2b3c4d5e6
Create Date: 2026-09-01 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'x1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'w1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chemical_field_sheets', sa.Column('objetivo_texto', sa.Text(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('abreviacoes_texto', sa.Text(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('notas_texto', sa.Text(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('referencias_texto', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chemical_field_sheets', 'referencias_texto')
    op.drop_column('chemical_field_sheets', 'notas_texto')
    op.drop_column('chemical_field_sheets', 'abreviacoes_texto')
    op.drop_column('chemical_field_sheets', 'objetivo_texto')
