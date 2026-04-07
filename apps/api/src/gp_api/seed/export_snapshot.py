"""Выгрузка синтетических данных в JSON: из БД или как задано формулами сида (без Postgres)."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import inspect as sa_inspect
from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.db.sync import get_engine
from gp_api.models import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    User,
    UserOutlet,
    UserSession,
    WeeklyMarketingSite,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)
from gp_api.seed.data import (
    CHANNEL_KEYS,
    MARKETING_SITE_WEEKLY,
    NOVOGRAD_OFFLINE_WEEKLY,
    OUTLET_SEEDS,
    OZON_WEEKLY,
    REPUTATION_BY_WEEK,
    REPUTATION_SNAPSHOT_DATES,
    SVERDLOV_OFFLINE_WEEKLY,
    USER_SEEDS,
    WEEK_STARTS,
    channel_visitors,
)


def _json_serialize(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, bool | int | float | str):
        return val
    if isinstance(val, Decimal):
        return format(val, "f")
    if isinstance(val, date) and not isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, UUID):
        return str(val)
    if isinstance(val, Enum):
        return val.value
    if is_dataclass(val):
        return asdict(val)
    msg = f"Неподдерживаемый тип для JSON: {type(val)!r}"
    raise TypeError(msg)


def _orm_to_dict(obj: Any, *, redact_keys: frozenset[str] | None = None) -> dict[str, Any]:
    redact_keys = redact_keys or frozenset()
    out: dict[str, Any] = {}
    for col in sa_inspect(obj).mapper.column_attrs:
        key = col.key
        if key in redact_keys:
            out[key] = "[REDACTED]"
            continue
        out[key] = _json_serialize(getattr(obj, key))
    return out


def build_snapshot_from_code() -> dict[str, Any]:
    """Те же числа и строки, что пишет run_seed(), без обращения к БД."""
    outlets = [
        {"code": c, "display_name": n, "is_virtual": v, "sort_order": s}
        for c, n, v, s in OUTLET_SEEDS
    ]
    users = [
        {
            "login": login,
            "display_name": display_name,
            "role": role_s,
            "is_active": True,
            "password_hash": "[не выгружается — задаётся при сиде, см. seed/passwords.py]",
        }
        for login, display_name, role_s in USER_SEEDS
    ]
    user_outlets = [
        {"user_login": "manager", "outlet_code": "NOVOGRAD"},
        {"user_login": "manager", "outlet_code": "SVERDLOV"},
    ]
    reporting_weeks = [{"week_start_date": wd.isoformat()} for wd in WEEK_STARTS]

    nov_code, sver_code, ozon_code = "NOVOGRAD", "SVERDLOV", "OZON"

    weekly_offline: list[dict[str, Any]] = []
    weekly_marketing_site: list[dict[str, Any]] = []
    weekly_web_channels: list[dict[str, Any]] = []
    weekly_ozon: list[dict[str, Any]] = []
    reputation_snapshots: list[dict[str, Any]] = []

    for i, wd in enumerate(WEEK_STARTS):
        wd_s = wd.isoformat()

        for outlet_code, row in (
            (nov_code, NOVOGRAD_OFFLINE_WEEKLY[i]),
            (sver_code, SVERDLOV_OFFLINE_WEEKLY[i]),
        ):
            rev, ord_n, rn, rs = row
            weekly_offline.append(
                {
                    "week_start_date": wd_s,
                    "outlet_code": outlet_code,
                    "off_rev": _json_serialize(rev),
                    "off_ord": ord_n,
                    "off_ret_n": rn,
                    "off_ret_sum": _json_serialize(rs),
                },
            )

        ctx, mmap, bounce, time_s = MARKETING_SITE_WEEKLY[i]
        weekly_marketing_site.append(
            {
                "week_start_date": wd_s,
                "mkt_ad_ctx": _json_serialize(ctx),
                "mkt_ad_map": _json_serialize(mmap),
                "web_beh_bounce": _json_serialize(bounce),
                "web_beh_time": _json_serialize(time_s),
            },
        )

        for ch in CHANNEL_KEYS:
            vis = channel_visitors(i, ch)
            weekly_web_channels.append(
                {"week_start_date": wd_s, "channel_key": ch, "visitors": vis},
            )

        oz_r, oz_ord, oz_rn, oz_rs, oz_ad = OZON_WEEKLY[i]
        weekly_ozon.append(
            {
                "week_start_date": wd_s,
                "outlet_code": ozon_code,
                "oz_rev": _json_serialize(oz_r),
                "oz_ord": oz_ord,
                "oz_ret_n": oz_rn,
                "oz_ret_sum": _json_serialize(oz_rs),
                "oz_ad_spend": _json_serialize(oz_ad),
            },
        )

        snap_s = REPUTATION_SNAPSHOT_DATES[i].isoformat()
        for platform in ("2gis", "yandex"):
            for oid_code in (nov_code, sver_code):
                rating, reviews = REPUTATION_BY_WEEK[i][(oid_code, platform)]
                reputation_snapshots.append(
                    {
                        "outlet_code": oid_code,
                        "platform": platform,
                        "snapshot_date": snap_s,
                        "rating": _json_serialize(rating),
                        "review_cnt": reviews,
                    },
                )

    return {
        "source": "seed_code",
        "note": "Совпадает с тем, что кладёт run_seed() при пустой БД. Ключи outlet_code / week_start_date вместо id.",
        "outlets": outlets,
        "users": users,
        "user_outlets": user_outlets,
        "reporting_weeks": reporting_weeks,
        "weekly_offline_metrics": weekly_offline,
        "weekly_marketing_site": weekly_marketing_site,
        "weekly_web_channels": weekly_web_channels,
        "weekly_ozon": weekly_ozon,
        "reputation_snapshots": reputation_snapshots,
        "_reference_functions": {
            "formulas": "gp_api/seed/data.py",
            "insert_logic": "gp_api/seed/cli.py",
        },
    }


def build_snapshot_from_db() -> dict[str, Any]:
    engine = get_engine()
    redact = frozenset({"password_hash", "token_hash"})
    with Session(engine) as session:
        outlets = [
            _orm_to_dict(r) for r in session.scalars(select(Outlet).order_by(Outlet.id)).all()
        ]
        users = [
            _orm_to_dict(r, redact_keys=redact)
            for r in session.scalars(select(User).order_by(User.id)).all()
        ]
        user_outlets = [
            _orm_to_dict(r)
            for r in session.scalars(select(UserOutlet).order_by(UserOutlet.user_id)).all()
        ]
        weeks = [
            _orm_to_dict(r)
            for r in session.scalars(select(ReportingWeek).order_by(ReportingWeek.id)).all()
        ]
        off_m = [
            _orm_to_dict(r)
            for r in session.scalars(select(WeeklyOfflineMetric).order_by(WeeklyOfflineMetric.id)).all()
        ]
        mkt = [
            _orm_to_dict(r)
            for r in session.scalars(select(WeeklyMarketingSite).order_by(WeeklyMarketingSite.id)).all()
        ]
        web = [
            _orm_to_dict(r)
            for r in session.scalars(select(WeeklyWebChannel).order_by(WeeklyWebChannel.id)).all()
        ]
        ozon = [
            _orm_to_dict(r) for r in session.scalars(select(WeeklyOzon).order_by(WeeklyOzon.id)).all()
        ]
        rep = [
            _orm_to_dict(r)
            for r in session.scalars(select(ReputationSnapshot).order_by(ReputationSnapshot.id)).all()
        ]
        sessions = [
            _orm_to_dict(r, redact_keys=redact) for r in session.scalars(select(UserSession)).all()
        ]

    return {
        "source": "database",
        "outlets": outlets,
        "users": users,
        "user_outlets": user_outlets,
        "reporting_weeks": weeks,
        "weekly_offline_metrics": off_m,
        "weekly_marketing_site": mkt,
        "weekly_web_channels": web,
        "weekly_ozon": ozon,
        "reputation_snapshots": rep,
        "user_sessions": sessions,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="JSON-снимок синтетических данных Grove Pulse")
    p.add_argument(
        "--from-db",
        action="store_true",
        help="Читать из PostgreSQL (нужны DATABASE_URL / DATABASE_URL_SYNC)",
    )
    p.add_argument(
        "-o",
        "--output",
        type=str,
        default="-",
        help="Файл (по умолчанию stdout)",
    )
    args = p.parse_args(argv)

    if args.from_db:
        payload = build_snapshot_from_db()
    else:
        payload = build_snapshot_from_code()

    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output == "-":
        sys.stdout.write(text + "\n")
    else:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
