"""add_technician_name_2_to_field_sheets

Revision ID: bba37caa8120
Revises: 5827881a361c
Create Date: 2026-03-18 11:24:50.409566

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'bba37caa8120'
down_revision: Union[str, Sequence[str], None] = '5827881a361c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('field_sheets', sa.Column('technician_name_2', sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column('field_sheets', 'technician_name_2')
