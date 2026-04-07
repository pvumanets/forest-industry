"""Фаза 5: ввод данных (GET/PUT submissions)."""

from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gp_api.deps import get_today_yekaterinburg
from gp_api.main import app
from gp_api.models.tables import (
    Outlet,
    ReportingWeek,
    ReputationSnapshot,
    User,
    UserRole,
    WeeklyMarketingSite,
    WeeklyOfflineMetric,
    WeeklyOzon,
    WeeklyWebChannel,
)
from gp_api.seed.data import CHANNEL_KEYS, WEEK_STARTS, channel_visitors

API_ROOT = Path(__file__).resolve().parents[1]

TDAY = date(2026, 2, 24)
WEEK = date(2026, 2, 16)


@pytest.fixture(scope="module")
def auth_ready(postgres_url: str, alembic_ini: Path) -> None:  # noqa: ARG001
    os.environ["ALLOW_INSECURE_SEED_DEFAULTS"] = "1"
    cfg = Config(str(alembic_ini))
    command.upgrade(cfg, "head")
    from gp_api.seed.cli import run_seed

    run_seed()


@pytest.fixture(scope="module")
def client(auth_ready: None) -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def engine(auth_ready: None):
    from gp_api.db.sync import get_engine

    return get_engine()


@pytest.fixture(autouse=True)
def _clear_cookies(client: TestClient) -> None:
    client.cookies.clear()
    yield


@pytest.fixture(scope="module")
def lonely_mgr_seeded(engine) -> None:
    from argon2 import PasswordHasher

    ph = PasswordHasher()
    with Session(engine) as s:
        ex = s.scalar(select(User).where(User.login == "lonely_mgr"))
        if ex is None:
            s.add(
                User(
                    login="lonely_mgr",
                    display_name="Без точек",
                    password_hash=ph.hash("lonely_pass_12"),
                    role=UserRole.site_manager,
                    is_active=True,
                ),
            )
            s.commit()


def marketing_core_body(ws: date) -> dict:
    wi = WEEK_STARTS.index(ws)
    web_channels = [
        {"channel": ch, "visitors": channel_visitors(wi, ch)} for ch in CHANNEL_KEYS
    ]
    return {
        "week_start": ws.isoformat(),
        "advertising": {"mkt_ad_ctx": 1000.0, "mkt_ad_map": 500.0},
        "web_channels": web_channels,
        "web_behavior": {"web_beh_bounce": 45.5, "web_beh_time": 120.5},
        "ozon": {
            "oz_rev": 20000.0,
            "oz_ord": 100,
            "oz_ret_n": 5,
            "oz_ret_sum": 3000.0,
            "oz_ad_spend": 800.0,
        },
    }


def reputation_put_body(snap: date) -> dict:
    return {
        "snapshot_date": snap.isoformat(),
        "cells": [
            {"outlet_code": "NOVOGRAD", "platform": "2gis", "rating": 4.5, "review_cnt": 120},
            {"outlet_code": "NOVOGRAD", "platform": "yandex", "rating": 4.6, "review_cnt": 95},
            {"outlet_code": "SVERDLOV", "platform": "2gis", "rating": 4.4, "review_cnt": 80},
            {"outlet_code": "SVERDLOV", "platform": "yandex", "rating": 4.7, "review_cnt": 60},
        ],
    }


def offline_body() -> dict:
    return {
        "off_rev": 12345.67,
        "off_ord": 42,
        "off_ret_n": 3,
        "off_ret_sum": 150.0,
    }


def _with_today(fn):
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        return fn()
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)


def test_offline_happy_put_get(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )

    def run() -> None:
        p = offline_body()
        pr = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD",
            json=p,
        )
        assert pr.status_code == 200
        gr = client.get(f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD")
        assert gr.status_code == 200
        b = gr.json()
        assert b["week_start"] == WEEK.isoformat()
        assert b["outlet_code"] == "NOVOGRAD"
        assert b["off_rev"] == pytest.approx(12345.67)
        assert b["off_ord"] == 42
        assert b["off_ret_n"] == 3
        assert b["off_ret_sum"] == 150.0

    _with_today(run)


def test_offline_403_marketer_and_owner(client: TestClient) -> None:
    def try_put(login: str, pwd: str) -> None:
        client.post("/api/auth/login", json={"login": login, "password": pwd})
        r = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD",
            json=offline_body(),
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Недостаточно прав"

    def run() -> None:
        try_put("marketing", "marketing_password")
        client.cookies.clear()
        try_put("admin", "admin_password")

    _with_today(run)


def test_offline_403_ozon_virtual(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )

    def run() -> None:
        r = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/OZON",
            json=offline_body(),
        )
        assert r.status_code == 403

    _with_today(run)


