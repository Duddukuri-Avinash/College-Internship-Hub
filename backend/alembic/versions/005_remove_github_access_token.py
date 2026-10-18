"""Do not persist GitHub OAuth access tokens.

Revision ID: 005
Revises: 004
"""
from __future__ import annotations

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("github_identities", "access_token")


def downgrade() -> None:
    import sqlalchemy as sa

    op.add_column("github_identities", sa.Column("access_token", sa.Text(), nullable=True))
