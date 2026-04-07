from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.deps import get_current_user, get_db
from gp_api.models.tables import Outlet, User, UserOutlet, UserRole
from gp_api.schemas.reference import OutletListItem

router = APIRouter(tags=["outlets"])


@router.get("", response_model=list[OutletListItem])
def list_outlets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutletListItem]:
    if user.role == UserRole.site_manager:
        q = (
            select(Outlet)
            .join(UserOutlet, UserOutlet.outlet_id == Outlet.id)
            .where(UserOutlet.user_id == user.id, Outlet.is_virtual.is_(False))
            .order_by(Outlet.sort_order, Outlet.code)
        )
    else:
        q = (
            select(Outlet)
            .where(Outlet.is_virtual.is_(False))
            .order_by(Outlet.sort_order, Outlet.code)
        )
    return [OutletListItem.model_validate(o) for o in db.scalars(q).all()]
