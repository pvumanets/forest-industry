"""Ввод данных: офлайн (site_manager) и маркетинг (marketer), фаза 5."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from gp_api.deps import get_current_user, get_db, get_today_yekaterinburg
from gp_api.models.tables import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    User,
    UserOutlet,
    UserRole,
    WeeklyMarketingSite,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)
from gp_api.schemas.submissions import (
    MarketingPutBody,
    MarketingReputationCellOut,
    MarketingReputationOut,
    MarketingReputationPut,
    MarketingSubmissionResponse,
    OfflinePutBody,
    OfflineSubmissionResponse,
    ReputationSubmissionResponse,
)
from gp_api.selectable_weeks import is_week_selectable

router = APIRouter(tags=["submissions"])

REPUTATION_SLOTS: tuple[tuple[str, str], ...] = (
    ("NOVOGRAD", "2gis"),
    ("NOVOGRAD", "yandex"),
    ("SVERDLOV", "2gis"),
    ("SVERDLOV", "yandex"),
)

CHANNEL_ORDER = ("organic", "cpc_direct", "direct")


@dataclass(frozen=True)
class ResolvedReportingWeek:
    week_start: date
    week_id: int


def ensure_reporting_week(week_start: date, today: date, db: Session) -> ResolvedReportingWeek:
    if week_start.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Некорректная дата начала недели",
        )
    if not is_week_selectable(week_start, today):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Неделя недоступна для ввода",
        )
    rw = db.scalar(select(ReportingWeek).where(ReportingWeek.week_start_date == week_start))
    if rw is None:
        db.execute(
            pg_insert(ReportingWeek.__table__)
            .values(week_start_date=week_start)
            .on_conflict_do_nothing(index_elements=["week_start_date"]),
        )
        rw = db.scalar(select(ReportingWeek).where(ReportingWeek.week_start_date == week_start))
        if rw is not None:
            # GET ввода не вызывает commit в конце хендлера — без этого строка откатывается при close().
            db.commit()
    if rw is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Неделя недоступна для ввода",
        )
    return ResolvedReportingWeek(week_start=week_start, week_id=rw.id)


def resolve_submission_week(
    week_start: Annotated[date, Path(description="Понедельник отчётной недели, YYYY-MM-DD")],
    today: Annotated[date, Depends(get_today_yekaterinburg)],
    db: Session = Depends(get_db),
) -> ResolvedReportingWeek:
    return ensure_reporting_week(week_start, today, db)


def monday_of_calendar_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _outlet_by_code_any(db: Session, outlet_code: str) -> Outlet | None:
    code_u = outlet_code.strip().upper()
    return db.scalar(select(Outlet).where(Outlet.code == code_u))


def _forbidden() -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")


def _assert_offline_allowed(user: User, outlet: Outlet, db: Session) -> None:
    if user.role != UserRole.site_manager:
        raise _forbidden()
    if outlet.is_virtual:
        raise _forbidden()
    linked = db.scalar(
        select(UserOutlet).where(
            UserOutlet.user_id == user.id,
            UserOutlet.outlet_id == outlet.id,
        ),
    )
    if linked is None:
        raise _forbidden()


def _assert_marketing_allowed(user: User) -> None:
    if user.role != UserRole.marketer:
        raise _forbidden()


def _ozon_outlet_id(db: Session) -> int:
    oid = db.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
    if oid is None:
        msg = "В справочнике отсутствует виртуальная точка OZON"
        raise RuntimeError(msg)
    return oid


def _outlet_id_map_physical(db: Session) -> dict[str, int]:
    rows = db.scalars(
        select(Outlet).where(Outlet.is_virtual.is_(False), Outlet.code.in_(["NOVOGRAD", "SVERDLOV"])),
    ).all()
    return {o.code: o.id for o in rows}


def _reputation_cells_for_snapshot_date(
    db: Session,
    snapshot_date: date,
) -> list[MarketingReputationCellOut]:
    oid_by_code = _outlet_id_map_physical(db)
    cells_out: list[MarketingReputationCellOut] = []
    for out_code, plat in REPUTATION_SLOTS:
        oid = oid_by_code.get(out_code)
        if oid is None:
            cells_out.append(
                MarketingReputationCellOut(
                    outlet_code=out_code,
                    platform=plat,
                    rating=None,
                    review_cnt=None,
                ),
            )
            continue
        row = db.scalar(
            select(ReputationSnapshot).where(
                ReputationSnapshot.outlet_id == oid,
                ReputationSnapshot.platform == plat,
                ReputationSnapshot.snapshot_date == snapshot_date,
            ),
        )
        if row:
            cells_out.append(
                MarketingReputationCellOut(
                    outlet_code=out_code,
                    platform=plat,
                    rating=float(row.rating),
                    review_cnt=row.review_cnt,
                ),
            )
        else:
            cells_out.append(
                MarketingReputationCellOut(
                    outlet_code=out_code,
                    platform=plat,
                    rating=None,
                    review_cnt=None,
                ),
            )
    return cells_out


def _build_marketing_get(db: Session, rw: ResolvedReportingWeek) -> MarketingSubmissionResponse:
    week_id = rw.week_id
    week_start = rw.week_start
    week_end = week_start + timedelta(days=6)

    mkt = db.scalar(select(WeeklyMarketingSite).where(WeeklyMarketingSite.week_id == week_id))
    oz_id = _ozon_outlet_id(db)
    oz_row = db.scalar(
        select(WeeklyOzon).where(
            WeeklyOzon.week_id == week_id,
            WeeklyOzon.outlet_id == oz_id,
        ),
    )
    ch_rows = db.scalars(
        select(WeeklyWebChannel).where(WeeklyWebChannel.week_id == week_id),
    ).all()
    ch_by = {c.channel_key: c for c in ch_rows}

    if mkt:
        advertising = {
            "mkt_ad_ctx": float(mkt.mkt_ad_ctx),
            "mkt_ad_map": float(mkt.mkt_ad_map),
        }
        web_behavior = {
            "web_beh_bounce": float(mkt.web_beh_bounce),
            "web_beh_time": float(mkt.web_beh_time),
        }
    else:
        advertising = {"mkt_ad_ctx": None, "mkt_ad_map": None}
        web_behavior = {"web_beh_bounce": None, "web_beh_time": None}

    web_channels = []
    for key in CHANNEL_ORDER:
        row = ch_by.get(key)
        web_channels.append(
            {
                "channel": key,
                "visitors": None if row is None else row.visitors,
            },
        )

    oid_by_code = _outlet_id_map_physical(db)
    cells_out: list[dict] = []
    snapshot_dates: list[date] = []
    for out_code, plat in REPUTATION_SLOTS:
        oid = oid_by_code.get(out_code)
        if oid is None:
            cells_out.append(
                {
                    "outlet_code": out_code,
                    "platform": plat,
                    "rating": None,
                    "review_cnt": None,
                },
            )
            continue
        row = db.scalar(
            select(ReputationSnapshot)
            .where(
                ReputationSnapshot.outlet_id == oid,
                ReputationSnapshot.platform == plat,
                ReputationSnapshot.snapshot_date >= week_start,
                ReputationSnapshot.snapshot_date <= week_end,
            )
            .order_by(ReputationSnapshot.snapshot_date.desc()),
        )
        if row:
            cells_out.append(
                {
                    "outlet_code": out_code,
                    "platform": plat,
                    "rating": float(row.rating),
                    "review_cnt": row.review_cnt,
                },
            )
            snapshot_dates.append(row.snapshot_date)
        else:
            cells_out.append(
                {
                    "outlet_code": out_code,
                    "platform": plat,
                    "rating": None,
                    "review_cnt": None,
                },
            )

    rep_sd: date | None = max(snapshot_dates) if snapshot_dates else None

    if oz_row:
        ozon = {
            "oz_rev": float(oz_row.oz_rev),
            "oz_ord": oz_row.oz_ord,
            "oz_ret_n": oz_row.oz_ret_n,
            "oz_ret_sum": float(oz_row.oz_ret_sum),
            "oz_ad_spend": float(oz_row.oz_ad_spend),
        }
    else:
        ozon = {
            "oz_rev": None,
            "oz_ord": None,
            "oz_ret_n": None,
            "oz_ret_sum": None,
            "oz_ad_spend": None,
        }

    ts: list[datetime] = []
    if mkt and mkt.updated_at:
        ts.append(mkt.updated_at)
    if oz_row and oz_row.updated_at:
        ts.append(oz_row.updated_at)
    updated_at = max(ts) if ts else None

    return MarketingSubmissionResponse(
        week_start=week_start,
        advertising=advertising,
        web_channels=web_channels,
        web_behavior=web_behavior,
        reputation=MarketingReputationOut(
            snapshot_date=rep_sd,
            cells=[MarketingReputationCellOut(**c) for c in cells_out],
        ),
        ozon=ozon,
        updated_at=updated_at,
    )


@router.get(
    "/offline/{week_start}/{outlet_code}",
    response_model=OfflineSubmissionResponse,
)
def get_offline_submission(
    outlet_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rw: ResolvedReportingWeek = Depends(resolve_submission_week),
) -> OfflineSubmissionResponse:
    outlet = _outlet_by_code_any(db, outlet_code)
    if outlet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Точка не найдена")
    _assert_offline_allowed(user, outlet, db)

    row = db.scalar(
        select(WeeklyOfflineMetric).where(
            WeeklyOfflineMetric.week_id == rw.week_id,
            WeeklyOfflineMetric.outlet_id == outlet.id,
        ),
    )
    if row is None:
        return OfflineSubmissionResponse(
            week_start=rw.week_start,
            outlet_code=outlet.code,
            off_rev=None,
            off_ord=None,
            off_ret_n=None,
            off_ret_sum=None,
            updated_at=None,
        )
    return OfflineSubmissionResponse(
        week_start=rw.week_start,
        outlet_code=outlet.code,
        off_rev=float(row.off_rev),
        off_ord=row.off_ord,
        off_ret_n=row.off_ret_n,
        off_ret_sum=float(row.off_ret_sum),
        updated_at=row.updated_at,
    )


@router.put(
    "/offline/{week_start}/{outlet_code}",
    response_model=OfflineSubmissionResponse,
)
def put_offline_submission(
    body: OfflinePutBody,
    outlet_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rw: ResolvedReportingWeek = Depends(resolve_submission_week),
) -> OfflineSubmissionResponse:
    outlet = _outlet_by_code_any(db, outlet_code)
    if outlet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Точка не найдена")
    _assert_offline_allowed(user, outlet, db)

    now = datetime.now(UTC)
    row = db.scalar(
        select(WeeklyOfflineMetric).where(
            WeeklyOfflineMetric.week_id == rw.week_id,
            WeeklyOfflineMetric.outlet_id == outlet.id,
        ),
    )
    if row is None:
        row = WeeklyOfflineMetric(
            week_id=rw.week_id,
            outlet_id=outlet.id,
            off_rev=body.off_rev,
            off_ord=body.off_ord,
            off_ret_n=body.off_ret_n,
            off_ret_sum=body.off_ret_sum,
            updated_at=now,
            updated_by_user_id=user.id,
        )
        db.add(row)
    else:
        row.off_rev = body.off_rev
        row.off_ord = body.off_ord
        row.off_ret_n = body.off_ret_n
        row.off_ret_sum = body.off_ret_sum
        row.updated_at = now
        row.updated_by_user_id = user.id
    db.commit()
    db.refresh(row)
    return OfflineSubmissionResponse(
        week_start=rw.week_start,
        outlet_code=outlet.code,
        off_rev=float(row.off_rev),
        off_ord=row.off_ord,
        off_ret_n=row.off_ret_n,
        off_ret_sum=float(row.off_ret_sum),
        updated_at=row.updated_at,
    )


@router.get(
    "/reputation/{snapshot_date}",
    response_model=ReputationSubmissionResponse,
)
def get_reputation_submission(
    snapshot_date: Annotated[date, Path(description="Дата снимка, YYYY-MM-DD")],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(get_today_yekaterinburg),
) -> ReputationSubmissionResponse:
    _assert_marketing_allowed(user)
    week_start = monday_of_calendar_week(snapshot_date)
    if not is_week_selectable(week_start, today):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Неделя недоступна для ввода",
        )
    cells = _reputation_cells_for_snapshot_date(db, snapshot_date)
    return ReputationSubmissionResponse(snapshot_date=snapshot_date, cells=cells)


@router.put(
    "/reputation",
    response_model=ReputationSubmissionResponse,
)
def put_reputation_submission(
    body: MarketingReputationPut,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(get_today_yekaterinburg),
) -> ReputationSubmissionResponse:
    _assert_marketing_allowed(user)
    week_start = monday_of_calendar_week(body.snapshot_date)
    ensure_reporting_week(week_start, today, db)
    oid_by_code = _outlet_id_map_physical(db)
    for oc in ("NOVOGRAD", "SVERDLOV"):
        if oc not in oid_by_code:
            msg = f"В справочнике отсутствует точка {oc}"
            raise RuntimeError(msg)

    week_end = week_start + timedelta(days=6)
    nov_id = oid_by_code["NOVOGRAD"]
    sver_id = oid_by_code["SVERDLOV"]

    db.execute(
        delete(ReputationSnapshot).where(
            ReputationSnapshot.outlet_id.in_([nov_id, sver_id]),
            ReputationSnapshot.platform.in_(["2gis", "yandex"]),
            ReputationSnapshot.snapshot_date >= week_start,
            ReputationSnapshot.snapshot_date <= week_end,
        ),
    )

    for cell in body.cells:
        oid = oid_by_code[cell.outlet_code]
        db.add(
            ReputationSnapshot(
                outlet_id=oid,
                platform=cell.platform,
                snapshot_date=body.snapshot_date,
                rating=cell.rating,
                review_cnt=cell.review_cnt,
                created_by_user_id=user.id,
            ),
        )

    db.commit()
    cells = _reputation_cells_for_snapshot_date(db, body.snapshot_date)
    return ReputationSubmissionResponse(snapshot_date=body.snapshot_date, cells=cells)


@router.get(
    "/marketing/{week_start}",
    response_model=MarketingSubmissionResponse,
)
def get_marketing_submission(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rw: ResolvedReportingWeek = Depends(resolve_submission_week),
) -> MarketingSubmissionResponse:
    _assert_marketing_allowed(user)
    return _build_marketing_get(db, rw)


@router.put(
    "/marketing/{week_start}",
    response_model=MarketingSubmissionResponse,
)
def put_marketing_submission(
    body: MarketingPutBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rw: ResolvedReportingWeek = Depends(resolve_submission_week),
) -> MarketingSubmissionResponse:
    _assert_marketing_allowed(user)
    if body.week_start != rw.week_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Дата недели в теле запроса должна совпадать с датой в пути",
        )

    now = datetime.now(UTC)
    week_id = rw.week_id
    oz_id = _ozon_outlet_id(db)
    oid_by_code = _outlet_id_map_physical(db)
    for oc in ("NOVOGRAD", "SVERDLOV"):
        if oc not in oid_by_code:
            msg = f"В справочнике отсутствует точка {oc}"
            raise RuntimeError(msg)

    mrow = db.scalar(select(WeeklyMarketingSite).where(WeeklyMarketingSite.week_id == week_id))
    if mrow is None:
        mrow = WeeklyMarketingSite(
            week_id=week_id,
            mkt_ad_ctx=body.advertising.mkt_ad_ctx,
            mkt_ad_map=body.advertising.mkt_ad_map,
            web_beh_bounce=body.web_behavior.web_beh_bounce,
            web_beh_time=body.web_behavior.web_beh_time,
            updated_at=now,
            updated_by_user_id=user.id,
        )
        db.add(mrow)
    else:
        mrow.mkt_ad_ctx = body.advertising.mkt_ad_ctx
        mrow.mkt_ad_map = body.advertising.mkt_ad_map
        mrow.web_beh_bounce = body.web_behavior.web_beh_bounce
        mrow.web_beh_time = body.web_behavior.web_beh_time
        mrow.updated_at = now
        mrow.updated_by_user_id = user.id

    for ch in body.web_channels:
        cr = db.scalar(
            select(WeeklyWebChannel).where(
                WeeklyWebChannel.week_id == week_id,
                WeeklyWebChannel.channel_key == ch.channel,
            ),
        )
        if cr is None:
            cr = WeeklyWebChannel(
                week_id=week_id,
                channel_key=ch.channel,
                visitors=ch.visitors,
            )
            db.add(cr)
        else:
            cr.visitors = ch.visitors

    oz = db.scalar(
        select(WeeklyOzon).where(
            WeeklyOzon.week_id == week_id,
            WeeklyOzon.outlet_id == oz_id,
        ),
    )
    if oz is None:
        oz = WeeklyOzon(
            week_id=week_id,
            outlet_id=oz_id,
            oz_rev=body.ozon.oz_rev,
            oz_ord=body.ozon.oz_ord,
            oz_ret_n=body.ozon.oz_ret_n,
            oz_ret_sum=body.ozon.oz_ret_sum,
            oz_ad_spend=body.ozon.oz_ad_spend,
            updated_at=now,
            updated_by_user_id=user.id,
        )
        db.add(oz)
    else:
        oz.oz_rev = body.ozon.oz_rev
        oz.oz_ord = body.ozon.oz_ord
        oz.oz_ret_n = body.ozon.oz_ret_n
        oz.oz_ret_sum = body.ozon.oz_ret_sum
        oz.oz_ad_spend = body.ozon.oz_ad_spend
        oz.updated_at = now
        oz.updated_by_user_id = user.id

    db.commit()
    return _build_marketing_get(db, rw)