def test_offline_403_no_outlet_link(client: TestClient, lonely_mgr_seeded: None) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "lonely_mgr", "password": "lonely_pass_12"},
    )

    def run() -> None:
        r = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD",
            json=offline_body(),
        )
        assert r.status_code == 403

    _with_today(run)


def test_offline_404_week_not_selectable(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )

    def run() -> None:
        r = client.put(
            "/api/submissions/offline/2026-01-05/NOVOGRAD",
            json=offline_body(),
        )
        assert r.status_code == 404
        assert r.json()["detail"] == "Неделя недоступна для ввода"

    _with_today(run)


def test_offline_422_negative_and_missing(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )

    def run() -> None:
        r = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD",
            json={"off_rev": -1, "off_ord": 1, "off_ret_n": 0, "off_ret_sum": 0},
        )
        assert r.status_code == 422
        r2 = client.put(
            f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD",
            json={"off_rev": 1, "off_ord": 1, "off_ret_n": 0},
        )
        assert r2.status_code == 422

    _with_today(run)


def test_offline_idempotent_single_row(client: TestClient, engine) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )

    def run() -> None:
        url = f"/api/submissions/offline/{WEEK.isoformat()}/SVERDLOV"
        assert client.put(url, json=offline_body()).status_code == 200
        assert client.put(url, json=offline_body()).status_code == 200
        with Session(engine) as s:
            wid = s.scalar(select(ReportingWeek.id).where(ReportingWeek.week_start_date == WEEK))
            oid = s.scalar(select(Outlet.id).where(Outlet.code == "SVERDLOV"))
            n = s.scalar(
                select(func.count())
                .select_from(WeeklyOfflineMetric)
                .where(
                    WeeklyOfflineMetric.week_id == wid,
                    WeeklyOfflineMetric.outlet_id == oid,
                ),
            )
        assert n == 1

    _with_today(run)


def test_marketing_happy_put_get_and_counts(client: TestClient, engine) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    snap = WEEK + timedelta(days=1)

    def run() -> None:
        pr = client.put(f"/api/submissions/marketing/{WEEK.isoformat()}", json=marketing_core_body(WEEK))
        assert pr.status_code == 200
        pr2 = client.put("/api/submissions/reputation", json=reputation_put_body(snap))
        assert pr2.status_code == 200
        gr = client.get(f"/api/submissions/marketing/{WEEK.isoformat()}")
        assert gr.status_code == 200
        assert gr.json()["week_start"] == WEEK.isoformat()
        assert gr.json()["reputation"]["snapshot_date"] == snap.isoformat()
        with Session(engine) as s:
            wid = s.scalar(select(ReportingWeek.id).where(ReportingWeek.week_start_date == WEEK))
            assert s.scalar(select(func.count()).select_from(WeeklyMarketingSite).where(WeeklyMarketingSite.week_id == wid)) == 1
            assert s.scalar(select(func.count()).select_from(WeeklyWebChannel).where(WeeklyWebChannel.week_id == wid)) == 3
            oz_id = s.scalar(select(Outlet.id).where(Outlet.code == "OZON"))
            assert (
                s.scalar(
                    select(func.count())
                    .select_from(WeeklyOzon)
                    .where(WeeklyOzon.week_id == wid, WeeklyOzon.outlet_id == oz_id),
                )
                == 1
            )
            nov_id = s.scalar(select(Outlet.id).where(Outlet.code == "NOVOGRAD"))
            sver_id = s.scalar(select(Outlet.id).where(Outlet.code == "SVERDLOV"))
            n_rep = s.scalar(
                select(func.count())
                .select_from(ReputationSnapshot)
                .where(
                    ReputationSnapshot.outlet_id.in_([nov_id, sver_id]),
                    ReputationSnapshot.snapshot_date >= WEEK,
                    ReputationSnapshot.snapshot_date <= WEEK + timedelta(days=6),
                ),
            )
        assert n_rep == 4

    _with_today(run)


def test_marketing_403_site_manager_and_owner(client: TestClient) -> None:
    def run() -> None:
        client.post(
            "/api/auth/login",
            json={"login": "manager", "password": "manager_password"},
        )
        r = client.put(
            f"/api/submissions/marketing/{WEEK.isoformat()}",
            json=marketing_core_body(WEEK),
        )
        assert r.status_code == 403
        client.cookies.clear()
        client.post(
            "/api/auth/login",
            json={"login": "admin", "password": "admin_password"},
        )
        r2 = client.put(
            f"/api/submissions/marketing/{WEEK.isoformat()}",
            json=marketing_core_body(WEEK),
        )
        assert r2.status_code == 403

    _with_today(run)


