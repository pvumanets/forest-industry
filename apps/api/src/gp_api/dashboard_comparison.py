"""Объект comparison для KPI (ui-copy-guidelines §4)."""

from __future__ import annotations

from typing import Any, Literal

ComparisonKind = Literal["percent", "none", "new_from_zero"]


def kpi_comparison(current: float | None, previous: float | None) -> dict[str, Any]:
    if current is None or previous is None:
        return {"kind": "none"}
    if previous == 0 and current == 0:
        return {"kind": "none"}
    if previous == 0 and current > 0:
        return {"kind": "new_from_zero"}
    pct = (current - previous) / abs(previous) * 100.0
    return {"kind": "percent", "value": round(pct, 4)}
