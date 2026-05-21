"""remove unique constraint from laudo_number

Revision ID: f1a2b3c4d5e6
Revises: e6f7a8b9c0d1
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE field_sheets DROP CONSTRAINT IF EXISTS field_sheets_laudo_number_key")


def downgrade() -> None:
    op.create_unique_constraint('field_sheets_laudo_number_key', 'field_sheets', ['laudo_number'])
