"""Add automated skill verification storage.

Revision ID: 003
Revises: 002
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("verifications", sa.Column("skill", sa.String(length=120), nullable=True))
    op.add_column("verifications", sa.Column("method", sa.String(length=20), nullable=True))
    op.add_column("verifications", sa.Column("detail", sa.Text(), nullable=True))
    op.add_column("verifications", sa.Column("verified_at", sa.DateTime(), nullable=True))
    op.create_index("ix_verifications_student_skill", "verifications", ["student_id", "skill"], unique=True)
    op.create_table(
        "skill_question_banks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("skill", sa.String(length=120), nullable=False, unique=True),
        sa.Column("questions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_skill_question_banks_skill", "skill_question_banks", ["skill"])
    op.create_table(
        "skill_quiz_attempts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("skill", sa.String(length=120), nullable=False),
        sa.Column("answer_key", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("tab_leaves", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_skill_quiz_attempts_user_id", "skill_quiz_attempts", ["user_id"])
    op.create_index("ix_skill_quiz_attempts_skill", "skill_quiz_attempts", ["skill"])
    op.create_table(
        "skill_quiz_cooldowns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("skill", sa.String(length=120), nullable=False),
        sa.Column("failed_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "skill", name="uq_quiz_cooldown_user_skill"),
    )
    op.create_table(
        "github_identities",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("github_id", sa.String(length=80), nullable=False, unique=True),
        sa.Column("login", sa.String(length=120), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("github_identities")
    op.drop_table("skill_quiz_cooldowns")
    op.drop_index("ix_skill_quiz_attempts_skill", table_name="skill_quiz_attempts")
    op.drop_index("ix_skill_quiz_attempts_user_id", table_name="skill_quiz_attempts")
    op.drop_table("skill_quiz_attempts")
    op.drop_index("ix_skill_question_banks_skill", table_name="skill_question_banks")
    op.drop_table("skill_question_banks")
    op.drop_index("ix_verifications_student_skill", table_name="verifications")
    for column in ("verified_at", "detail", "method", "skill"):
        op.drop_column("verifications", column)
