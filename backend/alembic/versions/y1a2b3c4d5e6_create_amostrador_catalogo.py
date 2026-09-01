"""create amostrador_catalogo (catálogo de Nº e Tipo de amostrador da ficha química)

Revision ID: y1a2b3c4d5e6
Revises: x1a2b3c4d5e6
Create Date: 2026-09-01

"""
from alembic import op
import sqlalchemy as sa

revision = 'y1a2b3c4d5e6'
down_revision = 'x1a2b3c4d5e6'
branch_labels = None
depends_on = None

TIPOS_PREDEFINIDOS = [
    'Tubo de Carvão Ativado',
    'K7',
    'Tubo de Sílica Gel',
]


def upgrade():
    op.create_table(
        'amostrador_catalogo',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('categoria', sa.String(length=20), nullable=False),
        sa.Column('valor', sa.String(length=150), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('categoria', 'valor', name='uq_amostrador_categoria_valor'),
    )
    op.create_index(op.f('ix_amostrador_catalogo_id'), 'amostrador_catalogo', ['id'])

    conn = op.get_bind()
    tabela = sa.table(
        'amostrador_catalogo',
        sa.column('categoria', sa.String),
        sa.column('valor', sa.String),
    )

    # Seed 1 — os tipos que hoje são fixos no <select> do formulário
    novos = [{"categoria": "tipo", "valor": v} for v in TIPOS_PREDEFINIDOS]

    # Seed 2 — números de amostrador já usados nas fichas químicas existentes
    existentes = conn.execute(sa.text(
        "SELECT DISTINCT numero_amostrador FROM chemical_field_sheets "
        "WHERE numero_amostrador IS NOT NULL AND TRIM(numero_amostrador) <> ''"
    )).fetchall()
    vistos = set()
    for row in existentes:
        valor = (row[0] or '').strip()
        if valor and valor not in vistos:
            vistos.add(valor)
            novos.append({"categoria": "numero", "valor": valor[:150]})

    if novos:
        op.bulk_insert(tabela, novos)


def downgrade():
    op.drop_index(op.f('ix_amostrador_catalogo_id'), table_name='amostrador_catalogo')
    op.drop_table('amostrador_catalogo')
