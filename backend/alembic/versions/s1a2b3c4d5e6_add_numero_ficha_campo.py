"""add numero_ficha_campo to chemical_field_sheets

Revision ID: s1a2b3c4d5e6
Revises: r1a2b3c4d5e6
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = 's1a2b3c4d5e6'
down_revision = 'r1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chemical_field_sheets',
        sa.Column('numero_ficha_campo', sa.String(50), nullable=True)
    )


def downgrade():
    op.drop_column('chemical_field_sheets', 'numero_ficha_campo')
