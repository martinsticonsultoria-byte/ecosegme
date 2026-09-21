"""add sheet_ids to consolidated_reports (fichas que compõem o PDF, para edição)

Revision ID: z1a2b3c4d5e6
Revises: y1a2b3c4d5e6
Create Date: 2026-09-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'z1a2b3c4d5e6'
down_revision = 'y1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('consolidated_reports', sa.Column('sheet_ids', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('consolidated_reports', 'sheet_ids')
