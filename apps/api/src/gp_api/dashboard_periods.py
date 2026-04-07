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


# --- Rolling 4 weeks (главный дашборд владельца) — см. metrics-registry.md v1.1


def is_reporting_week_complete(week_start: date, today: date) -> bool:
    """Отчётная неделя (пн–вс) завершена, если воскресенье <= today."""
    sunday = week_start + timedelta(days=6)
    return sunday <= today


def assert_monday_rolling(anchor_end: date) -> None:
    if anchor_end.weekday() != 0:
        msg = "Укажите понедельник конца окна (последняя из четырёх недель)"
        raise ValueError(msg)


def rolling_current_four_mondays(anchor_end: date) -> tuple[date, date, date, date]:
    """Четыре понедельника текущего окна: от старейшей к новейшей (включая anchor_end)."""
    return (
        anchor_end - timedelta(days=21),
        anchor_end - timedelta(days=14),
        anchor_end - timedelta(days=7),
        anchor_end,
    )


def rolling_previous_four_mondays(anchor_end: date) -> tuple[date, date, date, date]:
    """Четыре понедельника непосредственно перед текущим окном (не пересекаются с current)."""
    w0 = anchor_end - timedelta(days=21)
    return (
        w0 - timedelta(days=7),
        w0 - timedelta(days=14),
        w0 - timedelta(days=21),
        w0 - timedelta(days=28),
    )


def pick_default_rolling_anchor_end(complete_week_starts: set[date]) -> date | None:
    """Самый поздний понедельник, для которого в complete_week_starts есть цепочка из 4 недель подряд."""
    for anchor in sorted(complete_week_starts, reverse=True):
        if all((anchor - timedelta(days=7 * i)) in complete_week_starts for i in range(4)):
            return anchor
    return None


@dataclass(frozen=True)
class ResolvedRollingFourWeeks:
    """Окна для rolling 4w: текущие 4 недели, предыдущие 4 (если все есть в БД и завершены), WoW."""

    anchor_end: date
    current_week_starts: tuple[date, date, date, date]
    previous_week_starts: tuple[date, ...]
    wow_current_week_start: date
    wow_previous_week_start: date | None


def resolve_rolling_four_weeks(
    db: Session,
    today: date,
    anchor_end: date | None,
) -> ResolvedRollingFourWeeks:
    """
    Находит окна по зарегистрированным reporting_weeks.
    Текущее окно — 4 календарно последовательные завершённые недели, заканчивающиеся в anchor_end.
    Предыдущее окно — 4 недели перед началом текущего; возвращается только если все четыре есть в БД и завершены.
    WoW: неделя сразу перед anchor_end — в wow_previous_week_start, если она завершена и есть в БД, иначе None.
    """
    all_starts = set(db.scalars(select(ReportingWeek.week_start_date)).all())
    if not all_starts:
        msg = "Нет зарегистрированных отчётных недель"
        raise ValueError(msg)

    complete = {d for d in all_starts if is_reporting_week_complete(d, today)}

    resolved_end: date
    if anchor_end is None:
        picked = pick_default_rolling_anchor_end(complete)
        if picked is None:
            msg = "Недостаточно данных: нужны четыре завершённые отчётные недели подряд в базе"
            raise ValueError(msg)
        resolved_end = picked
    else:
        assert_monday_rolling(anchor_end)
        assert_anchor_not_future(anchor_end, today)
        if not is_reporting_week_complete(anchor_end, today):
            msg = "Последняя неделя окна ещё не завершена"
            raise ValueError(msg)
        cur = rolling_current_four_mondays(anchor_end)
        missing = [d for d in cur if d not in all_starts]
        if missing:
            msg = "Для выбранного конца окна не все четыре недели зарегистрированы в базе"
            raise ValueError(msg)
        not_complete = [d for d in cur if d not in complete]
        if not_complete:
            msg = "Для выбранного конца окна не все четыре недели завершены по календарю"
            raise ValueError(msg)
        resolved_end = anchor_end

    current = rolling_current_four_mondays(resolved_end)
    previous = rolling_previous_four_mondays(resolved_end)

    wow_cur = resolved_end
    wow_prev = resolved_end - timedelta(days=7)
    wow_previous_ok = wow_prev if wow_prev in complete else None

    if all(d in complete for d in previous):
        prev_resolved: tuple[date, ...] = previous
    else:
        prev_resolved = ()

    return ResolvedRollingFourWeeks(
        anchor_end=resolved_end,
        current_week_starts=current,
        previous_week_starts=prev_resolved,
        wow_current_week_start=wow_cur,
        wow_previous_week_start=wow_previous_ok,
    )
