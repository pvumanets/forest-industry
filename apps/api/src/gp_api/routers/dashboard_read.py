"""GET /api/dashboard/summary — фаза 6."""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gp_api.dashboard_periods import (
    assert_anchor_not_future,
    resolve_dashboard_period,
    resolve_rolling_four_weeks,
)
from gp_api.dashboard_service import build_rolling_summary_payload, build_summary_payload
from gp_api.deps import get_current_user, get_db, get_today_yekaterinburg
from gp_api.models.tables import User, UserRole

router = APIRouter(tags=["dashboard"])

_ALLOWED_OUTLET = frozenset({"ALL", "NOVOGRAD", "SVERDLOV"})


class PeriodEnum(StrEnum):
    week = "week"
    month = "month"
    quarter = "quarter"
    rolling_4w = "rolling_4w"


def _require_owner_or_marketer(user: User) -> None:
    if user.role not in (UserRole.owner, UserRole.marketer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


def _normalize_outlet_code(raw: str | None) -> str | None:
    if raw is None or raw.strip() == "" or raw.strip().upper() == "ALL":
        return None
    u = raw.strip().upper()
    if u not in _ALLOWED_OUTLET:
        msg = "Недопустимый outlet_code (ожидается ALL, NOVOGRAD или SVERDLOV)"
        raise ValueError(msg)
    return u


@router.get("/summary")
def dashboard_summary(
    period: PeriodEnum,
    anchor: Annotated[date | None, Query()] = None,
    outlet_code: Annotated[str | None, Query()] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(get_today_yekaterinburg),
) -> dict:
    _require_owner_or_marketer(user)
    try:
        oc = _normalize_outlet_code(outlet_code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

    if period == PeriodEnum.rolling_4w:
        try:
            rr = resolve_rolling_four_weeks(db, today, anchor)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            ) from e
        return build_rolling_summary_payload(db, resolved=rr, outlet_code=oc)

    if anchor is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Параметр anchor обязателен для period=week|month|quarter",
        )
    try:
        assert_anchor_not_future(anchor, today)
        rp = resolve_dashboard_period(db, period.value, anchor)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e
    return build_summary_payload(
        db,
        period=period.value,
        anchor=anchor,
        p_week_starts=rp.p_week_starts,
        p_prev_week_starts=rp.p_prev_week_starts,
        previous_anchor=rp.previous_anchor,
        outlet_code=oc,
    )
