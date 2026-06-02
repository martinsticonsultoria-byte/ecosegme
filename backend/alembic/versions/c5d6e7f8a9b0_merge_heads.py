"""merge heads

Revision ID: c5d6e7f8a9b0
Revises: a1b2c3d4e5f6, a2b3c4d5e6f7
Create Date: 2026-06-02 14:00:00.000000

"""
from typing import Sequence, Union

revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'a2b3c4d5e6f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
