"""seed predefined EPIs into custom_epis (unifies list so all items are deletable)

Revision ID: u1a2b3c4d5e6
Revises: t1a2b3c4d5e6
Create Date: 2026-08-27

"""
from alembic import op
import sqlalchemy as sa

revision = 'u1a2b3c4d5e6'
down_revision = 't1a2b3c4d5e6'
branch_labels = None
depends_on = None

PREDEFINED = [
    "Protetor Auricular - Plug de Inserção",
    "Protetor Auricular - Tipo Concha",
    "Protetor Auricular - Semi-auricular",
    "Capacete de Segurança",
    "Óculos de Proteção",
    "Luvas de Proteção",
    "Abafador de Ruído",
    "Máscara de Proteção Respiratória",
    "Calçado de Segurança",
    "Ausência de EPI",
]


def upgrade():
    conn = op.get_bind()
    custom_epis = sa.table('custom_epis', sa.column('name', sa.String))
    existing = {row[0] for row in conn.execute(sa.text("SELECT name FROM custom_epis")).fetchall()}
    novos = [{"name": nome} for nome in PREDEFINED if nome not in existing]
    if novos:
        op.bulk_insert(custom_epis, novos)


def downgrade():
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM custom_epis WHERE name IN :nomes AND created_by IS NULL").bindparams(
            sa.bindparam("nomes", expanding=True)
        ),
        {"nomes": PREDEFINED},
    )
