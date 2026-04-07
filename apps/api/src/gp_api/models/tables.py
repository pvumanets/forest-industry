from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from gp_api.models.base import Base


class UserRole(StrEnum):
    owner = "owner"
    marketer = "marketer"
    site_manager = "site_manager"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", native_enum=True, values_callable=lambda e: [m.value for m in e]),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(CHAR(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)


class Outlet(Base):
    __tablename__ = "outlets"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    display_name: Mapped[str] = mapped_column(String(255))
    is_virtual: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    sort_order: Mapped[int] = mapped_column(Integer, server_default=text("0"))


class UserOutlet(Base):
    __tablename__ = "user_outlets"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    outlet_id: Mapped[int] = mapped_column(ForeignKey("outlets.id", ondelete="CASCADE"), primary_key=True)


class ReportingWeek(Base):
    __tablename__ = "reporting_weeks"
    __table_args__ = (
        CheckConstraint(
            "EXTRACT(isodow FROM week_start_date) = 1",
            name="ck_reporting_weeks_monday",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    week_start_date: Mapped[date] = mapped_column(Date, unique=True)


class WeeklyOfflineMetric(Base):
    __tablename__ = "weekly_offline_metrics"
    __table_args__ = (UniqueConstraint("week_id", "outlet_id", name="uq_weekly_offline_week_outlet"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("reporting_weeks.id", ondelete="CASCADE"))
    outlet_id: Mapped[int] = mapped_column(ForeignKey("outlets.id", ondelete="RESTRICT"))
    off_rev: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    off_ord: Mapped[int] = mapped_column(Integer)
    off_ret_n: Mapped[int] = mapped_column(Integer)
    off_ret_sum: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    updated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class WeeklyMarketingSite(Base):
    __tablename__ = "weekly_marketing_site"
    __table_args__ = (UniqueConstraint("week_id", name="uq_weekly_marketing_site_week_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("reporting_weeks.id", ondelete="CASCADE"))
    mkt_ad_ctx: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    mkt_ad_map: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    web_beh_bounce: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    web_beh_time: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    updated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class WeeklyWebChannel(Base):
    __tablename__ = "weekly_web_channels"
    __table_args__ = (
        UniqueConstraint("week_id", "channel_key", name="uq_weekly_web_channels_week_channel"),
        CheckConstraint(
            "channel_key IN ('organic', 'cpc_direct', 'direct')",
            name="ck_weekly_web_channels_channel_key",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("reporting_weeks.id", ondelete="CASCADE"))
    channel_key: Mapped[str] = mapped_column(String(32))
    visitors: Mapped[int] = mapped_column(Integer)


MAPS_PLATFORM = SAEnum("2gis", "yandex", name="maps_platform", native_enum=True)


class WeeklyOzon(Base):
    __tablename__ = "weekly_ozon"
    __table_args__ = (UniqueConstraint("week_id", "outlet_id", name="uq_weekly_ozon_week_outlet"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    week_id: Mapped[int] = mapped_column(ForeignKey("reporting_weeks.id", ondelete="CASCADE"))
    outlet_id: Mapped[int] = mapped_column(ForeignKey("outlets.id", ondelete="RESTRICT"))
    oz_rev: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    oz_ord: Mapped[int] = mapped_column(Integer)
    oz_ret_n: Mapped[int] = mapped_column(Integer)
    oz_ret_sum: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    oz_ad_spend: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    updated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class ReputationSnapshot(Base):
    __tablename__ = "reputation_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "outlet_id",
            "platform",
            "snapshot_date",
            name="uq_reputation_outlet_platform_date",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    outlet_id: Mapped[int] = mapped_column(ForeignKey("outlets.id", ondelete="RESTRICT"))
    platform: Mapped[str] = mapped_column(MAPS_PLATFORM)
    snapshot_date: Mapped[date] = mapped_column(Date)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2))
    review_cnt: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
