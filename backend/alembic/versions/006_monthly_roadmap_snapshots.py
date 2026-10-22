"""Store monthly market-driven skill roadmap snapshots.

Revision ID: 006
Revises: 005
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roadmap_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("market", sa.String(length=80), nullable=False),
        sa.Column("month", sa.String(length=7), nullable=False),
        sa.Column("roadmaps", sa.JSON(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("market", "month", name="uq_roadmap_snapshot_market_month"),
    )
    op.create_index("ix_roadmap_snapshots_id", "roadmap_snapshots", ["id"])


def downgrade() -> None:
    op.drop_index("ix_roadmap_snapshots_id", table_name="roadmap_snapshots")
    op.drop_table("roadmap_snapshots")