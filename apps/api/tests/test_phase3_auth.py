"""Фаза 3: аутентификация (после test_phase2_db по имени файла)."""

from __future__ import annotations

import os
from http.cookies import SimpleCookie
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from gp_api.auth_tokens import sha256_hex

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
    from gp_api.main import app

    return TestClient(app)


@pytest.fixture(scope="module")
def engine(auth_ready: None):
    from gp_api.db.sync import get_engine

    return get_engine()


@pytest.fixture(autouse=True)
def _clear_cookies(client: TestClient) -> None:
    client.cookies.clear()
    yield


def test_login_ok_sets_cookie_and_db_hash(client: TestClient, engine) -> None:
    r = client.post(
        "/api/auth/login",
        json={"login": "admin", "password": "admin_password"},
    )
    assert r.status_code == 200
    assert "gp_session=" in r.headers.get("set-cookie", "")
    data = r.json()
    assert data["user"]["login"] == "admin"
    assert "password" not in r.text
    c = SimpleCookie()
    c.load(r.headers["set-cookie"])
    raw = c["gp_session"].value
    expect = sha256_hex(raw)
    with engine.connect() as conn:
        got = conn.execute(
            text("SELECT token_hash FROM user_sessions ORDER BY created_at DESC LIMIT 1"),
        ).scalar_one()
    assert got == expect


def test_login_fail_unauthorized(client: TestClient) -> None:
    r = client.post(
        "/api/auth/login",
        json={"login": "admin", "password": "wrong_password"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Неверный логин или пароль"
    sc = r.headers.get("set-cookie") or ""
    assert "gp_session=" not in sc


def test_login_validation_messages(client: TestClient) -> None:
    r = client.post("/api/auth/login", json={"login": "", "password": "x"})
    assert r.status_code == 422
    r2 = client.post("/api/auth/login", json={"login": "admin", "password": ""})
    assert r2.status_code == 422


def test_me_ok_after_login(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "marketing", "password": "marketing_password"},
    )
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["login"] == "marketing"
    assert body["outlets"] == []


def test_me_manager_two_outlets(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "manager", "password": "manager_password"},
    )
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert len(r.json()["outlets"]) == 2
    codes = {o["code"] for o in r.json()["outlets"]}
    assert codes == {"NOVOGRAD", "SVERDLOV"}


def test_me_without_cookie(client: TestClient) -> None:
    c = TestClient(client.app)
    r = c.get("/api/auth/me")
    assert r.status_code == 401
    assert r.json()["detail"] == "Требуется вход"


def test_logout_then_me_unauthorized(client: TestClient) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "admin", "password": "admin_password"},
    )
    r_out = client.post("/api/auth/logout")
    assert r_out.status_code == 204
    r_me = client.get("/api/auth/me")
    assert r_me.status_code == 401


def test_expired_session_me_unauthorized(client: TestClient, engine) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "pavel", "password": "pav_password"},
    )
    with engine.begin() as conn:
        conn.execute(text("UPDATE user_sessions SET expires_at = NOW() - INTERVAL '1 day'"))
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_sliding_extends_expires_at(client: TestClient, engine) -> None:
    client.post(
        "/api/auth/login",
        json={"login": "evgeniy", "password": "ev_password"},
    )
    with engine.connect() as conn:
        uid = conn.execute(text("SELECT id FROM users WHERE login = 'evgeniy'")).scalar_one()
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE user_sessions SET expires_at = NOW() + INTERVAL '1 hour' "
                "WHERE user_id = :uid",
            ),
            {"uid": uid},
        )
    with engine.connect() as conn:
        before = conn.execute(
            text(
                "SELECT expires_at FROM user_sessions WHERE user_id = :uid "
                "ORDER BY created_at DESC LIMIT 1",
            ),
            {"uid": uid},
        ).scalar_one()
    client.get("/api/auth/me")
    with engine.connect() as conn:
        after = conn.execute(
            text(
                "SELECT expires_at FROM user_sessions WHERE user_id = :uid "
                "ORDER BY created_at DESC LIMIT 1",
            ),
            {"uid": uid},
        ).scalar_one()
    assert after > before


def test_settings_cookie_secure(monkeypatch: pytest.MonkeyPatch) -> None:
    from gp_api.config import get_settings

    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("COOKIE_SECURE", raising=False)
    get_settings.cache_clear()
    assert get_settings().cookie_secure() is False
    monkeypatch.setenv("COOKIE_SECURE", "true")
    get_settings.cache_clear()
    assert get_settings().cookie_secure() is True
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("COOKIE_SECURE", raising=False)
    get_settings.cache_clear()
    assert get_settings().cookie_secure() is True
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("COOKIE_SECURE", raising=False)
    get_settings.cache_clear()
