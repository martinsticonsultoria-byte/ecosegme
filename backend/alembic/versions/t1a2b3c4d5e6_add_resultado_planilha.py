"""add resultado_planilha to chemical_agents

Revision ID: t1a2b3c4d5e6
Revises: s1a2b3c4d5e6
Create Date: 2026-08-27

"""
from alembic import op
import sqlalchemy as sa

revision = 't1a2b3c4d5e6'
down_revision = 's1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chemical_agents',
        sa.Column('resultado_planilha', sa.String(50), nullable=True)
    )


def downgrade():
    op.drop_column('chemical_agents', 'resultado_planilha')
