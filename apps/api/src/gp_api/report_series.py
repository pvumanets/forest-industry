"""Временные ряды GET /api/reports/{topic}/series."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gp_api.dashboard_service import aggregate_offline_by_outlet
from gp_api.models.tables import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)

VALID_TOPICS = frozenset({"site", "outlets", "maps-2gis", "maps-yandex", "ozon", "returns"})


def _weeks_span(db: Session, dfrom: date, dto: date) -> list[ReportingWeek]:
    return list(
        db.scalars(
            select(ReportingWeek)
            .where(
                ReportingWeek.week_start_date >= dfrom,
                ReportingWeek.week_start_date <= dto,
            )
            .order_by(ReportingWeek.week_start_date),
        ).all(),
    )


def _trf_week(db: Session, week_id: int) -> int:
    return int(
        db.scalar(
            select(func.sum(WeeklyWebChannel.visitors)).where(WeeklyWebChannel.week_id == week_id),
        )
        or 0,
    )


def build_series_payload(
    db: Session,
    topic: str,
    date_from: date,
    date_to: date,
    outlet_code: str | None,
) -> dict[str, Any]:
    if topic not in VALID_TOPICS:
        msg = f"Неизвестный topic: {topic}"
        raise ValueError(msg)

    weeks = _weeks_span(db, date_from, date_to)
    series: list[dict[str, Any]] = []

    if topic == "site":
        pts = []
        for w in weeks:
            pts.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(_trf_week(db, w.id)),
                },
            )
        series.append(
            {
                "key": "WEB-TRF-TOT",
                "label": "Посетители сайта, всего",
                "points": pts,
            },
        )

    elif topic == "outlets":
        phys = db.scalars(
            select(Outlet).where(Outlet.is_virtual.is_(False)).order_by(Outlet.sort_order, Outlet.code),
        ).all()
        code_filter = outlet_code.strip().upper() if outlet_code else None
        if code_filter:
            targets = [o for o in phys if o.code == code_filter]
            if not targets:
                msg = "Неизвестный outlet_code"
                raise ValueError(msg)
        else:
            targets = phys
        for o in targets:
            pts = []
            for w in weeks:
                row = db.scalar(
                    select(WeeklyOfflineMetric).where(
                        WeeklyOfflineMetric.week_id == w.id,
                        WeeklyOfflineMetric.outlet_id == o.id,
                    ),
                )
                y = float(row.off_rev) if row else 0.0
                pts.append({"x": w.week_start_date.isoformat(), "y": y})
            series.append(
                {
                    "key": f"OFF-REV-{o.code}",
                    "label": f"Выручка {o.display_name}",
                    "points": pts,
                },
            )

    elif topic == "ozon":
        oz_id = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
        if oz_id is None:
            msg = "OZON outlet missing"
            raise RuntimeError(msg)
        pts_rev, pts_ord, pts_ad = [], [], []
        for w in weeks:
            row = db.scalar(
                select(WeeklyOzon).where(
                    WeeklyOzon.week_id == w.id,
                    WeeklyOzon.outlet_id == oz_id,
                ),
            )
            pts_rev.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(row.oz_rev) if row else 0.0,
                },
            )
            pts_ord.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(row.oz_ord) if row else 0.0,
                },
            )
            pts_ad.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(row.oz_ad_spend) if row else 0.0,
                },
            )
        series.extend(
            [
                {"key": "OZ-REV", "label": "Выручка Ozon", "points": pts_rev},
                {"key": "OZ-ORD", "label": "Заказы Ozon", "points": pts_ord},
                {"key": "OZ-AD-SPEND", "label": "Реклама Ozon", "points": pts_ad},
            ],
        )

    elif topic == "returns":
        pts_off_sum, pts_off_n, pts_oz_sum, pts_oz_n = [], [], [], []
        oz_id = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
        if oz_id is None:
            msg = "OZON outlet missing"
            raise RuntimeError(msg)
        for w in weeks:
            off_m = aggregate_offline_by_outlet(db, [w.id])
            off_sum = sum(x.off_ret_sum for x in off_m)
            off_n = sum(x.off_ret_n for x in off_m)
            oz = db.scalar(
                select(WeeklyOzon).where(
                    WeeklyOzon.week_id == w.id,
                    WeeklyOzon.outlet_id == oz_id,
                ),
            )
            pts_off_sum.append({"x": w.week_start_date.isoformat(), "y": off_sum})
            pts_off_n.append({"x": w.week_start_date.isoformat(), "y": off_n})
            pts_oz_sum.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(oz.oz_ret_sum) if oz else 0.0,
                },
            )
            pts_oz_n.append(
                {
                    "x": w.week_start_date.isoformat(),
                    "y": float(oz.oz_ret_n) if oz else 0.0,
                },
            )
        series.extend(
            [
                {"key": "OFF-RET-SUM-TOT", "label": "Возвраты офлайн, сумма", "points": pts_off_sum},
                {"key": "OFF-RET-N-TOT", "label": "Возвраты офлайн, шт.", "points": pts_off_n},
                {"key": "OZ-RET-SUM", "label": "Возвраты Ozon, сумма", "points": pts_oz_sum},
                {"key": "OZ-RET-N", "label": "Возвраты Ozon, шт.", "points": pts_oz_n},
            ],
        )

    elif topic in ("maps-2gis", "maps-yandex"):
        plat = "2gis" if topic == "maps-2gis" else "yandex"
        phys = db.scalars(select(Outlet).where(Outlet.is_virtual.is_(False))).all()
        oc = outlet_code.strip().upper() if outlet_code else None
        if oc:
            targets = [o for o in phys if o.code == oc]
            if not targets:
                msg = "Неизвестный outlet_code"
                raise ValueError(msg)
        else:
            targets = phys
        stmt = (
            select(ReputationSnapshot)
            .where(
                ReputationSnapshot.platform == plat,
                ReputationSnapshot.snapshot_date >= date_from,
                ReputationSnapshot.snapshot_date <= date_to,
                ReputationSnapshot.outlet_id.in_([o.id for o in targets]),
            )
            .order_by(ReputationSnapshot.snapshot_date, ReputationSnapshot.outlet_id)
        )
        rows = list(db.scalars(stmt).all())
        for o in targets:
            sub = [r for r in rows if r.outlet_id == o.id]
            pts_r = [{"x": r.snapshot_date.isoformat(), "y": float(r.rating)} for r in sub]
            pts_c = [{"x": r.snapshot_date.isoformat(), "y": float(r.review_cnt)} for r in sub]
            series.append(
                {
                    "key": f"REP-RATING-{o.code}",
                    "label": f"Оценка {o.code}",
                    "points": pts_r,
                },
            )
            series.append(
                {
                    "key": f"REP-REV-CNT-{o.code}",
                    "label": f"Отзывы {o.code}",
                    "points": pts_c,
                },
            )

    return {
        "topic": topic,
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "series": series,
    }
