"""Агрегации для GET /api/dashboard/summary и /api/reports/.../series."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gp_api.dashboard_comparison import kpi_comparison
from gp_api.dashboard_periods import PeriodKind, month_bounds, quarter_bounds
from gp_api.models.tables import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    WeeklyMarketingSite,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)


def week_ids_in_order(db: Session, week_starts: list[date]) -> tuple[list[int], list[date]]:
    if not week_starts:
        return [], []
    rows = db.scalars(
        select(ReportingWeek).where(ReportingWeek.week_start_date.in_(week_starts)),
    ).all()
    by_d = {r.week_start_date: r.id for r in rows}
    ids: list[int] = []
    dates: list[date] = []
    for s in week_starts:
        if s in by_d:
            ids.append(by_d[s])
            dates.append(s)
    return ids, dates


@dataclass
class OfflineOutletAgg:
    code: str
    display_name: str
    off_rev: float
    off_ord: float
    off_ret_n: float
    off_ret_sum: float


def aggregate_offline_by_outlet(db: Session, week_ids: list[int]) -> list[OfflineOutletAgg]:
    if not week_ids:
        return []
    q = (
        select(
            Outlet.code,
            Outlet.display_name,
            func.sum(WeeklyOfflineMetric.off_rev),
            func.sum(WeeklyOfflineMetric.off_ord),
            func.sum(WeeklyOfflineMetric.off_ret_n),
            func.sum(WeeklyOfflineMetric.off_ret_sum),
        )
        .join(Outlet, Outlet.id == WeeklyOfflineMetric.outlet_id)
        .where(
            WeeklyOfflineMetric.week_id.in_(week_ids),
            Outlet.is_virtual.is_(False),
        )
        .group_by(Outlet.id, Outlet.code, Outlet.display_name, Outlet.sort_order)
        .order_by(Outlet.sort_order, Outlet.code)
    )
    rows = db.execute(q).all()
    return [
        OfflineOutletAgg(
            code=r[0],
            display_name=r[1],
            off_rev=float(r[2] or 0),
            off_ord=float(r[3] or 0),
            off_ret_n=float(r[4] or 0),
            off_ret_sum=float(r[5] or 0),
        )
        for r in rows
    ]


def sum_web_trf_tot(db: Session, week_ids: list[int]) -> float:
    if not week_ids:
        return 0.0
    q = select(func.sum(WeeklyWebChannel.visitors)).where(WeeklyWebChannel.week_id.in_(week_ids))
    v = db.scalar(q)
    return float(v or 0)


def weighted_site_behavior(
    db: Session,
    week_ids_ordered: list[int],
) -> tuple[float | None, float | None]:
    if not week_ids_ordered:
        return None, None
    ch_rows = db.scalars(
        select(WeeklyWebChannel).where(WeeklyWebChannel.week_id.in_(week_ids_ordered)),
    ).all()
    trf_by_week: dict[int, int] = {}
    for r in ch_rows:
        trf_by_week[r.week_id] = trf_by_week.get(r.week_id, 0) + r.visitors
    m_rows = db.scalars(
        select(WeeklyMarketingSite).where(WeeklyMarketingSite.week_id.in_(week_ids_ordered)),
    ).all()
    m_by = {m.week_id: m for m in m_rows}
    num_b = 0.0
    num_t = 0.0
    den = 0
    for wid in week_ids_ordered:
        trf = trf_by_week.get(wid, 0)
        if trf <= 0:
            continue
        m = m_by.get(wid)
        if m is None:
            continue
        num_b += float(m.web_beh_bounce) * trf
        num_t += float(m.web_beh_time) * trf
        den += trf
    if den == 0:
        return None, None
    return round(num_b / den, 2), round(num_t / den, 2)


def aggregate_ozon(db: Session, week_ids: list[int], ozon_outlet_id: int) -> dict[str, float]:
    z = {"oz_rev": 0.0, "oz_ord": 0.0, "oz_ret_n": 0.0, "oz_ret_sum": 0.0, "oz_ad_spend": 0.0}
    if not week_ids:
        return z
    q = select(
        func.sum(WeeklyOzon.oz_rev),
        func.sum(WeeklyOzon.oz_ord),
        func.sum(WeeklyOzon.oz_ret_n),
        func.sum(WeeklyOzon.oz_ret_sum),
        func.sum(WeeklyOzon.oz_ad_spend),
    ).where(
        WeeklyOzon.week_id.in_(week_ids),
        WeeklyOzon.outlet_id == ozon_outlet_id,
    )
    row = db.execute(q).one()
    return {
        "oz_rev": float(row[0] or 0),
        "oz_ord": float(row[1] or 0),
        "oz_ret_n": float(row[2] or 0),
        "oz_ret_sum": float(row[3] or 0),
        "oz_ad_spend": float(row[4] or 0),
    }


def maps_last_in_range(
    db: Session,
    physical_outlet_ids: list[int],
    cal_start: date,
    cal_end: date,
) -> dict[tuple[int, str], ReputationSnapshot]:
    if not physical_outlet_ids:
        return {}
    rows = db.scalars(
        select(ReputationSnapshot).where(
            ReputationSnapshot.outlet_id.in_(physical_outlet_ids),
            ReputationSnapshot.snapshot_date >= cal_start,
            ReputationSnapshot.snapshot_date <= cal_end,
        ),
    ).all()
    best: dict[tuple[int, str], ReputationSnapshot] = {}
    for r in rows:
        k = (r.outlet_id, r.platform)
        if k not in best or r.snapshot_date > best[k].snapshot_date:
            best[k] = r
    return best


def maps_summary_from_best(best: dict[tuple[int, str], ReputationSnapshot]) -> tuple[float | None, float | None]:
    if not best:
        return None, None
    ratings = [float(x.rating) for x in best.values()]
    revs = [x.review_cnt for x in best.values()]
    return round(sum(ratings) / len(ratings), 4), float(sum(revs))


def reputation_calendar_range(period: PeriodKind, anchor: date, week_starts: list[date]) -> tuple[date, date]:
    if period == "week" and week_starts:
        ws = week_starts[0]
        return ws, ws + timedelta(days=6)
    if period == "month":
        return month_bounds(anchor)
    return quarter_bounds(anchor)


def kpi_triple(
    cur: float | None,
    prev: float | None,
    *,
    round_cur: int | None = 2,
) -> dict[str, Any]:
    c = None if cur is None else (round(cur, round_cur) if round_cur is not None else cur)
    p = None if prev is None else (round(prev, round_cur) if round_cur is not None else prev)
    return {
        "current": c,
        "previous": p,
        "comparison": kpi_comparison(c, p),
    }


def build_summary_payload(
    db: Session,
    *,
    period: PeriodKind,
    anchor: date,
    p_week_starts: list[date],
    p_prev_week_starts: list[date],
    previous_anchor: date,
) -> dict[str, Any]:
    p_ids, _ = week_ids_in_order(db, p_week_starts)
    prev_ids, _ = week_ids_in_order(db, p_prev_week_starts)

    phys = db.scalars(select(Outlet).where(Outlet.is_virtual.is_(False)).order_by(Outlet.sort_order)).all()
    phys_ids = [o.id for o in phys]
    ozon_id = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
    if ozon_id is None:
        msg = "OZON outlet missing"
        raise RuntimeError(msg)

    # --- P metrics
    off_p = aggregate_offline_by_outlet(db, p_ids)
    trf_p = sum_web_trf_tot(db, p_ids)
    bounce_p, time_p = weighted_site_behavior(db, p_ids)
    oz_p = aggregate_ozon(db, p_ids, ozon_id)

    cal_p0, cal_p1 = reputation_calendar_range(period, anchor, p_week_starts)
    best_p = maps_last_in_range(db, phys_ids, cal_p0, cal_p1)

    der_rev_p = sum(x.off_rev for x in off_p)
    der_ord_p = sum(x.off_ord for x in off_p)
    off_ret_n_p = sum(x.off_ret_n for x in off_p)
    off_ret_sum_p = sum(x.off_ret_sum for x in off_p)

    # --- P_prev
    off_prev = aggregate_offline_by_outlet(db, prev_ids)
    trf_prev = sum_web_trf_tot(db, prev_ids)
    bounce_prev, time_prev = weighted_site_behavior(db, prev_ids)
    oz_prev = aggregate_ozon(db, prev_ids, ozon_id)

    if period == "week" and p_prev_week_starts:
        cal_prev0 = p_prev_week_starts[0]
        cal_prev1 = cal_prev0 + timedelta(days=6)
    elif period == "week":
        pm = anchor - timedelta(days=7)
        cal_prev0, cal_prev1 = pm, pm + timedelta(days=6)
    elif period == "month":
        cal_prev0, cal_prev1 = month_bounds(previous_anchor)
    elif period == "quarter":
        cal_prev0, cal_prev1 = quarter_bounds(previous_anchor)
    else:
        msg = f"Неизвестный период: {period}"
        raise ValueError(msg)
    best_prev = maps_last_in_range(db, phys_ids, cal_prev0, cal_prev1)

    der_rev_prev = sum(x.off_rev for x in off_prev)
    der_ord_prev = sum(x.off_ord for x in off_prev)
    off_ret_n_prev = sum(x.off_ret_n for x in off_prev)
    off_ret_sum_prev = sum(x.off_ret_sum for x in off_prev)

    oz_avg_p = (
        None
        if oz_p["oz_ord"] <= 0
        else round(oz_p["oz_rev"] / oz_p["oz_ord"], 2)
    )
    oz_avg_prev = (
        None
        if oz_prev["oz_ord"] <= 0
        else round(oz_prev["oz_rev"] / oz_prev["oz_ord"], 2)
    )

    returns_kpis = [
        {
            "id": "OFF-RET-SUM-TOT",
            "label": "Возвраты офлайн, сумма",
            **kpi_triple(off_ret_sum_p, off_ret_sum_prev),
        },
        {
            "id": "OFF-RET-N-TOT",
            "label": "Возвраты офлайн, шт.",
            **kpi_triple(off_ret_n_p, off_ret_n_prev, round_cur=0),
        },
        {
            "id": "OZ-RET-SUM",
            "label": "Возвраты Ozon, сумма",
            **kpi_triple(oz_p["oz_ret_sum"], oz_prev["oz_ret_sum"]),
        },
        {
            "id": "OZ-RET-N",
            "label": "Возвраты Ozon, шт.",
            **kpi_triple(oz_p["oz_ret_n"], oz_prev["oz_ret_n"], round_cur=0),
        },
    ]

    site_kpis = [
        {
            "id": "WEB-TRF-TOT",
            "label": "Посетители сайта, всего",
            **kpi_triple(trf_p, trf_prev, round_cur=0),
        },
        {
            "id": "WEB-BEH-BOUNCE",
            "label": "Отказы, %",
            **kpi_triple(bounce_p, bounce_prev),
        },
        {
            "id": "WEB-BEH-TIME",
            "label": "Длительность визита, сек",
            **kpi_triple(time_p, time_prev),
        },
    ]

    outlet_sub: list[dict[str, Any]] = []
    p_by_code = {x.code: x for x in off_p}
    prev_by_code = {x.code: x for x in off_prev}
    for o in phys:
        row_p = p_by_code.get(o.code)
        po = prev_by_code.get(o.code)
        rev_p = row_p.off_rev if row_p else None
        ord_p = row_p.off_ord if row_p else None
        pr = po.off_rev if po else None
        por = po.off_ord if po else None
        avg = None if row_p is None or row_p.off_ord <= 0 else round(row_p.off_rev / row_p.off_ord, 2)
        pavg = None if po is None or po.off_ord <= 0 else round(po.off_rev / po.off_ord, 2)
        kpis = [
            {"id": "OFF-REV", "label": "Выручка", **kpi_triple(rev_p, pr)},
            {"id": "OFF-ORD", "label": "Заказы", **kpi_triple(ord_p, por, round_cur=0)},
            {"id": "OFF-AVG-CHK", "label": "Средний чек", **kpi_triple(avg, pavg)},
        ]
        outlet_sub.append(
            {
                "outlet_code": o.code,
                "display_name": o.display_name,
                "kpis": kpis,
            },
        )

    outlets_block = {
        "kpis": [
            {
                "id": "DER-REV-TOT",
                "label": "Выручка офлайн, всего",
                **kpi_triple(der_rev_p, der_rev_prev),
            },
            {
                "id": "DER-ORD-TOT",
                "label": "Заказы офлайн, всего",
                **kpi_triple(der_ord_p, der_ord_prev, round_cur=0),
            },
        ],
        "by_outlet": outlet_sub,
    }

    def maps_block_for_platform(plat: str) -> dict[str, Any]:
        fp = {k: v for k, v in best_p.items() if k[1] == plat}
        fprev = {k: v for k, v in best_prev.items() if k[1] == plat}
        ar_p, sr_p = maps_summary_from_best(fp)
        ar_pr, sr_pr = maps_summary_from_best(fprev)
        dlt = None if sr_p is None or sr_pr is None else sr_p - sr_pr
        label = "2ГИС" if plat == "2gis" else "Яндекс"
        return {
            "kpis": [
                {
                    "id": "REP-RATING-AVG",
                    "label": f"Средняя оценка ({label})",
                    **kpi_triple(ar_p, ar_pr, round_cur=4),
                },
                {
                    "id": "REP-REV-CNT-TOT",
                    "label": f"Отзывы, всего ({label})",
                    **kpi_triple(sr_p, sr_pr, round_cur=0),
                },
                {
                    "id": "REP-REV-DELTA",
                    "label": "Прирост отзывов к прошлому периоду",
                    "current": None if dlt is None else int(dlt),
                    "previous": None,
                    "comparison": {"kind": "none"},
                },
            ]
        }

    ozon_kpis = [
        {"id": "OZ-REV", "label": "Выручка Ozon", **kpi_triple(oz_p["oz_rev"], oz_prev["oz_rev"])},
        {"id": "OZ-ORD", "label": "Заказы Ozon", **kpi_triple(oz_p["oz_ord"], oz_prev["oz_ord"], round_cur=0)},
        {
            "id": "OZ-AD-SPEND",
            "label": "Реклама Ozon",
            **kpi_triple(oz_p["oz_ad_spend"], oz_prev["oz_ad_spend"]),
        },
        {"id": "OZ-AVG-CHK", "label": "Средний чек Ozon", **kpi_triple(oz_avg_p, oz_avg_prev)},
    ]

    return {
        "period": period,
        "anchor": anchor.isoformat(),
        "previous_anchor": previous_anchor.isoformat(),
        "blocks": {
            "site": {"kpis": site_kpis},
            "outlets": outlets_block,
            "maps_2gis": maps_block_for_platform("2gis"),
            "maps_yandex": maps_block_for_platform("yandex"),
            "ozon": {"kpis": ozon_kpis},
            "returns": {"kpis": returns_kpis},
        },
    }
