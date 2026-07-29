"""add hora_inicial, hora_final, vazao to chemical_field_sheets

Revision ID: q7a8b9c0d1e2
Revises: q6f7a8b9c0d1
Create Date: 2026-07-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'q7a8b9c0d1e2'
down_revision = 'q6f7a8b9c0d1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('chemical_field_sheets', sa.Column('hora_inicial', sa.Time(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('hora_final', sa.Time(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('vazao', sa.Numeric(10, 3), nullable=True))


def downgrade():
    op.drop_column('chemical_field_sheets', 'vazao')
    op.drop_column('chemical_field_sheets', 'hora_final')
    op.drop_column('chemical_field_sheets', 'hora_inicial')
