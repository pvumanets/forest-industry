from __future__ import annotations

import os
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def postgres_url() -> str:
    url = os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("Нет DATABASE_URL / DATABASE_URL_SYNC — пропуск интеграционных тестов БД")
    if "asyncpg" in url:
        pytest.skip("Интеграционные тесты ожидают sync-драйвер (postgresql+psycopg://)")
    return url


@pytest.fixture(scope="module")
def alembic_ini(postgres_url: str) -> Path:  # noqa: ARG001
    return API_ROOT / "alembic.ini"
