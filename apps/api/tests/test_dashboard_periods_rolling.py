"""Юнит-тесты rolling 4w без БД."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from gp_api.dashboard_periods import (
    assert_monday_rolling,
    is_reporting_week_complete,
    pick_default_rolling_anchor_end,
    rolling_current_four_mondays,
    rolling_previous_four_mondays,
)


def test_is_reporting_week_complete_sunday_boundary() -> None:
    mon = date(2026, 3, 23)
    sun = mon + timedelta(days=6)
    assert is_reporting_week_complete(mon, sun) is True
    assert is_reporting_week_complete(mon, sun - timedelta(days=1)) is False


def test_rolling_current_four_mondays() -> None:
    anchor = date(2026, 3, 23)
    cur = rolling_current_four_mondays(anchor)
    assert cur == (
        date(2026, 3, 2),
        date(2026, 3, 9),
        date(2026, 3, 16),
        date(2026, 3, 23),
    )


def test_rolling_previous_four_mondays() -> None:
    anchor = date(2026, 3, 23)
    prev = rolling_previous_four_mondays(anchor)
    assert prev == (
        date(2026, 2, 23),
        date(2026, 2, 16),
        date(2026, 2, 9),
        date(2026, 2, 2),
    )


def test_pick_default_rolling_anchor_end() -> None:
    # Цепочка заканчивается 23 марта
    chain = {date(2026, 3, 2), date(2026, 3, 9), date(2026, 3, 16), date(2026, 3, 23)}
    assert pick_default_rolling_anchor_end(chain) == date(2026, 3, 23)


def test_pick_default_prefers_newest_chain() -> None:
    older = {date(2026, 2, 2), date(2026, 2, 9), date(2026, 2, 16), date(2026, 2, 23)}
    newer = {date(2026, 3, 2), date(2026, 3, 9), date(2026, 3, 16), date(2026, 3, 23)}
    assert pick_default_rolling_anchor_end(older | newer) == date(2026, 3, 23)


def test_pick_default_none_if_gap() -> None:
    gap = {date(2026, 3, 2), date(2026, 3, 16), date(2026, 3, 23)}  # нет 9 марта
    assert pick_default_rolling_anchor_end(gap) is None


def test_assert_monday_rolling_rejects_non_monday() -> None:
    with pytest.raises(ValueError, match="понедельник"):
        assert_monday_rolling(date(2026, 3, 24))
