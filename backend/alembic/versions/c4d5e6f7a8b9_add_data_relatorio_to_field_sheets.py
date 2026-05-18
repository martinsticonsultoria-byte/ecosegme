"""add data_relatorio to field_sheets

Revision ID: c4d5e6f7a8b9
Revises: 132d5d249712
Create Date: 2026-05-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = '132d5d249712'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('field_sheets', sa.Column('data_relatorio', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('field_sheets', 'data_relatorio')
