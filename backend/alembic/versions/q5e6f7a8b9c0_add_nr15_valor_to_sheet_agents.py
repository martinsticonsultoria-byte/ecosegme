"""add nr15_valor to chemical_sheet_agents

Revision ID: q5e6f7a8b9c0
Revises: q4d5e6f7a8b9
Create Date: 2026-07-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'q5e6f7a8b9c0'
down_revision = 'q4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chemical_sheet_agents',
        sa.Column('nr15_valor', sa.String(20), nullable=True)
    )


def downgrade():
    op.drop_column('chemical_sheet_agents', 'nr15_valor')
