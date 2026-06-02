"""fix laudo_number unique constraint per company

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-05-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove a constraint única global de laudo_number
    op.drop_constraint('field_sheets_laudo_number_key', 'field_sheets', type_='unique')
    # Adiciona constraint única por empresa — idempotente
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_field_sheets_company_laudo_number'
            ) THEN
                ALTER TABLE field_sheets
                ADD CONSTRAINT uq_field_sheets_company_laudo_number
                UNIQUE (company_id, laudo_number);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.drop_constraint('uq_field_sheets_company_laudo_number', 'field_sheets', type_='unique')
    op.create_unique_constraint('field_sheets_laudo_number_key', 'field_sheets', ['laudo_number'])
