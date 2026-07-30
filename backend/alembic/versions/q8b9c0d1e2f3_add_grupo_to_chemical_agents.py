"""add grupo to chemical_agents

Revision ID: q8b9c0d1e2f3
Revises: q7a8b9c0d1e2
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'q8b9c0d1e2f3'
down_revision = 'q7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('chemical_agents', sa.Column('grupo', sa.String(100), nullable=True))
    op.create_index('ix_chemical_agents_grupo', 'chemical_agents', ['grupo'])


def downgrade():
    op.drop_index('ix_chemical_agents_grupo', table_name='chemical_agents')
    op.drop_column('chemical_agents', 'grupo')
