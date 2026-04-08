"""laudo_number_nullable

Revision ID: 132d5d249712
Revises: 35943bf76957
Create Date: 2026-04-07 22:22:47.007479

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '132d5d249712'
down_revision: Union[str, Sequence[str], None] = '35943bf76957'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('field_sheets', 'laudo_number', nullable=True)


def downgrade() -> None:
    op.alter_column('field_sheets', 'laudo_number', nullable=False)
