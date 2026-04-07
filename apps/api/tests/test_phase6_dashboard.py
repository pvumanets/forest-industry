"""Фаза 6: dashboard summary и reports series."""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.dashboard_comparison import kpi_comparison
from gp_api.dashboard_periods import month_bounds, quarter_bounds
from gp_api.dashboard_service import maps_last_in_range, maps_summary_from_best
from gp_api.db.sync import get_engine
from gp_api.deps import get_today_yekaterinburg
from gp_api.main import app
from gp_api.models.tables import Outlet
from gp_api.seed.data import CHANNEL_KEYS, REPUTATION_BY_WEEK, WEEK_STARTS, channel_visitors

API_ROOT = Path(__file__).resolve().parents[1]

TDAY = date(2026, 3, 31)
ANCHOR_WEEK = date(2026, 2, 23)


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


@pytest.fixture(autouse=True)
def _clear_cookies(client: TestClient) -> None:
    client.cookies.clear()
    yield


def _login_owner(c: TestClient) -> None:
    c.post("/api/auth/login", json={"login": "admin", "password": "admin_password"})


def _with_today(fn):
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        return fn()
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)


def test_kpi_comparison_percent() -> None:
    assert kpi_comparison(110.0, 100.0) == {"kind": "percent", "value": 10.0}


def test_kpi_comparison_none() -> None:
    assert kpi_comparison(0.0, 0.0) == {"kind": "none"}
    assert kpi_comparison(None, 1.0) == {"kind": "none"}


def test_kpi_comparison_new_from_zero() -> None:
    assert kpi_comparison(5.0, 0.0) == {"kind": "new_from_zero"}


def test_quarter_bounds_q1() -> None:
    a, b = quarter_bounds(date(2026, 2, 10))
    assert a == date(2026, 1, 1)
    assert b == date(2026, 3, 31)


def test_phase6_403_site_manager(client: TestClient) -> None:
    client.post("/api/auth/login", json={"login": "manager", "password": "manager_password"})

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "week", "anchor": ANCHOR_WEEK.isoformat()},
        )
        assert r.status_code == 403
        r2 = client.get(
            "/api/reports/site/series",
            params={"from": "2026-01-05", "to": "2026-02-23"},
        )
        assert r2.status_code == 403

    _with_today(run)


def test_phase6_401(client: TestClient) -> None:
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        assert (
            client.get(
                "/api/dashboard/summary",
                params={"period": "week", "anchor": ANCHOR_WEEK.isoformat()},
            ).status_code
            == 401
        )
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)


def test_phase6_summary_week_web_trf_matches_seed(client: TestClient) -> None:
    _login_owner(client)
    wi = WEEK_STARTS.index(ANCHOR_WEEK)
    expect_trf = sum(channel_visitors(wi, k) for k in CHANNEL_KEYS)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "week", "anchor": ANCHOR_WEEK.isoformat()},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["period"] == "week"
        assert body["anchor"] == ANCHOR_WEEK.isoformat()
        site = body["blocks"]["site"]["kpis"]
        trf = next(x for x in site if x["id"] == "WEB-TRF-TOT")
        assert trf["current"] == float(expect_trf)
        assert "comparison" in trf
        assert "outlets" in body["blocks"]
        assert "maps_2gis" in body["blocks"]
        assert "returns" in body["blocks"]

    _with_today(run)


def test_phase6_summary_month_january_trf(client: TestClient) -> None:
    _login_owner(client)
    jan_mondays = [d for d in WEEK_STARTS if date(2026, 1, 1) <= d <= date(2026, 1, 31)]
    expect = 0.0
    for d in jan_mondays:
        wi = WEEK_STARTS.index(d)
        expect += sum(channel_visitors(wi, k) for k in CHANNEL_KEYS)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "month", "anchor": "2026-01-15"},
        )
        assert r.status_code == 200
        trf = next(x for x in r.json()["blocks"]["site"]["kpis"] if x["id"] == "WEB-TRF-TOT")
        assert trf["current"] == float(expect)

    _with_today(run)


def test_phase6_reputation_last_in_month_january(auth_ready: None) -> None:  # noqa: ARG001
    engine = get_engine()
    with Session(engine) as db:
        phys_ids = [
            r.id
            for r in db.scalars(select(Outlet).where(Outlet.is_virtual.is_(False))).all()
        ]
        ms, me = month_bounds(date(2026, 1, 15))
        best = maps_last_in_range(db, phys_ids, ms, me)
        assert len(best) == 4
        for _k, snap in best.items():
            assert snap.snapshot_date == date(2026, 1, 26)
        _, rc = maps_summary_from_best(best)
        wi = WEEK_STARTS.index(date(2026, 1, 26))
        exp_sum = sum(v[1] for v in REPUTATION_BY_WEEK[wi].values())
        assert rc == float(exp_sum)


