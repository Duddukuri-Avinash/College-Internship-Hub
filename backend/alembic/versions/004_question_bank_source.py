"""Store the provenance of each skill question bank.

Revision ID: 004
Revises: 003
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "skill_question_banks",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="curated"),
    )
    op.alter_column("skill_question_banks", "source", server_default=None)


def downgrade() -> None:
    op.drop_column("skill_question_banks", "source")
