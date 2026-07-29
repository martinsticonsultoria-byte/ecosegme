"""drop atividade, frequencia, tempo_exposicao_h, volume_ar_amostrado, epi from chemical_field_sheets

Revision ID: q6f7a8b9c0d1
Revises: q5e6f7a8b9c0
Create Date: 2026-07-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'q6f7a8b9c0d1'
down_revision = 'q5e6f7a8b9c0'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('chemical_field_sheets', 'atividade')
    op.drop_column('chemical_field_sheets', 'frequencia')
    op.drop_column('chemical_field_sheets', 'tempo_exposicao_h')
    op.drop_column('chemical_field_sheets', 'volume_ar_amostrado')
    op.drop_column('chemical_field_sheets', 'epi')


def downgrade():
    op.add_column('chemical_field_sheets', sa.Column('epi', sa.Text(), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('volume_ar_amostrado', sa.String(50), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('tempo_exposicao_h', sa.Numeric(5, 2), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('frequencia', sa.String(150), nullable=True))
    op.add_column('chemical_field_sheets', sa.Column('atividade', sa.Text(), nullable=True))
