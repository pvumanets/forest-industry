from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends

from gp_api.deps import get_current_user, get_today_yekaterinburg
from gp_api.models.tables import User
from gp_api.schemas.reference import WeekSelectableItem
from gp_api.selectable_weeks import format_week_label, selectable_week_starts

router = APIRouter(tags=["weeks"])


@router.get("/selectable", response_model=list[WeekSelectableItem])
def weeks_selectable(
    _user: User = Depends(get_current_user),
    today: date = Depends(get_today_yekaterinburg),
) -> list[WeekSelectableItem]:
    return [
        WeekSelectableItem(week_start=ws, label=format_week_label(ws))
        for ws in selectable_week_starts(today)
    ]
