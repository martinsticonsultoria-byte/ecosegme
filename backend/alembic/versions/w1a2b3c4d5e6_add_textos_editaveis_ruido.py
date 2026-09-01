"""add textos editaveis (equipamentos / config dosimetro) to field_sheets

Revision ID: w1a2b3c4d5e6
Revises: v1a2b3c4d5e6
Create Date: 2026-09-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'w1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'v1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('field_sheets', sa.Column('equipamentos_texto', sa.Text(), nullable=True))
    op.add_column('field_sheets', sa.Column('config_dosimetro_texto', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('field_sheets', 'config_dosimetro_texto')
    op.drop_column('field_sheets', 'equipamentos_texto')
