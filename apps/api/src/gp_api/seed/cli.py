from __future__ import annotations

from argon2 import PasswordHasher
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from gp_api.db.sync import get_engine
from gp_api.models import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    User,
    UserOutlet,
    WeeklyMarketingSite,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)
from gp_api.seed.data import (
    CHANNEL_KEYS,
    MARKETING_SITE_WEEKLY,
    NOVOGRAD_OFFLINE_WEEKLY,
    OUTLET_SEEDS,
    OZON_WEEKLY,
    REPUTATION_BY_WEEK,
    REPUTATION_SNAPSHOT_DATES,
    SVERDLOV_OFFLINE_WEEKLY,
    USER_SEEDS,
    WEEK_STARTS,
    channel_visitors,
)
from gp_api.seed.passwords import password_for_login


def run_seed() -> None:
    engine = get_engine()
    ph = PasswordHasher()

    with Session(engine) as session:
        for code, name, virt, sort in OUTLET_SEEDS:
            session.execute(
                pg_insert(Outlet.__table__)
                .values(code=code, display_name=name, is_virtual=virt, sort_order=sort)
                .on_conflict_do_nothing(index_elements=["code"]),
            )

        session.flush()

        for login, display_name, role_s in USER_SEEDS:
            pwd = password_for_login(login)
            h = ph.hash(pwd)
            session.execute(
                pg_insert(User.__table__)
                .values(
                    login=login,
                    password_hash=h,
                    display_name=display_name,
                    role=role_s,
                    is_active=True,
                )
                .on_conflict_do_nothing(index_elements=["login"]),
            )

        session.flush()

        mgr_id = session.scalar(select(User.id).where(User.login == "manager"))
        nov_id = session.scalar(select(Outlet.id).where(Outlet.code == "NOVOGRAD"))
        sver_id = session.scalar(select(Outlet.id).where(Outlet.code == "SVERDLOV"))
        ozon_id = session.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
        if mgr_id is None or nov_id is None or sver_id is None or ozon_id is None:
            msg = "Сид outlets/users: ожидались manager, NOVOGRAD, SVERDLOV, OZON"
            raise RuntimeError(msg)

        for oid in (nov_id, sver_id):
            session.execute(
                pg_insert(UserOutlet.__table__)
                .values(user_id=mgr_id, outlet_id=oid)
                .on_conflict_do_nothing(constraint="pk_user_outlets"),
            )

        for wd in WEEK_STARTS:
            session.execute(
                pg_insert(ReportingWeek.__table__)
                .values(week_start_date=wd)
                .on_conflict_do_nothing(index_elements=["week_start_date"]),
            )

        session.flush()

        week_by_date = {
            r.week_start_date: r.id
            for r in session.execute(select(ReportingWeek.week_start_date, ReportingWeek.id)).all()
        }

        for i, wd in enumerate(WEEK_STARTS):
            wid = week_by_date[wd]

            for outlet_id, row in (
                (nov_id, NOVOGRAD_OFFLINE_WEEKLY[i]),
                (sver_id, SVERDLOV_OFFLINE_WEEKLY[i]),
            ):
                rev, ord_n, rn, rs = row
                session.execute(
                    pg_insert(WeeklyOfflineMetric.__table__)
                    .values(
                        week_id=wid,
                        outlet_id=outlet_id,
                        off_rev=rev,
                        off_ord=ord_n,
                        off_ret_n=rn,
                        off_ret_sum=rs,
                    )
                    .on_conflict_do_nothing(constraint="uq_weekly_offline_week_outlet"),
                )

            ctx, mmap, bounce, time_s = MARKETING_SITE_WEEKLY[i]
            session.execute(
                pg_insert(WeeklyMarketingSite.__table__)
                .values(
                    week_id=wid,
                    mkt_ad_ctx=ctx,
                    mkt_ad_map=mmap,
                    web_beh_bounce=bounce,
                    web_beh_time=time_s,
                )
                .on_conflict_do_nothing(constraint="uq_weekly_marketing_site_week_id"),
            )

            for ch in CHANNEL_KEYS:
                vis = channel_visitors(i, ch)
                session.execute(
                    pg_insert(WeeklyWebChannel.__table__)
                    .values(week_id=wid, channel_key=ch, visitors=vis)
                    .on_conflict_do_nothing(constraint="uq_weekly_web_channels_week_channel"),
                )

            oz_r, oz_ord, oz_rn, oz_rs, oz_ad = OZON_WEEKLY[i]
            session.execute(
                pg_insert(WeeklyOzon.__table__)
                .values(
                    week_id=wid,
                    outlet_id=ozon_id,
                    oz_rev=oz_r,
                    oz_ord=oz_ord,
                    oz_ret_n=oz_rn,
                    oz_ret_sum=oz_rs,
                    oz_ad_spend=oz_ad,
                )
                .on_conflict_do_nothing(constraint="uq_weekly_ozon_week_outlet"),
            )

            outlet_by_code = {"NOVOGRAD": nov_id, "SVERDLOV": sver_id}
            for platform in ("2gis", "yandex"):
                for ocode in ("NOVOGRAD", "SVERDLOV"):
                    rating, reviews = REPUTATION_BY_WEEK[i][(ocode, platform)]
                    snap_d = REPUTATION_SNAPSHOT_DATES[i]
                    session.execute(
                        pg_insert(ReputationSnapshot.__table__)
                        .values(
                            outlet_id=outlet_by_code[ocode],
                            platform=platform,
                            snapshot_date=snap_d,
                            rating=rating,
                            review_cnt=reviews,
                        )
                        .on_conflict_do_nothing(constraint="uq_reputation_outlet_platform_date"),
                    )

        session.commit()


def truncate_metric_tables() -> None:
    """Удаляет только метрики и отчётные недели (outlets/users/sessions не трогает)."""
    engine = get_engine()
    stmt = text(
        """
        TRUNCATE TABLE
            weekly_offline_metrics,
            weekly_marketing_site,
            weekly_web_channels,
            weekly_ozon,
            reputation_snapshots,
            reporting_weeks
        RESTART IDENTITY CASCADE
        """,
    )
    with engine.begin() as conn:
        conn.execute(stmt)


def reset_metrics_and_seed() -> None:
    truncate_metric_tables()
    run_seed()
    print("gp_api.seed: метрики очищены и заново заполнены")


def main() -> None:
    run_seed()
    print("gp_api.seed: готово")
