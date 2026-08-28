"""add matricula_tipo to field_sheets

Revision ID: v1a2b3c4d5e6
Revises: u1a2b3c4d5e6
Create Date: 2026-08-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'v1a2b3c4d5e6'
down_revision = 'u1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'field_sheets',
        sa.Column('matricula_tipo', sa.String(20), nullable=False, server_default='matricula')
    )


def downgrade():
    op.drop_column('field_sheets', 'matricula_tipo')
