"""Порядок тестов в файле важен: сначала roundtrip миграций, затем сид."""

from __future__ import annotations

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from gp_api.db.sync import get_database_url
from gp_api.seed.cli import run_seed


def _alembic_config(ini: Path) -> Config:
    return Config(str(ini))


def test_alembic_downgrade_upgrade_roundtrip(alembic_ini: Path, postgres_url: str) -> None:  # noqa: ARG001
    cfg = _alembic_config(alembic_ini)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


def test_seed_counts_and_idempotent(alembic_ini: Path, postgres_url: str, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: ARG001
    monkeypatch.setenv("ALLOW_INSECURE_SEED_DEFAULTS", "1")
    cfg = _alembic_config(alembic_ini)
    command.upgrade(cfg, "head")

    run_seed()

    engine = create_engine(get_database_url(), pool_pre_ping=True)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM reporting_weeks")).scalar_one() == 104
        assert conn.execute(text("SELECT count(*) FROM weekly_offline_metrics")).scalar_one() == 208
        assert conn.execute(text("SELECT count(*) FROM weekly_web_channels")).scalar_one() == 312
        assert conn.execute(text("SELECT count(*) FROM weekly_ozon")).scalar_one() == 104
        assert conn.execute(text("SELECT count(*) FROM reputation_snapshots")).scalar_one() == 416

    run_seed()

    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM reporting_weeks")).scalar_one() == 104
        assert conn.execute(text("SELECT count(*) FROM weekly_offline_metrics")).scalar_one() == 208
        assert conn.execute(text("SELECT count(*) FROM weekly_web_channels")).scalar_one() == 312
        assert conn.execute(text("SELECT count(*) FROM weekly_ozon")).scalar_one() == 104
        assert conn.execute(text("SELECT count(*) FROM reputation_snapshots")).scalar_one() == 416
