"""Фаза 4: недели и точки (после phase3 по имени)."""

from __future__ import annotations

import os
from datetime import date
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from gp_api.deps import get_today_yekaterinburg
from gp_api.main import app
from gp_api.selectable_weeks import (
    format_week_label,
    is_week_selectable,
    last_completed_sunday,
    selectable_week_starts,
)

API_ROOT = Path(__file__).resolve().parents[1]


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


def test_last_completed_sunday_tuesday_march_31() -> None:
    assert last_completed_sunday(date(2026, 3, 31)) == date(2026, 3, 29)


def test_selectable_march_31_three_weeks_descending() -> None:
    today = date(2026, 3, 31)
    weeks = selectable_week_starts(today)
    assert len(weeks) == 3
    assert (weeks[0] - weeks[1]).days == 7
    assert (weeks[1] - weeks[2]).days == 7
    assert weeks[0] == date(2026, 3, 23)
    assert weeks[1] == date(2026, 3, 16)
    assert weeks[2] == date(2026, 3, 9)
    assert format_week_label(weeks[0]) == "Пн 23.03.2026 — Вс 29.03.2026"


def test_selectable_monday_today_first_week_start() -> None:
    assert selectable_week_starts(date(2026, 3, 30))[0] == date(2026, 3, 23)


def test_selectable_sunday_today_current_week_excluded() -> None:
    w0 = selectable_week_starts(date(2026, 3, 29))[0]
    assert w0 == date(2026, 3, 16)
    assert w0 != date(2026, 3, 23)


def test_is_week_selectable_matches_selectable_list() -> None:
    today = date(2026, 2, 24)
    weeks = selectable_week_starts(today)
    for ws in weeks:
        assert is_week_selectable(ws, today) is True
    assert is_week_selectable(date(2026, 2, 2), today) is True
    assert is_week_selectable(date(2026, 1, 5), today) is False


def test_weeks_selectable_no_cookie() -> None:
    c = TestClient(app)
    assert c.get("/api/weeks/selectable").status_code == 401


def test_outlets_no_cookie() -> None:
    c = TestClient(app)
    assert c.get("/api/outlets").status_code == 401


def test_weeks_selectable_with_override(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    app.dependency_overrides[get_today_yekaterinburg] = lambda: date(2026, 3, 31)
    try:
        r = client.get("/api/weeks/selectable")
    finally:
        app.dependency_overrides.pop(get_today_yekaterinburg, None)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    assert [x["week_start"] for x in data] == ["2026-03-23", "2026-03-16", "2026-03-09"]
    assert data[0]["label"] == "Пн 23.03.2026 — Вс 29.03.2026"


def test_outlets_marketer_two_physical_no_ozon(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    r = client.get("/api/outlets")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    codes = [o["code"] for o in body]
    assert set(codes) == {"NOVOGRAD", "SVERDLOV"}
    assert all(o["is_virtual"] is False for o in body)


def test_outlets_manager_sort_order(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )
    r = client.get("/api/outlets")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert [o["code"] for o in body] == ["NOVOGRAD", "SVERDLOV"]
