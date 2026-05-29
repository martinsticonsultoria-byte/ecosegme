"""laudo_number string remove laudo_y

Revision ID: a2b3c4d5e6f7
Revises: f7a8b9c0d1e2
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Dropa constraint unique composta antes de alterar o tipo da coluna
    op.drop_constraint('uq_field_sheets_company_laudo_number', 'field_sheets', type_='unique')

    # Converte laudo_number de INTEGER para VARCHAR(50)
    op.alter_column(
        'field_sheets', 'laudo_number',
        existing_type=sa.Integer(),
        type_=sa.String(50),
        existing_nullable=True,
        postgresql_using='laudo_number::varchar',
    )

    # Remove laudo_y — substituído pela string livre
    op.drop_column('field_sheets', 'laudo_y')

    # Recria constraint unique composta para o novo tipo VARCHAR
    op.create_unique_constraint(
        'uq_field_sheets_company_laudo_number',
        'field_sheets',
        ['company_id', 'laudo_number'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_field_sheets_company_laudo_number', 'field_sheets', type_='unique')

    op.add_column('field_sheets', sa.Column('laudo_y', sa.Integer(), nullable=True))

    op.alter_column(
        'field_sheets', 'laudo_number',
        existing_type=sa.String(50),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="CASE WHEN laudo_number ~ '^[0-9]+$' THEN laudo_number::integer ELSE NULL END",
    )

    op.create_unique_constraint(
        'uq_field_sheets_company_laudo_number',
        'field_sheets',
        ['company_id', 'laudo_number'],
    )
