"""Allow multiple document verifications without skill values.

Revision ID: 009
Revises: 008
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_verifications_student_skill", table_name="verifications")
    op.create_index(
        "ix_verifications_student_skill",
        "verifications",
        ["student_id", "skill"],
        unique=True,
        mssql_where=sa.text("skill IS NOT NULL"),
        sqlite_where=sa.text("skill IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_verifications_student_skill", table_name="verifications")
    op.create_index(
        "ix_verifications_student_skill",
        "verifications",
        ["student_id", "skill"],
        unique=True,
    )
