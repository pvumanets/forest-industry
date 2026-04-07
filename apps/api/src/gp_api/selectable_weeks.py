"""Три последние завершённые отчётные недели (Asia/Yekaterinburg, календарные определения)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

YEKATERINBURG_TZ = ZoneInfo("Asia/Yekaterinburg")


def today_in_yekaterinburg() -> date:
    return datetime.now(YEKATERINBURG_TZ).date()


def last_completed_sunday(today: date) -> date:
    d = today - timedelta(days=1)
    while d.weekday() != 6:
        d -= timedelta(days=1)
    return d


def selectable_week_starts(today: date) -> list[date]:
    """Три понедельника от новой к старой: w0, w1, w2."""
    s = last_completed_sunday(today)
    monday_latest = s - timedelta(days=6)
    w0 = monday_latest
    w1 = w0 - timedelta(days=7)
    w2 = w1 - timedelta(days=7)
    return [w0, w1, w2]


def is_week_selectable(week_start: date, today: date) -> bool:
    """Тот же критерий, что у GET /api/weeks/selectable: week_start ∈ selectable_week_starts(today)."""
    return week_start in selectable_week_starts(today)


def format_week_label(week_start: date) -> str:
    week_end = week_start + timedelta(days=6)

    def fmt(d: date) -> str:
        return f"{d.day:02d}.{d.month:02d}.{d.year}"

    return f"Пн {fmt(week_start)} — Вс {fmt(week_end)}"
