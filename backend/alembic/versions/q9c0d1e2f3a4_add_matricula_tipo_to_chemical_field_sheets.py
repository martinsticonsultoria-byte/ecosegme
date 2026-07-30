"""add matricula_tipo to chemical_field_sheets

Revision ID: q9c0d1e2f3a4
Revises: q8b9c0d1e2f3
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'q9c0d1e2f3a4'
down_revision = 'q8b9c0d1e2f3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chemical_field_sheets',
        sa.Column('matricula_tipo', sa.String(20), nullable=False, server_default='matricula')
    )


def downgrade():
    op.drop_column('chemical_field_sheets', 'matricula_tipo')
