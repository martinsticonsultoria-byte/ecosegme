"""allow repeated laudo_number per company (merge branches)

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2, f1a2b3c4d5e6
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = ('f7a8b9c0d1e2', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE field_sheets DROP CONSTRAINT IF EXISTS uq_field_sheets_company_laudo_number")


def downgrade() -> None:
    op.create_unique_constraint(
        'uq_field_sheets_company_laudo_number',
        'field_sheets',
        ['company_id', 'laudo_number']
    )