def test_phase6_series_site_points(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/site/series",
            params={"from": "2026-01-05", "to": "2026-02-23"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["topic"] == "site"
        keys = [s["key"] for s in body["series"]]
        assert "WEB-TRF-TOT" in keys
        assert "WEB-TRF-CH-organic" in keys
        assert "WEB-TRF-CH-cpc_direct" in keys
        assert "WEB-TRF-CH-direct" in keys
        ser = next(s for s in body["series"] if s["key"] == "WEB-TRF-TOT")
        assert len(ser["points"]) == 8

    _with_today(run)


def test_phase6_series_company_der_totals(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/company/series",
            params={"from": "2026-01-05", "to": "2026-02-23"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["topic"] == "company"
        keys = [s["key"] for s in body["series"]]
        assert "DER-REV-TOT" in keys
        assert "DER-ORD-TOT" in keys

    _with_today(run)


def test_phase6_series_company_filtered_outlet(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/company/series",
            params={"from": "2026-01-05", "to": "2026-02-23", "outlet_code": "NOVOGRAD"},
        )
        assert r.status_code == 200
        keys = [s["key"] for s in r.json()["series"]]
        assert "OFF-REV-NOVOGRAD" in keys
        assert "OFF-ORD-NOVOGRAD" in keys
        assert "DER-REV-TOT" not in keys

    _with_today(run)


def test_phase6_series_marketing(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/marketing/series",
            params={"from": "2026-01-05", "to": "2026-02-23"},
        )
        assert r.status_code == 200
        keys = [s["key"] for s in r.json()["series"]]
        assert "MKT-AD-CTX" in keys
        assert "MKT-AD-MAP" in keys

    _with_today(run)


def test_phase6_series_returns_der_totals(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/returns/series",
            params={"from": "2026-01-05", "to": "2026-02-23"},
        )
        assert r.status_code == 200
        keys = [s["key"] for s in r.json()["series"]]
        assert "DER-RET-SUM-TOT" in keys
        assert "DER-RET-N-TOT" in keys

    _with_today(run)


def test_phase6_series_maps_filter_outlet(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/maps-2gis/series",
            params={"from": "2026-01-01", "to": "2026-03-31", "outlet_code": "NOVOGRAD"},
        )
        assert r.status_code == 200
        keys = [s["key"] for s in r.json()["series"]]
        assert "REP-RATING-NOVOGRAD" in keys
        assert "REP-REV-CNT-NOVOGRAD" in keys
        assert not any("SVERDLOV" in k for k in keys)

    _with_today(run)


def test_phase6_422_week_not_monday_and_from_gt_to(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "week", "anchor": "2026-02-24"},
        )
        assert r.status_code == 422
        r2 = client.get(
            "/api/reports/ozon/series",
            params={"from": "2026-02-10", "to": "2026-02-01"},
        )
        assert r2.status_code == 422

    _with_today(run)


def test_phase6_422_bad_topic(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/reports/unknown/series",
            params={"from": "2026-01-05", "to": "2026-01-26"},
        )
        assert r.status_code == 422

    _with_today(run)


def test_phase6_summary_rolling_4w(client: TestClient) -> None:
    """Rolling 4w: структура ответа, DER-REV-TOT включает Ozon, secondary у KPI."""
    _login_owner(client)

    def run() -> None:
        r = client.get("/api/dashboard/summary", params={"period": "rolling_4w"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["period"] == "rolling_4w"
        assert "week_starts" in body
        assert len(body["week_starts"]) == 4
        assert body.get("outlet_code") == "ALL"
        assert "updated_at_max" in body
        der = next(x for x in body["blocks"]["outlets"]["kpis"] if x["id"] == "DER-REV-TOT")
        assert der["current"] is not None
        assert "comparison" in der
        assert "secondary_comparison" in der
        assert "secondary_previous" in der

    _with_today(run)


def test_phase6_summary_rolling_4w_anchor_param(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "rolling_4w", "anchor": "2026-03-23"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["anchor"] == "2026-03-23"

    _with_today(run)


def test_phase6_summary_rolling_4w_outlet_code_novograd(client: TestClient) -> None:
    """Rolling + outlet_code: раньше 500 из‑за перепутанных week_id / дат в агрегаторах."""
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "rolling_4w", "outlet_code": "NOVOGRAD"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("outlet_code") == "NOVOGRAD"
        ids = {k["id"] for k in body["blocks"]["outlets"]["kpis"]}
        assert "OFF-REV-SUM" in ids

    _with_today(run)


def test_phase6_summary_outlet_code_422(client: TestClient) -> None:
    _login_owner(client)

    def run() -> None:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "week", "anchor": ANCHOR_WEEK.isoformat(), "outlet_code": "UNKNOWN"},
        )
        assert r.status_code == 422

    _with_today(run)


def test_phase6_future_anchor_422(client: TestClient) -> None:
    _login_owner(client)
    app.dependency_overrides[get_today_yekaterinburg] = lambda: TDAY
    try:
        r = client.get(
            "/api/dashboard/summary",
            params={"period": "week", "anchor": "2026-12-01"},
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)
