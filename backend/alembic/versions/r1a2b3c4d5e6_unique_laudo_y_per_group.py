"""unique constraint on (company_id, laudo_number, laudo_y) — ruido e quimico

Impede duplicidade de sufixo .y dentro do mesmo grupo de laudo. A geracao
do .y ja foi corrigida no codigo (MAX+1 em vez de COUNT+1, que gerava
duplicatas sempre que uma ficha aprovada era excluida), mas essa
constraint garante a regra tambem no banco -- inclusive contra corridas
de aprovacao simultanea, que o codigo sozinho nao blinda 100%.

Antes de criar a constraint, renumera (por empresa+laudo_number, em ordem
de criacao) qualquer duplicata que ja exista, pra migracao nao falhar em
producao com dados ja duplicados.

Revision ID: r1a2b3c4d5e6
Revises: q9c0d1e2f3a4
Create Date: 2026-08-05

"""
from alembic import op


revision = 'r1a2b3c4d5e6'
down_revision = 'q9c0d1e2f3a4'
branch_labels = None
depends_on = None


def upgrade():
    # field_sheets (Ruido)
    op.execute("""
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY company_id, laudo_number
                       ORDER BY signature_date NULLS LAST, id
                   ) AS novo_y
            FROM field_sheets
            WHERE laudo_y IS NOT NULL
        )
        UPDATE field_sheets f
        SET laudo_y = ranked.novo_y
        FROM ranked
        WHERE f.id = ranked.id AND f.laudo_y IS DISTINCT FROM ranked.novo_y
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_field_sheets_company_laudo_y
        ON field_sheets (company_id, laudo_number, laudo_y)
        WHERE laudo_y IS NOT NULL
    """)

    # chemical_field_sheets (Quimico)
    op.execute("""
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY company_id, laudo_number
                       ORDER BY signature_date NULLS LAST, id
                   ) AS novo_y
            FROM chemical_field_sheets
            WHERE laudo_y IS NOT NULL
        )
        UPDATE chemical_field_sheets f
        SET laudo_y = ranked.novo_y
        FROM ranked
        WHERE f.id = ranked.id AND f.laudo_y IS DISTINCT FROM ranked.novo_y
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_chemical_field_sheets_company_laudo_y
        ON chemical_field_sheets (company_id, laudo_number, laudo_y)
        WHERE laudo_y IS NOT NULL
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS uq_field_sheets_company_laudo_y")
    op.execute("DROP INDEX IF EXISTS uq_chemical_field_sheets_company_laudo_y")
