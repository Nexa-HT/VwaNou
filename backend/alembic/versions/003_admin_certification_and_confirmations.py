"""Add certification requests and report confirmations.

Revision ID: 003_admin_cert
Revises: 002_add_user_password_hash
Create Date: 2026-03-31 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "003_admin_cert"
down_revision = "002_add_user_password_hash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "certification_requests" not in table_names:
        op.create_table(
            "certification_requests",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("profession", sa.String(length=120), nullable=False),
            sa.Column("organization", sa.String(length=160), nullable=True),
            sa.Column("proof_url", sa.String(length=500), nullable=False),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("admin_note", sa.Text(), nullable=True),
            sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if "report_confirmations" not in table_names:
        op.create_table(
            "report_confirmations",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("report_id", "user_id", name="uq_report_confirmations_report_user"),
        )
    else:
        constraints = {item["name"] for item in inspector.get_unique_constraints("report_confirmations")}
        if "uq_report_confirmations_report_user" not in constraints:
            op.create_unique_constraint(
                "uq_report_confirmations_report_user",
                "report_confirmations",
                ["report_id", "user_id"],
            )


def downgrade() -> None:
    op.drop_table("report_confirmations")
    op.drop_table("certification_requests")
