"""GET /api/dashboard/summary — фаза 6."""

from __future__ import annotations

from datetime import date
from enum import StrEnum

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gp_api.dashboard_periods import assert_anchor_not_future, resolve_dashboard_period
from gp_api.dashboard_service import build_summary_payload
from gp_api.deps import get_current_user, get_db, get_today_yekaterinburg
from gp_api.models.tables import User, UserRole

router = APIRouter(tags=["dashboard"])


class PeriodEnum(StrEnum):
    week = "week"
    month = "month"
    quarter = "quarter"


def _require_owner_or_marketer(user: User) -> None:
    if user.role not in (UserRole.owner, UserRole.marketer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


@router.get("/summary")
def dashboard_summary(
    period: PeriodEnum,
    anchor: date,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(get_today_yekaterinburg),
) -> dict:
    _require_owner_or_marketer(user)
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
    )
