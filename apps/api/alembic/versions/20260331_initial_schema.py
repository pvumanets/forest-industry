"""initial_schema: enums, all v1 tables, constraints.

Revision ID: 20260331_initial
Revises:
Create Date: 2026-03-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260331_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE TYPE user_role AS ENUM ('owner', 'marketer', 'site_manager')"))
    op.execute(sa.text("CREATE TYPE maps_platform AS ENUM ('2gis', 'yandex')"))

    user_role = postgresql.ENUM(
        "owner",
        "marketer",
        "site_manager",
        name="user_role",
        create_type=False,
    )
    maps_platform = postgresql.ENUM("2gis", "yandex", name="maps_platform", create_type=False)

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("login", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("login", name="uq_users_login"),
    )

    op.create_table(
        "user_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.CHAR(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_user_sessions_token_hash"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"], unique=False)

    op.create_table(
        "outlets",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("is_virtual", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.UniqueConstraint("code", name="uq_outlets_code"),
    )

    op.create_table(
        "user_outlets",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("outlet_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "outlet_id", name="pk_user_outlets"),
    )

    op.create_table(
        "reporting_weeks",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("week_start_date", sa.Date(), nullable=False),
        sa.UniqueConstraint("week_start_date", name="uq_reporting_weeks_week_start_date"),
        sa.CheckConstraint(
            "EXTRACT(isodow FROM week_start_date) = 1",
            name="ck_reporting_weeks_monday",
        ),
    )

    op.create_table(
        "weekly_offline_metrics",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("week_id", sa.BigInteger(), nullable=False),
        sa.Column("outlet_id", sa.BigInteger(), nullable=False),
        sa.Column("off_rev", sa.Numeric(14, 2), nullable=False),
        sa.Column("off_ord", sa.Integer(), nullable=False),
        sa.Column("off_ret_n", sa.Integer(), nullable=False),
        sa.Column("off_ret_sum", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("updated_by_user_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["week_id"], ["reporting_weeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("week_id", "outlet_id", name="uq_weekly_offline_week_outlet"),
    )

    op.create_table(
        "weekly_marketing_site",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("week_id", sa.BigInteger(), nullable=False),
        sa.Column("mkt_ad_ctx", sa.Numeric(14, 2), nullable=False),
        sa.Column("mkt_ad_map", sa.Numeric(14, 2), nullable=False),
        sa.Column("web_beh_bounce", sa.Numeric(5, 2), nullable=False),
        sa.Column("web_beh_time", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("updated_by_user_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["week_id"], ["reporting_weeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("week_id", name="uq_weekly_marketing_site_week_id"),
    )

    op.create_table(
        "weekly_web_channels",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("week_id", sa.BigInteger(), nullable=False),
        sa.Column("channel_key", sa.String(length=32), nullable=False),
        sa.Column("visitors", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["week_id"], ["reporting_weeks.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("week_id", "channel_key", name="uq_weekly_web_channels_week_channel"),
        sa.CheckConstraint(
            "channel_key IN ('organic', 'cpc_direct', 'direct')",
            name="ck_weekly_web_channels_channel_key",
        ),
    )

    op.create_table(
        "weekly_ozon",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("week_id", sa.BigInteger(), nullable=False),
        sa.Column("outlet_id", sa.BigInteger(), nullable=False),
        sa.Column("oz_rev", sa.Numeric(14, 2), nullable=False),
        sa.Column("oz_ord", sa.Integer(), nullable=False),
        sa.Column("oz_ret_n", sa.Integer(), nullable=False),
        sa.Column("oz_ret_sum", sa.Numeric(14, 2), nullable=False),
        sa.Column("oz_ad_spend", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("updated_by_user_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["week_id"], ["reporting_weeks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("week_id", "outlet_id", name="uq_weekly_ozon_week_outlet"),
    )

    op.create_table(
        "reputation_snapshots",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("outlet_id", sa.BigInteger(), nullable=False),
        sa.Column("platform", maps_platform, nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("rating", sa.Numeric(3, 2), nullable=False),
        sa.Column("review_cnt", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by_user_id", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(["outlet_id"], ["outlets.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint(
            "outlet_id",
            "platform",
            "snapshot_date",
            name="uq_reputation_outlet_platform_date",
        ),
    )
    op.create_index(
        "ix_reputation_outlet_platform_date",
        "reputation_snapshots",
        ["outlet_id", "platform", "snapshot_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reputation_outlet_platform_date", table_name="reputation_snapshots")
    op.drop_table("reputation_snapshots")
    op.drop_table("weekly_ozon")
    op.drop_table("weekly_web_channels")
    op.drop_table("weekly_marketing_site")
    op.drop_table("weekly_offline_metrics")
    op.drop_table("reporting_weeks")
    op.drop_table("user_outlets")
    op.drop_table("outlets")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("users")
    op.execute(sa.text("DROP TYPE maps_platform"))
    op.execute(sa.text("DROP TYPE user_role"))
