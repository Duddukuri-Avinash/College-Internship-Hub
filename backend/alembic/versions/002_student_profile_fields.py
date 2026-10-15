"""Add student profile fields used by the web application.

Revision ID: 002
Revises: 001
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("branch", sa.String(length=120), nullable=False, server_default="Unassigned"))
    op.add_column("students", sa.Column("skills", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("students", sa.Column("programming_languages", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("students", sa.Column("tools", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("students", sa.Column("certifications", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("students", sa.Column("linked_in", sa.String(length=500), nullable=True))
    op.add_column("students", sa.Column("github", sa.String(length=500), nullable=True))
    op.add_column("students", sa.Column("preferred_domain", sa.String(length=150), nullable=True))
    op.add_column("students", sa.Column("preferred_mode", sa.String(length=40), nullable=True))
    op.add_column("students", sa.Column("preferred_location", sa.String(length=150), nullable=True))


def downgrade() -> None:
    for column in (
        "preferred_location",
        "preferred_mode",
        "preferred_domain",
        "github",
        "linked_in",
        "certifications",
        "tools",
        "programming_languages",
        "skills",
        "branch",
    ):
        op.drop_column("students", column)
