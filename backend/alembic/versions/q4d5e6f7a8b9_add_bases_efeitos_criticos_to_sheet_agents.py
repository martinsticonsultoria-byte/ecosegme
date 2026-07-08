"""add bases_efeitos_criticos to chemical_sheet_agents

Revision ID: q4d5e6f7a8b9
Revises: q3c4d5e6f7a8
Create Date: 2026-07-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'q4d5e6f7a8b9'
down_revision = 'q3c4d5e6f7a8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chemical_sheet_agents',
        sa.Column('bases_efeitos_criticos', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('chemical_sheet_agents', 'bases_efeitos_criticos')