def test_marketing_422_channel_bounce_snapshot_cells(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )

    def run() -> None:
        b = marketing_core_body(WEEK)
        b["web_channels"] = [
            {"channel": "organic", "visitors": 1},
            {"channel": "cpc_direct", "visitors": 1},
            {"channel": "social", "visitors": 1},
        ]
        assert client.put(f"/api/submissions/marketing/{WEEK.isoformat()}", json=b).status_code == 422

        b2 = marketing_core_body(WEEK)
        b2["web_behavior"]["web_beh_bounce"] = 100.1
        assert client.put(f"/api/submissions/marketing/{WEEK.isoformat()}", json=b2).status_code == 422

        rep = reputation_put_body(WEEK)
        rep["cells"] = rep["cells"][:2]
        assert client.put("/api/submissions/reputation", json=rep).status_code == 422

    _with_today(run)


def test_marketing_reputation_replace_snapshot_dates(client: TestClient, engine) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    d1 = WEEK + timedelta(days=2)
    d2 = WEEK + timedelta(days=4)

    def run() -> None:
        assert client.put("/api/submissions/reputation", json=reputation_put_body(d1)).status_code == 200
        assert client.put("/api/submissions/reputation", json=reputation_put_body(d2)).status_code == 200
        with Session(engine) as s:
            nov_id = s.scalar(select(Outlet.id).where(Outlet.code == "NOVOGRAD"))
            rows = s.scalars(
                select(ReputationSnapshot).where(
                    ReputationSnapshot.outlet_id == nov_id,
                    ReputationSnapshot.platform == "2gis",
                    ReputationSnapshot.snapshot_date >= WEEK,
                    ReputationSnapshot.snapshot_date <= WEEK + timedelta(days=6),
                ),
            ).all()
        assert len(rows) == 1
        assert rows[0].snapshot_date == d2

    _with_today(run)


def test_marketing_put_preserves_reputation(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    snap = WEEK + timedelta(days=1)

    def run() -> None:
        assert client.put("/api/submissions/reputation", json=reputation_put_body(snap)).status_code == 200
        assert (
            client.put(f"/api/submissions/marketing/{WEEK.isoformat()}", json=marketing_core_body(WEEK)).status_code
            == 200
        )
        gr = client.get(f"/api/submissions/marketing/{WEEK.isoformat()}")
        assert gr.status_code == 200
        assert gr.json()["reputation"]["snapshot_date"] == snap.isoformat()

    _with_today(run)


def test_reputation_get_404_not_selectable_week(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )

    def run() -> None:
        r = client.get("/api/submissions/reputation/2026-01-01")
        assert r.status_code == 404
        assert r.json()["detail"] == "Неделя недоступна для ввода"

    _with_today(run)


def test_submissions_401_without_cookie() -> None:
    c = TestClient(app)
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        base_o = f"/api/submissions/offline/{WEEK.isoformat()}/NOVOGRAD"
        base_m = f"/api/submissions/marketing/{WEEK.isoformat()}"
        assert c.get(base_o).status_code == 401
        assert c.put(base_o, json=offline_body()).status_code == 401
        assert c.get(base_m).status_code == 401
        assert c.put(base_m, json=marketing_core_body(WEEK)).status_code == 401
        assert c.get(f"/api/submissions/reputation/{WEEK.isoformat()}").status_code == 401
        assert c.put("/api/submissions/reputation", json=reputation_put_body(WEEK)).status_code == 401
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)


def test_offline_422_not_monday(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )
    bad = WEEK + timedelta(days=1)
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        r = client.put(
            f"/api/submissions/offline/{bad.isoformat()}/NOVOGRAD",
            json=offline_body(),
        )
        assert r.status_code == 422
        assert r.json()["detail"] == "Некорректная дата начала недели"
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)


LAZY_WEEK_START = date(2026, 3, 23)
TODAY_AFTER_SEED = date(2026, 4, 1)


def test_marketing_get_creates_reporting_week_when_missing(client: TestClient, engine) -> None:
    """Неделя в окне selectable, но без строки в reporting_weeks (даты после конца сида) — создаётся при GET."""
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TODAY_AFTER_SEED
    try:
        r = client.get(f"/api/submissions/marketing/{LAZY_WEEK_START.isoformat()}")
        assert r.status_code == 200
        assert r.json()["week_start"] == LAZY_WEEK_START.isoformat()
        with Session(engine) as s:
            wid = s.scalar(
                select(ReportingWeek.id).where(ReportingWeek.week_start_date == LAZY_WEEK_START),
            )
            assert wid is not None
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)
