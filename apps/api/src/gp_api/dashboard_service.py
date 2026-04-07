"""Агрегации для GET /api/dashboard/summary и /api/reports/.../series."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gp_api.dashboard_comparison import kpi_comparison
from gp_api.dashboard_periods import (
    PeriodKind,
    ResolvedRollingFourWeeks,
    month_bounds,
    quarter_bounds,
)
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


def aggregate_offline_by_outlet(
    db: Session,
    week_ids: list[int],
    *,
    outlet_code: str | None = None,
) -> list[OfflineOutletAgg]:
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
    )
    if outlet_code:
        q = q.where(Outlet.code == outlet_code)
    q = q.group_by(Outlet.id, Outlet.code, Outlet.display_name, Outlet.sort_order).order_by(
        Outlet.sort_order,
        Outlet.code,
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


def kpi_triple_with_secondary(
    cur: float | None,
    prev_main: float | None,
    wow_cur: float | None,
    wow_prev: float | None,
    *,
    round_cur: int | None = 2,
) -> dict[str, Any]:
    out = kpi_triple(cur, prev_main, round_cur=round_cur)
    if wow_cur is None or wow_prev is None:
        return out
    wp = round(wow_prev, round_cur) if round_cur is not None else wow_prev
    wc = round(wow_cur, round_cur) if round_cur is not None else wow_cur
    out["secondary_previous"] = wp
    out["secondary_comparison"] = kpi_comparison(wc, wp)
    return out


def sum_marketing_site_totals(db: Session, week_ids: list[int]) -> tuple[float, float]:
    if not week_ids:
        return 0.0, 0.0
    row = db.execute(
        select(
            func.coalesce(func.sum(WeeklyMarketingSite.mkt_ad_ctx), 0),
            func.coalesce(func.sum(WeeklyMarketingSite.mkt_ad_map), 0),
        ).where(WeeklyMarketingSite.week_id.in_(week_ids)),
    ).one()
    return float(row[0]), float(row[1])


def max_dashboard_updated_at(
    db: Session,
    week_ids: list[int],
    *,
    reputation_start: date | None = None,
    reputation_end: date | None = None,
    physical_outlet_ids: list[int] | None = None,
) -> datetime | None:
    candidates: list[datetime] = []
    if week_ids:
        uo = db.scalar(
            select(func.max(WeeklyOfflineMetric.updated_at)).where(
                WeeklyOfflineMetric.week_id.in_(week_ids),
            ),
        )
        if uo is not None:
            candidates.append(uo)
        um = db.scalar(
            select(func.max(WeeklyMarketingSite.updated_at)).where(
                WeeklyMarketingSite.week_id.in_(week_ids),
            ),
        )
        if um is not None:
            candidates.append(um)
        uz = db.scalar(
            select(func.max(WeeklyOzon.updated_at)).where(WeeklyOzon.week_id.in_(week_ids)),
        )
        if uz is not None:
            candidates.append(uz)
    if (
        reputation_start is not None
        and reputation_end is not None
        and physical_outlet_ids
    ):
        ur = db.scalar(
            select(func.max(ReputationSnapshot.created_at)).where(
                ReputationSnapshot.outlet_id.in_(physical_outlet_ids),
                ReputationSnapshot.snapshot_date >= reputation_start,
                ReputationSnapshot.snapshot_date <= reputation_end,
            ),
        )
        if ur is not None:
            candidates.append(ur)
    if not candidates:
        return None
    return max(candidates)


def _rolling_metric_bundle(
    db: Session,
    week_ids_ordered: list[int],
    ozon_id: int,
    *,
    offline_outlet_code: str | None,
    company_der: bool,
) -> dict[str, Any]:
    off = aggregate_offline_by_outlet(
        db,
        week_ids_ordered,
        outlet_code=offline_outlet_code,
    )
    oz = aggregate_ozon(db, week_ids_ordered, ozon_id)
    mctx, mmap = sum_marketing_site_totals(db, week_ids_ordered)
    trf = sum_web_trf_tot(db, week_ids_ordered)
    bounce, time_val = weighted_site_behavior(db, week_ids_ordered)
    off_rev = sum(x.off_rev for x in off)
    off_ord = sum(x.off_ord for x in off)
    off_ret_n = sum(x.off_ret_n for x in off)
    off_ret_sum = sum(x.off_ret_sum for x in off)
    if company_der:
        der_rev = off_rev + oz["oz_rev"]
        der_ord = off_ord + oz["oz_ord"]
    else:
        der_rev = off_rev
        der_ord = off_ord
    der_ret_sum = off_ret_sum + oz["oz_ret_sum"]
    der_ret_n = off_ret_n + oz["oz_ret_n"]
    der_ad = mctx + mmap + oz["oz_ad_spend"]
    oz_share_pct = None if der_rev <= 0 else round(oz["oz_rev"] / der_rev * 100.0, 4)
    der_avg_co = None if der_ord <= 0 else round(der_rev / der_ord, 2)
    oz_avg = None if oz["oz_ord"] <= 0 else round(oz["oz_rev"] / oz["oz_ord"], 2)
    return {
        "off": off,
        "oz": oz,
        "off_rev": off_rev,
        "off_ord": off_ord,
        "off_ret_n": off_ret_n,
        "off_ret_sum": off_ret_sum,
        "der_rev": der_rev,
        "der_ord": der_ord,
        "der_ret_sum": der_ret_sum,
        "der_ret_n": der_ret_n,
        "der_ad": der_ad,
        "oz_share_pct": oz_share_pct,
        "der_avg_co": der_avg_co,
        "oz_avg": oz_avg,
        "trf": trf,
        "bounce": bounce,
        "time_val": time_val,
    }


def build_summary_payload(
    db: Session,
    *,
    period: PeriodKind,
    anchor: date,
    p_week_starts: list[date],
    p_prev_week_starts: list[date],
    previous_anchor: date,
    outlet_code: str | None = None,
) -> dict[str, Any]:
    p_ids, _ = week_ids_in_order(db, p_week_starts)
    prev_ids, _ = week_ids_in_order(db, p_prev_week_starts)

    phys = db.scalars(select(Outlet).where(Outlet.is_virtual.is_(False)).order_by(Outlet.sort_order)).all()
    phys_ids = [o.id for o in phys]
    ozon_id = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
    if ozon_id is None:
        msg = "OZON outlet missing"
        raise RuntimeError(msg)

    off_filter = outlet_code
    company_scope = off_filter is None

    # --- P metrics
    off_p = aggregate_offline_by_outlet(db, p_ids, outlet_code=off_filter)
    trf_p = sum_web_trf_tot(db, p_ids)
    bounce_p, time_p = weighted_site_behavior(db, p_ids)
    oz_p = aggregate_ozon(db, p_ids, ozon_id)
    mctx_p, mmap_p = sum_marketing_site_totals(db, p_ids)
    der_ad_p = mctx_p + mmap_p + oz_p["oz_ad_spend"]

    cal_p0, cal_p1 = reputation_calendar_range(period, anchor, p_week_starts)
    best_p = maps_last_in_range(db, phys_ids, cal_p0, cal_p1)

    off_rev_p = sum(x.off_rev for x in off_p)
    off_ord_p = sum(x.off_ord for x in off_p)
    der_rev_p = off_rev_p + (oz_p["oz_rev"] if company_scope else 0.0)
    der_ord_p = off_ord_p + (oz_p["oz_ord"] if company_scope else 0.0)
    off_ret_n_p = sum(x.off_ret_n for x in off_p)
    off_ret_sum_p = sum(x.off_ret_sum for x in off_p)

    # --- P_prev
    off_prev = aggregate_offline_by_outlet(db, prev_ids, outlet_code=off_filter)
    trf_prev = sum_web_trf_tot(db, prev_ids)
    bounce_prev, time_prev = weighted_site_behavior(db, prev_ids)
    oz_prev = aggregate_ozon(db, prev_ids, ozon_id)
    mctx_pr, mmap_pr = sum_marketing_site_totals(db, prev_ids)
    der_ad_pr = mctx_pr + mmap_pr + oz_prev["oz_ad_spend"]

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

    off_rev_prev = sum(x.off_rev for x in off_prev)
    off_ord_prev = sum(x.off_ord for x in off_prev)
    der_rev_prev = off_rev_prev + (oz_prev["oz_rev"] if company_scope else 0.0)
    der_ord_prev = off_ord_prev + (oz_prev["oz_ord"] if company_scope else 0.0)
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

    if company_scope:
        outlets_kpis: list[dict[str, Any]] = [
            {
                "id": "DER-REV-TOT",
                "label": "Выручка",
                **kpi_triple(der_rev_p, der_rev_prev),
            },
            {
                "id": "DER-ORD-TOT",
                "label": "Заказы",
                **kpi_triple(der_ord_p, der_ord_prev, round_cur=0),
            },
            {
                "id": "DER-AD-TOTAL",
                "label": "Расходы на рекламу всего",
                **kpi_triple(der_ad_p, der_ad_pr),
            },
        ]
    else:
        avg_p = None if off_ord_p <= 0 else round(off_rev_p / off_ord_p, 2)
        avg_pr = None if off_ord_prev <= 0 else round(off_rev_prev / off_ord_prev, 2)
        oc = off_filter or ""
        outlets_kpis = [
            {
                "id": "OFF-REV-SUM",
                "label": f"Выручка ({oc})",
                **kpi_triple(off_rev_p, off_rev_prev),
            },
            {
                "id": "OFF-ORD-SUM",
                "label": f"Заказы ({oc})",
                **kpi_triple(off_ord_p, off_ord_prev, round_cur=0),
            },
            {
                "id": "OFF-AVG-CHK-SUM",
                "label": f"Средний чек ({oc})",
                **kpi_triple(avg_p, avg_pr),
            },
            {
                "id": "DER-AD-TOTAL",
                "label": "Расходы на рекламу всего",
                **kpi_triple(der_ad_p, der_ad_pr),
            },
        ]

    outlets_block = {
        "kpis": outlets_kpis,
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
        "outlet_code": "ALL" if company_scope else (off_filter or "ALL"),
        "blocks": {
            "site": {"kpis": site_kpis},
            "outlets": outlets_block,
            "maps_2gis": maps_block_for_platform("2gis"),
            "maps_yandex": maps_block_for_platform("yandex"),
            "ozon": {"kpis": ozon_kpis},
            "returns": {"kpis": returns_kpis},
        },
    }


def build_rolling_summary_payload(
    db: Session,
    *,
    resolved: ResolvedRollingFourWeeks,
    outlet_code: str | None = None,
) -> dict[str, Any]:
    """Сводка для period=rolling_4w (метрики реестра, двойное сравнение)."""
    off_filter = outlet_code
    company_scope = off_filter is None

    phys = db.scalars(select(Outlet).where(Outlet.is_virtual.is_(False)).order_by(Outlet.sort_order)).all()
    phys_ids = [o.id for o in phys]
    ozon_id = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
    if ozon_id is None:
        msg = "OZON outlet missing"
        raise RuntimeError(msg)

    cur_starts = list(resolved.current_week_starts)
    prev_starts = list(resolved.previous_week_starts)
    # week_ids_in_order → (ids, week_start_dates); в агрегаторы передаём только id недель.
    cur_ids, _ = week_ids_in_order(db, cur_starts)
    prev_ids, _ = week_ids_in_order(db, prev_starts)
    wow_c_ids, _ = week_ids_in_order(db, [resolved.wow_current_week_start])
    wow_p_ids: list[int] = []
    if resolved.wow_previous_week_start:
        wow_p_ids, _ = week_ids_in_order(db, [resolved.wow_previous_week_start])

    bc = _rolling_metric_bundle(
        db,
        cur_ids,
        ozon_id,
        offline_outlet_code=off_filter,
        company_der=company_scope,
    )
    bp = (
        _rolling_metric_bundle(
            db,
            prev_ids,
            ozon_id,
            offline_outlet_code=off_filter,
            company_der=company_scope,
        )
        if prev_ids
        else None
    )
    bwc = _rolling_metric_bundle(
        db,
        wow_c_ids,
        ozon_id,
        offline_outlet_code=off_filter,
        company_der=company_scope,
    )
    bwp = (
        _rolling_metric_bundle(
            db,
            wow_p_ids,
            ozon_id,
            offline_outlet_code=off_filter,
            company_der=company_scope,
        )
        if wow_p_ids
        else None
    )

    def _pm(key: str) -> Any:
        return bp[key] if bp is not None else None

    def _wowp(key: str) -> Any:
        return bwp[key] if bwp is not None else None

    prev_anchor_str = (
        resolved.previous_week_starts[-1].isoformat() if resolved.previous_week_starts else None
    )

    cal_c0 = min(resolved.current_week_starts)
    cal_c1 = max(resolved.current_week_starts) + timedelta(days=6)
    best_p = maps_last_in_range(db, phys_ids, cal_c0, cal_c1)
    if resolved.previous_week_starts:
        cal_p0 = min(resolved.previous_week_starts)
        cal_p1 = max(resolved.previous_week_starts) + timedelta(days=6)
        best_prev = maps_last_in_range(db, phys_ids, cal_p0, cal_p1)
    else:
        best_prev = {}

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

    # Возвраты — всегда по компании (офлайн все точки + Ozon)
    bc_all = _rolling_metric_bundle(
        db,
        cur_ids,
        ozon_id,
        offline_outlet_code=None,
        company_der=True,
    )
    bp_all = (
        _rolling_metric_bundle(
            db,
            prev_ids,
            ozon_id,
            offline_outlet_code=None,
            company_der=True,
        )
        if prev_ids
        else None
    )
    bwc_all = _rolling_metric_bundle(
        db,
        wow_c_ids,
        ozon_id,
        offline_outlet_code=None,
        company_der=True,
    )
    bwp_all = (
        _rolling_metric_bundle(
            db,
            wow_p_ids,
            ozon_id,
            offline_outlet_code=None,
            company_der=True,
        )
        if wow_p_ids
        else None
    )

    returns_kpis = [
        {
            "id": "OFF-RET-SUM-TOT",
            "label": "Возвраты офлайн, сумма",
            **kpi_triple_with_secondary(
                sum(x.off_ret_sum for x in bc_all["off"]),
                sum(x.off_ret_sum for x in bp_all["off"]) if bp_all else None,
                sum(x.off_ret_sum for x in bwc_all["off"]),
                sum(x.off_ret_sum for x in bwp_all["off"]) if bwp_all else None,
            ),
        },
        {
            "id": "OFF-RET-N-TOT",
            "label": "Возвраты офлайн, шт.",
            **kpi_triple_with_secondary(
                sum(x.off_ret_n for x in bc_all["off"]),
                sum(x.off_ret_n for x in bp_all["off"]) if bp_all else None,
                sum(x.off_ret_n for x in bwc_all["off"]),
                sum(x.off_ret_n for x in bwp_all["off"]) if bwp_all else None,
                round_cur=0,
            ),
        },
        {
            "id": "OZ-RET-SUM",
            "label": "Возвраты Ozon, сумма",
            **kpi_triple_with_secondary(
                bc_all["oz"]["oz_ret_sum"],
                bp_all["oz"]["oz_ret_sum"] if bp_all else None,
                bwc_all["oz"]["oz_ret_sum"],
                bwp_all["oz"]["oz_ret_sum"] if bwp_all else None,
            ),
        },
        {
            "id": "OZ-RET-N",
            "label": "Возвраты Ozon, шт.",
            **kpi_triple_with_secondary(
                bc_all["oz"]["oz_ret_n"],
                bp_all["oz"]["oz_ret_n"] if bp_all else None,
                bwc_all["oz"]["oz_ret_n"],
                bwp_all["oz"]["oz_ret_n"] if bwp_all else None,
                round_cur=0,
            ),
        },
        {
            "id": "DER-RET-SUM-TOT",
            "label": "Возвраты, сумма (компания)",
            **kpi_triple_with_secondary(
                bc_all["der_ret_sum"],
                bp_all["der_ret_sum"] if bp_all else None,
                bwc_all["der_ret_sum"],
                bwp_all["der_ret_sum"] if bwp_all else None,
            ),
        },
    ]

    site_kpis = [
        {
            "id": "WEB-TRF-TOT",
            "label": "Посетители сайта, всего",
            **kpi_triple_with_secondary(bc["trf"], _pm("trf"), bwc["trf"], _wowp("trf"), round_cur=0),
        },
        {
            "id": "WEB-BEH-BOUNCE",
            "label": "Отказы, %",
            **kpi_triple_with_secondary(bc["bounce"], _pm("bounce"), bwc["bounce"], _wowp("bounce")),
        },
        {
            "id": "WEB-BEH-TIME",
            "label": "Длительность визита, сек",
            **kpi_triple_with_secondary(bc["time_val"], _pm("time_val"), bwc["time_val"], _wowp("time_val")),
        },
    ]

    oz_bc = aggregate_ozon(db, cur_ids, ozon_id)
    oz_bp = aggregate_ozon(db, prev_ids, ozon_id) if prev_ids else None
    oz_bwc = aggregate_ozon(db, wow_c_ids, ozon_id)
    oz_bwp = aggregate_ozon(db, wow_p_ids, ozon_id) if wow_p_ids else None

    oz_avg_c = None if oz_bc["oz_ord"] <= 0 else round(oz_bc["oz_rev"] / oz_bc["oz_ord"], 2)
    oz_avg_p = (
        None
        if oz_bp is None or oz_bp["oz_ord"] <= 0
        else round(oz_bp["oz_rev"] / oz_bp["oz_ord"], 2)
    )
    oz_avg_wc = None if oz_bwc["oz_ord"] <= 0 else round(oz_bwc["oz_rev"] / oz_bwc["oz_ord"], 2)
    oz_avg_wp = (
        None if oz_bwp is None or oz_bwp["oz_ord"] <= 0 else round(oz_bwp["oz_rev"] / oz_bwp["oz_ord"], 2)
    )

    ozon_kpis = [
        {
            "id": "OZ-REV",
            "label": "Выручка Ozon",
            **kpi_triple_with_secondary(
                oz_bc["oz_rev"],
                oz_bp["oz_rev"] if oz_bp else None,
                oz_bwc["oz_rev"],
                oz_bwp["oz_rev"] if oz_bwp else None,
            ),
        },
        {
            "id": "OZ-ORD",
            "label": "Заказы Ozon",
            **kpi_triple_with_secondary(
                oz_bc["oz_ord"],
                oz_bp["oz_ord"] if oz_bp else None,
                oz_bwc["oz_ord"],
                oz_bwp["oz_ord"] if oz_bwp else None,
                round_cur=0,
            ),
        },
        {
            "id": "OZ-AD-SPEND",
            "label": "Реклама Ozon",
            **kpi_triple_with_secondary(
                oz_bc["oz_ad_spend"],
                oz_bp["oz_ad_spend"] if oz_bp else None,
                oz_bwc["oz_ad_spend"],
                oz_bwp["oz_ad_spend"] if oz_bwp else None,
            ),
        },
        {
            "id": "OZ-AVG-CHK",
            "label": "Средний чек Ozon",
            **kpi_triple_with_secondary(oz_avg_c, oz_avg_p, oz_avg_wc, oz_avg_wp),
        },
    ]

    p_by_code = {x.code: x for x in bc["off"]}
    prev_by_code = {x.code: x for x in (bp["off"] if bp else [])}
    outlet_sub: list[dict[str, Any]] = []
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

    if company_scope:
        outlets_kpis_roll: list[dict[str, Any]] = [
            {
                "id": "DER-REV-TOT",
                "label": "Выручка",
                **kpi_triple_with_secondary(bc["der_rev"], _pm("der_rev"), bwc["der_rev"], _wowp("der_rev")),
            },
            {
                "id": "DER-ORD-TOT",
                "label": "Заказы",
                **kpi_triple_with_secondary(
                    bc["der_ord"],
                    _pm("der_ord"),
                    bwc["der_ord"],
                    _wowp("der_ord"),
                    round_cur=0,
                ),
            },
            {
                "id": "DER-AVG-CHK-CO",
                "label": "Средний чек компании",
                **kpi_triple_with_secondary(
                    bc["der_avg_co"],
                    _pm("der_avg_co"),
                    bwc["der_avg_co"],
                    _wowp("der_avg_co"),
                ),
            },
            {
                "id": "DER-RET-SUM-TOT",
                "label": "Возвраты, сумма (компания)",
                **kpi_triple_with_secondary(
                    bc["der_ret_sum"],
                    _pm("der_ret_sum"),
                    bwc["der_ret_sum"],
                    _wowp("der_ret_sum"),
                ),
            },
            {
                "id": "DER-OZ-SHARE",
                "label": "Доля выручки Ozon, %",
                **kpi_triple_with_secondary(
                    bc["oz_share_pct"],
                    _pm("oz_share_pct"),
                    bwc["oz_share_pct"],
                    _wowp("oz_share_pct"),
                    round_cur=4,
                ),
            },
            {
                "id": "DER-AD-TOTAL",
                "label": "Расходы на рекламу всего",
                **kpi_triple_with_secondary(bc["der_ad"], _pm("der_ad"), bwc["der_ad"], _wowp("der_ad")),
            },
        ]
    else:
        oc = off_filter or ""
        outlets_kpis_roll = [
            {
                "id": "OFF-REV-SUM",
                "label": f"Выручка ({oc})",
                **kpi_triple_with_secondary(bc["off_rev"], _pm("off_rev"), bwc["off_rev"], _wowp("off_rev")),
            },
            {
                "id": "OFF-ORD-SUM",
                "label": f"Заказы ({oc})",
                **kpi_triple_with_secondary(
                    bc["off_ord"],
                    _pm("off_ord"),
                    bwc["off_ord"],
                    _wowp("off_ord"),
                    round_cur=0,
                ),
            },
            {
                "id": "OFF-AVG-CHK-SUM",
                "label": f"Средний чек ({oc})",
                **kpi_triple_with_secondary(
                    bc["der_avg_co"],
                    _pm("der_avg_co"),
                    bwc["der_avg_co"],
                    _wowp("der_avg_co"),
                ),
            },
            {
                "id": "DER-AD-TOTAL",
                "label": "Расходы на рекламу всего",
                **kpi_triple_with_secondary(bc["der_ad"], _pm("der_ad"), bwc["der_ad"], _wowp("der_ad")),
            },
        ]

    outlets_block = {
        "kpis": outlets_kpis_roll,
        "by_outlet": outlet_sub,
    }

    all_week_ids = list({*cur_ids, *prev_ids, *wow_c_ids, *wow_p_ids})
    rep_s = cal_c0
    rep_e = cal_c1
    if resolved.previous_week_starts:
        rep_s = min(rep_s, min(resolved.previous_week_starts))
        rep_e = max(rep_e, max(resolved.previous_week_starts) + timedelta(days=6))
    u_at = max_dashboard_updated_at(
        db,
        all_week_ids,
        reputation_start=rep_s,
        reputation_end=rep_e,
        physical_outlet_ids=phys_ids,
    )
    updated_at_max = u_at.isoformat() if u_at else None

    return {
        "period": "rolling_4w",
        "anchor": resolved.anchor_end.isoformat(),
        "previous_anchor": prev_anchor_str,
        "week_starts": [d.isoformat() for d in resolved.current_week_starts],
        "updated_at_max": updated_at_max,
        "outlet_code": "ALL" if company_scope else (off_filter or "ALL"),
        "blocks": {
            "site": {"kpis": site_kpis},
            "outlets": outlets_block,
            "maps_2gis": maps_block_for_platform("2gis"),
            "maps_yandex": maps_block_for_platform("yandex"),
            "ozon": {"kpis": ozon_kpis},
            "returns": {"kpis": returns_kpis},
        },
    }
