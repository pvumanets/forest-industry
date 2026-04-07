"""GET /api/reports/{topic}/series — фаза 6."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gp_api.deps import get_current_user, get_db
from gp_api.models.tables import User, UserRole
from gp_api.report_series import VALID_TOPICS, build_series_payload

router = APIRouter(tags=["reports"])


def _require_owner_or_marketer(user: User) -> None:
    if user.role not in (UserRole.owner, UserRole.marketer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )


@router.get("/{topic}/series")
def report_series(
    topic: str,
    date_from: Annotated[date, Query(alias="from")],
    date_to: Annotated[date, Query(alias="to")],
    outlet_code: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _require_owner_or_marketer(user)
    if topic not in VALID_TOPICS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Неизвестный topic: {topic}",
        )
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Параметр from не может быть больше to",
        )
    try:
        return build_series_payload(db, topic, date_from, date_to, outlet_code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e
