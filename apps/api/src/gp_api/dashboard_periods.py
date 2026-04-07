"""Календарные периоды дашборда (Asia/Yekaterinburg: даты якоря — календарные)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.models.tables import ReportingWeek

PeriodKind = Literal["week", "month", "quarter"]


def month_bounds(d: date) -> tuple[date, date]:
    start = date(d.year, d.month, 1)
    if d.month == 12:
        end = date(d.year, 12, 31)
    else:
        end = date(d.year, d.month + 1, 1) - timedelta(days=1)
    return start, end


def quarter_start(d: date) -> date:
    q0 = (d.month - 1) // 3
    start_month = q0 * 3 + 1
    return date(d.year, start_month, 1)


def quarter_bounds(d: date) -> tuple[date, date]:
    start = quarter_start(d)
    q0 = (d.month - 1) // 3
    if q0 == 3:
        end = date(d.year, 12, 31)
    else:
        first_month_next_q = (q0 + 1) * 3 + 1
        end = date(d.year, first_month_next_q, 1) - timedelta(days=1)
    return start, end


def prev_month_bounds(anchor: date) -> tuple[date, date]:
    first = date(anchor.year, anchor.month, 1)
    last_prev = first - timedelta(days=1)
    return month_bounds(last_prev)


def prev_quarter_bounds(anchor: date) -> tuple[date, date]:
    qs, _ = quarter_bounds(anchor)
    last_prev = qs - timedelta(days=1)
    return quarter_bounds(last_prev)


def previous_anchor_label(period: PeriodKind, anchor: date) -> date:
    if period == "week":
        return anchor - timedelta(days=7)
    if period == "month":
        ps, _ = prev_month_bounds(anchor)
        return ps
    ps, _ = prev_quarter_bounds(anchor)
    return ps


def list_week_starts_in_range(db: Session, start: date, end: date) -> list[date]:
    rows = db.scalars(
        select(ReportingWeek.week_start_date)
        .where(
            ReportingWeek.week_start_date >= start,
            ReportingWeek.week_start_date <= end,
        )
        .order_by(ReportingWeek.week_start_date),
    ).all()
    return list(rows)


@dataclass(frozen=True)
class ResolvedDashboardPeriod:
    period: PeriodKind
    anchor: date
    p_week_starts: list[date]
    p_prev_week_starts: list[date]
    previous_anchor: date


def resolve_dashboard_period(db: Session, period: PeriodKind, anchor: date) -> ResolvedDashboardPeriod:
    if period == "week":
        if anchor.weekday() != 0:
            msg = "Укажите понедельник отчётной недели"
            raise ValueError(msg)
        p_week_starts = list_week_starts_in_range(db, anchor, anchor)
        prev_m = anchor - timedelta(days=7)
        p_prev = list_week_starts_in_range(db, prev_m, prev_m)
    elif period == "month":
        ms, me = month_bounds(anchor)
        p_week_starts = list_week_starts_in_range(db, ms, me)
        pms, pme = prev_month_bounds(anchor)
        p_prev = list_week_starts_in_range(db, pms, pme)
    elif period == "quarter":
        qs, qe = quarter_bounds(anchor)
        p_week_starts = list_week_starts_in_range(db, qs, qe)
        pqs, pqe = prev_quarter_bounds(anchor)
        p_prev = list_week_starts_in_range(db, pqs, pqe)
    else:
        msg = f"Неизвестный тип периода: {period}"
        raise ValueError(msg)

    return ResolvedDashboardPeriod(
        period=period,
        anchor=anchor,
        p_week_starts=p_week_starts,
        p_prev_week_starts=p_prev,
        previous_anchor=previous_anchor_label(period, anchor),
    )


def assert_anchor_not_future(anchor: date, today: date) -> None:
    if anchor > today:
        msg = "Якорь периода не может быть в будущем"
        raise ValueError(msg)
