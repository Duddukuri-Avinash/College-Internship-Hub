"""Add persistent notifications and user preferences.

Revision ID: 008
Revises: 007
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "notifications",
        "body",
        new_column_name="message",
        existing_type=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        "notifications",
        "notification_type",
        new_column_name="type",
        existing_type=sa.String(length=40),
        type_=sa.String(length=50),
        existing_nullable=False,
    )
    op.add_column(
        "notifications",
        sa.Column("category", sa.String(length=30), nullable=False, server_default="account"),
    )
    op.add_column("notifications", sa.Column("link", sa.String(length=500), nullable=True))
    op.add_column("notifications", sa.Column("read_at", sa.DateTime(), nullable=True))
    op.add_column("notifications", sa.Column("metadata_json", sa.JSON(), nullable=True))
    op.add_column("notifications", sa.Column("dedupe_key", sa.String(length=160), nullable=True))
    op.execute("""
        UPDATE n
        SET user_id = COALESCE(s.user_id, f.user_id)
        FROM notifications n
        LEFT JOIN students s ON s.id = n.student_id
        LEFT JOIN faculty f ON f.id = n.faculty_id
        WHERE n.user_id IS NULL AND COALESCE(s.user_id, f.user_id) IS NOT NULL
    """)
    op.execute("""
        UPDATE notifications
        SET category = CASE LOWER(type)
            WHEN 'application' THEN 'applications'
            WHEN 'experience' THEN 'experiences'
            WHEN 'verification' THEN 'experiences'
            WHEN 'internship' THEN 'internships'
            WHEN 'announcement' THEN 'announcements'
            WHEN 'question' THEN 'questions'
            ELSE 'account'
        END,
        read_at = CASE WHEN is_read = 1 THEN created_at ELSE NULL END
    """)
    op.create_index(
        "ix_notifications_user_read_created",
        "notifications",
        ["user_id", "is_read", "created_at"],
    )
    op.create_index(
        "uq_notifications_user_dedupe",
        "notifications",
        ["user_id", "dedupe_key"],
        unique=True,
        mssql_where=sa.text("dedupe_key IS NOT NULL"),
        sqlite_where=sa.text("dedupe_key IS NOT NULL"),
    )
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("applications", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("experiences", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("internships", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("announcements", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("questions", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("account", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_index("uq_notifications_user_dedupe", table_name="notifications")
    op.drop_index("ix_notifications_user_read_created", table_name="notifications")
    op.drop_column("notifications", "dedupe_key")
    op.drop_column("notifications", "metadata_json")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "link")
    op.drop_column("notifications", "category")
    op.alter_column(
        "notifications",
        "type",
        new_column_name="notification_type",
        existing_type=sa.String(length=50),
        type_=sa.String(length=40),
        existing_nullable=False,
    )
    op.alter_column(
        "notifications",
        "message",
        new_column_name="body",
        existing_type=sa.Text(),
        existing_nullable=False,
    )
